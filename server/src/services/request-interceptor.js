'use strict';

const pathToRegex = (pattern = '') => {
  const escaped = String(pattern)
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\:[^/]+/g, '[^/]+');
  return new RegExp(`^${escaped}$`);
};

const resolveToken = (value, context) => {
  if (typeof value !== 'string' || !value.startsWith('$')) return value;
  
  const parts = value.slice(1).split('.');
  let result = context;
  for (const part of parts) {
    if (result === undefined || result === null) return undefined;
    result = result[part];
  }
  return result;
};

module.exports = ({ strapi }) => ({
  async intercept(ctx, next) {
    const method = ctx.method;
    const originalPath = ctx.path || ctx.url || '';
    const path = originalPath.split('?')[0];
    
    // Find matching resource
    const resources = await strapi.db.query('plugin::api-guard-pro.resource').findMany({
      where: { isActive: true },
      populate: { domain: true }
    });
    
    let matchedResource = null;
    
    for (const resource of resources) {
      if (String(resource.method).toUpperCase() !== String(method).toUpperCase()) continue;
      if (!resource.pathPattern) continue;
      
      const regex = pathToRegex(resource.pathPattern);
      if (regex.test(path)) {
        matchedResource = resource;
        break;
      }
    }
    
    // Also check alias paths
    if (!matchedResource) {
      for (const resource of resources) {
        if (String(resource.method).toUpperCase() !== String(method).toUpperCase()) continue;
        if (!resource.aliasPath) continue;
        
        const regex = pathToRegex(resource.aliasPath);
        if (regex.test(path)) {
          matchedResource = resource;
          break;
        }
      }
    }
    
    if (!matchedResource) {
      const config = strapi.config.get('plugin::api-guard-pro');
      if (config.denyByDefault) {
        return ctx.forbidden('No matching permission resource');
      }
      return next();
    }
    
    // Resolve context
    const contextResolver = strapi.service('plugin::api-guard-pro.context-resolver');
    const context = await contextResolver.resolve(ctx);
    
    // Check permission
    const permissionEngine = strapi.service('plugin::api-guard-pro.permission-engine');
    const allowed = await permissionEngine.can({
      user: context.user,
      action: method,
      resourceUid: matchedResource.contentTypeUid,
      context
    });
    
    if (!allowed) {
      if (!context.user) return ctx.unauthorized('Authentication required');
      return ctx.forbidden('Access denied');
    }
    
    // Apply domain filtering for non-public resources
    if (!matchedResource.isPublic && context.domain) {
      const userRoleType = context.user?.role?.type || context.user?.role?.name || 'public';
      if (context.domain.strapiRoleType && context.domain.strapiRoleType !== userRoleType) {
        return ctx.forbidden('User role cannot access this domain');
      }
    }
    
    // Apply request rules
    await this.applyRequestRules(ctx, matchedResource, context);
    
    await next();
    
    // Apply response rules
    ctx.body = await this.applyResponseRules(ctx.body, matchedResource);
  },
  
  async applyRequestRules(ctx, resource, context) {
    const rules = resource.requestRules || {};
    
    // Apply static filters
    if (rules.filters && typeof rules.filters === 'object') {
      ctx.query = ctx.query || {};
      ctx.query.filters = {
        ...(ctx.query.filters || {}),
        ...rules.filters
      };
    }
    
    // Apply dynamic filters
    if (Array.isArray(rules.dynamicFilters)) {
      ctx.query = ctx.query || {};
      ctx.query.filters = ctx.query.filters || {};
      
      for (const rule of rules.dynamicFilters) {
        if (!rule?.path) continue;
        const value = resolveToken(rule.value, context);
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
      }
    }
    
    // Force body fields
    if (rules.forceBodyFields && typeof rules.forceBodyFields === 'object') {
      ctx.request.body = ctx.request.body || {};
      for (const [key, value] of Object.entries(rules.forceBodyFields)) {
        const resolved = typeof value === 'string' ? resolveToken(value, context) : value;
        ctx.request.body[key] = resolved;
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
  },
  
  async applyResponseRules(body, resource) {
    if (!body || typeof body !== 'object') return body;
    
    const rules = resource.responseRules || {};
    const responseInterceptor = strapi.service('plugin::api-guard-pro.response-interceptor');
    
    let result = body;
    
    if (Array.isArray(rules.allowedFields) && rules.allowedFields.length > 0) {
      result = responseInterceptor.filterFields(result, rules.allowedFields);
    }
    
    if (Array.isArray(rules.stripFields) && rules.stripFields.length > 0) {
      result = responseInterceptor.stripFields(result, rules.stripFields);
    }
    
    return result;
  }
});
