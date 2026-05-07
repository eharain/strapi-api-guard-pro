'use strict';

/**
 * api-guard-pro global middleware.
 *
 * Resolves the matched Strapi route to (contentTypeUid, actionName) and
 * delegates to the request-interceptor service which runs the policy lookup,
 * denial, and ctx mutation.
 *
 * Routes that aren't bound to a Strapi content-type (admin, plugin, custom)
 * are passed through untouched.
 */

const STRAPI_API_PREFIX = 'api::';

const resolveRouteTarget = (ctx) => {
  // Strapi attaches the matched route info on ctx.state.route or ctx.route.
  const route = ctx.state?.route || ctx.route || ctx._matchedRoute;
  if (!route) return null;

  // Two common shapes:
  //   route.handler === 'api::product.product.find'
  //   route.info    === { apiName: 'product', type: 'content-api' }
  const handler = typeof route.handler === 'string' ? route.handler : null;
  if (!handler || !handler.startsWith(STRAPI_API_PREFIX)) return null;

  // 'api::product.product.find'  →  ['api::product', 'product', 'find']
  const parts = handler.split('.');
  if (parts.length < 3) return null;

  const contentTypeUid = `${parts[0]}.${parts[1]}`;          // 'api::product.product'
  const actionName = `${parts[1]}.${parts.slice(2).join('.')}`; // 'product.find'
  return { contentTypeUid, actionName };
};

module.exports = (config, { strapi }) => async (ctx, next) => {
  const target = resolveRouteTarget(ctx);
  if (!target) return next();

  const interceptor = strapi.service('plugin::api-guard-pro.request-interceptor');
  if (!interceptor) return next();

  // apply() either short-circuits (ctx.forbidden / ctx.unauthorized) or
  // mutates ctx in place. If the response is already finalized, skip next().
  await interceptor.apply(ctx, target);
  if (ctx.status && ctx.status >= 400 && ctx.body) return;

  await next();
};
