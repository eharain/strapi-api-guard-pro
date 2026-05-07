'use strict';

/**
 * Legacy passthrough.
 *
 * In the new 4-CT model there is no per-domain routing (resources are keyed
 * by Strapi `contentTypeUid` directly). This middleware is kept as a no-op
 * for backwards compatibility with existing `config/middlewares.js` setups.
 */

module.exports = () => async (ctx, next) => next();
