'use strict';

module.exports = ({ strapi }) => ({
  async process(ctx, resource, context) {
    const rules = {
      ...(resource.requestRules || {}),
      ...(resource.requestMutation || {})
    };

    // Build a rich token context so requestRules can reference $query.*, $params.*, $body.*, $user.*, etc.
    const tokenCtx = {
      ...context,
      query: ctx.query || {},
      params: ctx.params || {},
      body: ctx.request?.body?.data || ctx.request?.body || {},
    };

    // Apply static filters — values are deep-resolved so $query.q etc. are substituted
    if (rules.filters && typeof rules.filters === 'object') {
      ctx.query = ctx.query || {};
      ctx.query.filters = this.mergeDeep(
        ctx.query.filters || {},
        this.resolveDeep(rules.filters, tokenCtx)
      );
    }
    
    // Apply dynamic filters
    if (Array.isArray(rules.dynamicFilters)) {
      ctx.query = ctx.query || {};
      ctx.query.filters = ctx.query.filters || {};

      for (const rule of rules.dynamicFilters) {
        if (!rule?.path) continue;
        const value = this.resolveToken(rule.value, tokenCtx);
        if (value === undefined) continue;
        
        const keys = String(rule.path).split('.');
        let ptr = ctx.query.filters;
        for (let i = 0; i < keys.length - 1; i++) {
          ptr[keys[i]] = ptr[keys[i]] || {};
          ptr = ptr[keys[i]];
        }
        ptr[keys[keys.length - 1]] = { $eq: value };
      }
    }
    
    // Strip body fields
    if (Array.isArray(rules.stripBodyFields) && ctx.request?.body) {
      for (const field of rules.stripBodyFields) {
        delete ctx.request.body[field];
        if (ctx.request.body.data && typeof ctx.request.body.data === 'object') {
          delete ctx.request.body.data[field];
        }
      }
    }

    // Allowed body fields — whitelist for POST/PUT/PATCH; keys not in the list are stripped
    if (Array.isArray(rules.allowedBodyFields) && rules.allowedBodyFields.length > 0 && ctx.request?.body) {
      const allowed = new Set(rules.allowedBodyFields.map(String));
      // Strapi v5 wraps body in { data: {...} }
      if (ctx.request.body.data && typeof ctx.request.body.data === 'object') {
        for (const key of Object.keys(ctx.request.body.data)) {
          if (!allowed.has(key)) delete ctx.request.body.data[key];
        }
      } else {
        for (const key of Object.keys(ctx.request.body)) {
          if (!allowed.has(key)) delete ctx.request.body[key];
        }
      }
    }
    
    // Inject server-defined populate when client sent none
    // Only injects if requestRules.injectPopulate is set AND the client didn't send any populate.
    if (rules.injectPopulate && typeof rules.injectPopulate === 'object' && !ctx.query?.populate) {
      ctx.query = ctx.query || {};
      ctx.query.populate = rules.injectPopulate;
    }

    // Force body fields
    if (rules.forceBodyFields && typeof rules.forceBodyFields === 'object') {
      ctx.request.body = ctx.request.body || {};
      for (const [key, value] of Object.entries(rules.forceBodyFields)) {
        const resolved = typeof value === 'string' ? this.resolveToken(value, tokenCtx) : value;
        if (resolved !== undefined) {
          ctx.request.body[key] = resolved;
        }
      }
    }
    
    // Restrict populate
    if (rules.populate === false && ctx.query?.populate) {
      delete ctx.query.populate;
    }
    
    if (Array.isArray(rules.allowedPopulate) && ctx.query?.populate) {
      if (Array.isArray(ctx.query.populate)) {
        ctx.query.populate = ctx.query.populate.filter(p => rules.allowedPopulate.includes(p));
      } else if (typeof ctx.query.populate === 'object') {
        const nextPopulate = {};
        for (const key of Object.keys(ctx.query.populate)) {
          if (rules.allowedPopulate.includes(key)) {
            nextPopulate[key] = ctx.query.populate[key];
          }
        }
        ctx.query.populate = nextPopulate;
      }
    }

    if (Array.isArray(rules.allowedFields) && rules.allowedFields.length > 0) {
      ctx.query = ctx.query || {};

      const allowedFieldSet = new Set([
        ...rules.allowedFields.map(field => String(field)),
        'id',
        'documentId'
      ]);

      const allowedPopulateRoots = new Set(
        rules.allowedFields
          .map(field => String(field).split('.')[0])
          .filter(Boolean)
      );

      const requestedFields = this.normalizeListParam(ctx.query.fields);
      if (requestedFields.length > 0) {
        const nextFields = requestedFields.filter(field => allowedFieldSet.has(field));
        ctx.query.fields = nextFields.length > 0 ? nextFields : ['id', 'documentId'];
      } else {
        ctx.query.fields = Array.from(allowedFieldSet);
      }

      if (ctx.query.populate) {
        if (ctx.query.populate === '*') {
          const fullPopulate = Array.from(allowedPopulateRoots);
          if (fullPopulate.length > 0) {
            ctx.query.populate = fullPopulate;
          } else {
            delete ctx.query.populate;
          }
        } else if (Array.isArray(ctx.query.populate)) {
          ctx.query.populate = ctx.query.populate.filter(pop => allowedPopulateRoots.has(String(pop)));
          if (ctx.query.populate.length === 0) {
            delete ctx.query.populate;
          }
        } else if (typeof ctx.query.populate === 'string') {
          if (!allowedPopulateRoots.has(ctx.query.populate)) {
            delete ctx.query.populate;
          }
        } else if (typeof ctx.query.populate === 'object') {
          const nextPopulate = {};
          for (const key of Object.keys(ctx.query.populate)) {
            if (allowedPopulateRoots.has(key)) {
              nextPopulate[key] = ctx.query.populate[key];
            }
          }
          if (Object.keys(nextPopulate).length > 0) {
            ctx.query.populate = nextPopulate;
          } else {
            delete ctx.query.populate;
          }
        }
      }
    }

    // Block parameters
    if (Array.isArray(rules.blockParams)) {
      for (const param of rules.blockParams) {
        delete ctx.query[param];
        if (ctx.request?.body) delete ctx.request.body[param];
      }
    }

    // Header mutations
    if (rules.forceHeaders && typeof rules.forceHeaders === 'object') {
      for (const [key, value] of Object.entries(rules.forceHeaders)) {
        const resolved = typeof value === 'string' ? this.resolveToken(value, tokenCtx) : value;
        if (resolved !== undefined) {
          ctx.request.headers = ctx.request.headers || {};
          ctx.request.headers[String(key).toLowerCase()] = resolved;
        }
      }
    }

    if (Array.isArray(rules.stripHeaders) && ctx.request?.headers) {
      for (const header of rules.stripHeaders) {
        delete ctx.request.headers[String(header).toLowerCase()];
      }
    }

    return ctx;
  },
  
  resolveToken(value, context) {
    if (typeof value !== 'string' || !value.startsWith('$')) return value;

    // Special scalar tokens
    if (value === '$today') return new Date().toISOString().split('T')[0];
    if (value === '$now')   return new Date().toISOString();

    const parts = value.slice(1).split('.');
    let result = context;
    for (const part of parts) {
      if (result === undefined || result === null) return undefined;
      result = result[part];
    }

    return result;
  },

  // Recursively walk a plain object/array and resolve any string token values.
  // Used so filter trees like { $or: [{ invoice_no: "$query.q" }] } resolve correctly.
  resolveDeep(value, context) {
    if (Array.isArray(value)) {
      return value.map(v => this.resolveDeep(v, context));
    }
    if (value !== null && typeof value === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(value)) {
        out[k] = this.resolveDeep(v, context);
      }
      return out;
    }
    if (typeof value === 'string' && value.startsWith('$')) {
      return this.resolveToken(value, context);
    }
    return value;
  },

  // Simple deep merge (right wins on scalar, arrays replaced, objects merged).
  mergeDeep(target, source) {
    if (typeof source !== 'object' || source === null) return source;
    const out = { ...target };
    for (const [k, v] of Object.entries(source)) {
      if (Array.isArray(v)) {
        out[k] = v;
      } else if (v !== null && typeof v === 'object' && typeof out[k] === 'object' && !Array.isArray(out[k])) {
        out[k] = this.mergeDeep(out[k], v);
      } else {
        out[k] = v;
      }
    }
    return out;
  },

  normalizeListParam(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(v => String(v));
    if (typeof value === 'string') return [value];

    if (typeof value === 'object') {
      return Object.values(value)
        .map(v => String(v))
        .filter(Boolean);
    }

    return [];
  }
});
