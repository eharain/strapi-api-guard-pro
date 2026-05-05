'use strict';

module.exports = async ({ strapi }) => {
  try {
    // Do not register anything if the plugin is explicitly disabled in plugins config
    const pluginConfig = strapi.config.get('plugin.api-guard-pro') ||
      strapi.config.get('plugins.api-guard-pro') || {};
    if (pluginConfig.enabled === false) {
      strapi.log.info('[api-guard-pro] Plugin is disabled — skipping bootstrap.');
      return;
    }

    // Register global middleware
    strapi.server.use(async (ctx, next) => {
      const config = strapi.config.get('plugin::api-guard-pro');

      // Skip if interceptor is disabled
      if (config?.interceptorEnabled === false) {
        return next();
      }

      // Skip bypass paths
      const defaultBypassPaths = ['/admin', '/_health', '/documentation', '/upload', '/api-guard-pro', '/content-manager', '/i18n', '/users-permissions', '/api/auth', '/api/me'];
      const configuredBypassPaths = Array.isArray(config?.bypassPaths) ? config.bypassPaths : [];
      const bypassPaths = [...new Set([...defaultBypassPaths, ...configuredBypassPaths])];
      const currentPath = ctx.path || ctx.url || '';

      const normalizePrefix = (value) => {
        const normalized = `/${String(value || '').trim().replace(/^\/+/, '').replace(/\/+$/, '')}`;
        return normalized === '/' ? normalized : normalized;
      };
      const normalizedCurrentPath = normalizePrefix(currentPath);

      if (bypassPaths.some((prefix) => {
        const normalizedPrefix = normalizePrefix(prefix);
        return normalizedCurrentPath === normalizedPrefix || normalizedCurrentPath.startsWith(`${normalizedPrefix}/`);
      })) {
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
