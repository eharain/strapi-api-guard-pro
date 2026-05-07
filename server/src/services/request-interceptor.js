'use strict';

/**
 * Request interceptor for the api-guard-pro plugin.
 *
 * Inputs from the matched Strapi route:
 *   contentTypeUid  e.g. 'api::product.product'
 *   actionName      e.g. 'product.find'
 *
 * Behaviour:
 *   1. Resolve all matching, active policies whose `grants` intersect the
 *      authenticated user's role keys.
 *   2. If none match → 403 (deny by default).
 *   3. Otherwise merge `policy.query`, `policy.filters`, `policy.body` onto
 *      the Koa ctx, with `$user.*` token resolution against the user.
 *
 * Tokens supported: any path under the user object, e.g. `$user.id`,
 * `$user.branch`, `$user.role.name`.
 */

const TOKEN_PREFIX = '$';

const isObject = (v) => v && typeof v === 'object' && !Array.isArray(v);

const resolveToken = (value, ctx) => {
  if (typeof value !== 'string' || !value.startsWith(TOKEN_PREFIX)) return value;
  const path = value.slice(1).split('.');
  if (path[0] !== 'user') return value;

  let cur = ctx.state?.user;
  for (let i = 1; i < path.length; i += 1) {
    if (cur == null) return undefined;
    cur = cur[path[i]];
  }
  return cur;
};

const deepResolveTokens = (value, ctx) => {
  if (Array.isArray(value)) return value.map((v) => deepResolveTokens(v, ctx));
  if (isObject(value)) {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = deepResolveTokens(v, ctx);
    return out;
  }
  return resolveToken(value, ctx);
};

const mergeFilters = (base, incoming) => {
  if (!isObject(base) || !Object.keys(base).length) return { ...incoming };
  if (!isObject(incoming) || !Object.keys(incoming).length) return { ...base };
  return { $and: [base, incoming] };
};

const mergePopulate = (base, incoming) => {
  if (incoming === '*' || base === '*') return '*';
  if (Array.isArray(base) && Array.isArray(incoming)) {
    return Array.from(new Set([...base, ...incoming]));
  }
  if (isObject(base) && isObject(incoming)) return { ...base, ...incoming };
  return incoming || base;
};

const mergeQuery = (policies, ctx) => {
  const out = {};
  for (const p of policies) {
    const q = deepResolveTokens(p.query || {}, ctx);
    if (!isObject(q)) continue;

    if (q.filters) out.filters = mergeFilters(out.filters || {}, q.filters);
    if (q.populate !== undefined) out.populate = mergePopulate(out.populate, q.populate);
    if (Array.isArray(q.fields)) {
      out.fields = out.fields
        ? Array.from(new Set([...out.fields, ...q.fields]))
        : [...q.fields];
    }
    if (Array.isArray(q.sort) && !out.sort) out.sort = [...q.sort];
    if (isObject(q.pagination) && !out.pagination) out.pagination = { ...q.pagination };
  }
  return out;
};

const mergeWriteFilters = (policies, ctx) => {
  let out = {};
  for (const p of policies) {
    const f = deepResolveTokens(p.filters || {}, ctx);
    if (isObject(f) && Object.keys(f).length) out = mergeFilters(out, f);
  }
  return out;
};

const mergeBody = (policies, ctx) => {
  const out = {};
  for (const p of policies) {
    const b = deepResolveTokens(p.body || {}, ctx);
    if (isObject(b)) Object.assign(out, b);
  }
  return out;
};

module.exports = ({ strapi }) => ({
  /**
   * Apply api-guard-pro permissions to the current Koa context.
   *
   * Should be called from a route/global middleware AFTER the route has been
   * resolved so `contentTypeUid` and `actionName` are known.
   */
  async apply(ctx, { contentTypeUid, actionName } = {}) {
    if (!contentTypeUid || !actionName) return;

    const engine = strapi.service('plugin::api-guard-pro.permission-engine');
    const user = ctx.state?.user;

    const policies = await engine.findMatchingPolicies({
      user,
      contentTypeUid,
      actionName,
    });

    if (!policies.length) {
      if (!user) return ctx.unauthorized('Authentication required');
      return ctx.forbidden('Access denied');
    }

    // Read-side shaping
    const mergedQuery = mergeQuery(policies, ctx);
    if (Object.keys(mergedQuery).length) {
      ctx.query = ctx.query || {};
      if (mergedQuery.filters) {
        ctx.query.filters = ctx.query.filters
          ? mergeFilters(ctx.query.filters, mergedQuery.filters)
          : mergedQuery.filters;
      }
      if (mergedQuery.populate !== undefined) ctx.query.populate = mergedQuery.populate;
      if (mergedQuery.fields) ctx.query.fields = mergedQuery.fields;
      if (mergedQuery.sort) ctx.query.sort = mergedQuery.sort;
      if (mergedQuery.pagination) ctx.query.pagination = mergedQuery.pagination;
    }

    // Write-side scoping
    const writeFilters = mergeWriteFilters(policies, ctx);
    if (Object.keys(writeFilters).length) {
      ctx.query = ctx.query || {};
      ctx.query.filters = ctx.query.filters
        ? mergeFilters(ctx.query.filters, writeFilters)
        : writeFilters;
    }

    // Forced body values
    const forcedBody = mergeBody(policies, ctx);
    if (Object.keys(forcedBody).length) {
      ctx.request = ctx.request || {};
      ctx.request.body = { ...(ctx.request.body || {}), ...forcedBody };
    }

    return policies;
  },
});
