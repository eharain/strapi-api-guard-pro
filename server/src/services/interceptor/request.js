'use strict';

export default ({ strapi }) => ({
  async process(ctx, resource, context) {
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
      for (const rule of rules.dynamicFilters) {
        const value = this.resolveToken(rule.value, context);
        if (value !== undefined) {
          // Apply filter
          this.applyFilter(ctx, rule.path, value);
        }
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
      for (const [key, tokenValue] of Object.entries(rules.forceBodyFields)) {
        const resolved = typeof tokenValue === 'string' 
          ? this.resolveToken(tokenValue, context)
          : tokenValue;
        ctx.request.body[key] = resolved;
      }
    }

    return ctx;
  },

  resolveToken(value, context) {
    if (typeof value !== 'string' || !value.startsWith('$')) {
      return value;
    }

    const parts = value.slice(1).split('.');
    let result = context;
    for (const part of parts) {
      if (result === undefined || result === null) return undefined;
      result = result[part];
    }
    return result;
  },

  applyFilter(ctx, path, value) {
    const parts = path.split('.');
    let current = ctx.query.filters || (ctx.query.filters = {});

    for (let i = 0; i < parts.length - 1; i++) {
      current[parts[i]] = current[parts[i]] || {};
      current = current[parts[i]];
    }

    current[parts[parts.length - 1]] = { $eq: value };
  }
});
