'use strict';

export default async ({ strapi }) => {
  // Register global middleware
  strapi.server.use(async (ctx, next) => {
    const guard = strapi.service('plugin::api-guard-pro.interceptor');
    if (guard) {
      await guard.intercept(ctx, next);
    } else {
      await next();
    }
  });

  // Sync default configurations
  await strapi.service('plugin::api-guard-pro.setup').syncDefaults();

  strapi.log.info('[api-guard-pro] Bootstrap completed');
};
