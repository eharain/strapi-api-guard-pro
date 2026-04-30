'use strict';

export default async ({ strapi }) => {
  try {
    // Register global middleware
    strapi.server.use(async (ctx, next) => {
      const config = strapi.config.get('plugin::api-guard-pro');
      
      // Skip if interceptor is disabled
      if (config?.interceptorEnabled === false) {
        return next();
      }
      
      // Skip bypass paths
      const bypassPaths = config?.bypassPaths || ['/admin', '/_health', '/documentation'];
      const currentPath = ctx.path || ctx.url || '';
      
      if (bypassPaths.some(path => currentPath.startsWith(path))) {
        return next();
      }
      
      try {
        const interceptor = strapi.service('plugin::api-guard-pro.interceptor');
        if (interceptor) {
          await interceptor.intercept(ctx, next);
        } else {
          await next();
        }
      } catch (err) {
        strapi.log.error('[api-guard-pro] Interceptor error:', err.message);
        await next();
      }
    });
    
    // Sync default data if needed
    const setupService = strapi.service('plugin::api-guard-pro.setup');
    if (setupService) {
      await setupService.ensureDefaults();
    }
    
    strapi.log.info('[api-guard-pro] Bootstrap completed successfully');
  } catch (err) {
    strapi.log.error('[api-guard-pro] Bootstrap failed:', err.message);
    throw err;
  }
};
