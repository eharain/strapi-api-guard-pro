'use strict';

import requestInterceptor from './request';
import responseInterceptor from './response';

export default ({ strapi }) => ({
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
      
      const regex = this.pathToRegex(resource.pathPattern);
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
        
        const regex = this.pathToRegex(resource.aliasPath);
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
    const requestService = strapi.service('plugin::api-guard-pro.request-interceptor');
    if (requestService) {
      await requestService.process(ctx, matchedResource, context);
    }
    
    await next();
    
    // Apply response rules
    const responseService = strapi.service('plugin::api-guard-pro.response-interceptor');
    if (responseService) {
      ctx.body = await responseService.process(ctx.body, matchedResource);
    }
  },
  
  pathToRegex(pattern = '') {
    const escaped = String(pattern)
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\\:[^/]+/g, '([^/]+)');
    return new RegExp(`^${escaped}$`);
  }
});
