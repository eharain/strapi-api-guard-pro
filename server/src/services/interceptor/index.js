'use strict';

const requestService = require('./request');
const responseService = require('./response');

let cachedPublicRoleId = null;

module.exports = ({ strapi }) => ({
  async intercept(ctx, next) {
    const method = ctx.method;
    const rawUrl = ctx.url || ctx.request?.url || ctx.path || '';
    const path = rawUrl.split('?')[0];
    const query = ctx.query && typeof ctx.query === 'object' ? ctx.query : {};

    const resources = await strapi.db.query('plugin::api-guard-pro.resource').findMany({
      where: { isActive: true },
      populate: { domain: true }
    });

    let matchedResource = null;

    for (const resource of resources) {
      if (String(resource.method).toUpperCase() !== String(method).toUpperCase()) continue;

      if (resource.pathPattern) {
        const regex = this.pathToRegex(resource.pathPattern);
        if (regex.test(path)) {
          matchedResource = resource;
          break;
        }
      }

      if (!matchedResource && resource.aliasPath) {
        const regex = this.pathToRegex(resource.aliasPath);
        if (regex.test(path)) {
          matchedResource = resource;
          break;
        }
      }
    }

    const recorder = strapi.service('plugin::api-guard-pro.resource-recorder');
    const shouldRecord = recorder?.isEnabled?.() === true;
    const config = strapi.config.get('plugin::api-guard-pro') || {};
    const defaultBypassPaths = ['/admin', '/_health', '/documentation', '/uploads', '/api-guard-pro', '/content-manager', '/i18n', '/users-permissions'];
    const configuredBypassPaths = Array.isArray(config.bypassPaths) ? config.bypassPaths : [];
    const bypassPaths = [...new Set([...defaultBypassPaths, ...configuredBypassPaths])];

    if (!matchedResource) {
      const recordedEntry = shouldRecord
        ? recorder.record({
          method,
          path,
          url: rawUrl,
          query,
          body: ctx.request?.body,
          matched: false,
          status: null
        })
        : null;

      if (bypassPaths.some((prefix) => path.startsWith(prefix))) {
        return next();
      }

      if (shouldRecord && recordedEntry) {
        return next();
      }

      if (config.respectUsersPermissions !== false) {
        const allowedByUp = await this.isAllowedByUsersPermissions(ctx, method, path);
        if (allowedByUp) {
          return next();
        }
      }

      if (config.denyByDefault) {
        return ctx.forbidden('No matching permission resource');
      }
      return next();
    }

    const contextResolver = strapi.service('plugin::api-guard-pro.context-resolver');
    const context = await contextResolver.resolve(ctx);

    const permissionEngine = strapi.service('plugin::api-guard-pro.permission-engine');
    const allowed = await permissionEngine.can({
      user: context.user,
      action: method,
      resourceUid: matchedResource.contentTypeUid,
      context
    });

    if (!allowed) {
      if (shouldRecord) {
        recorder.record({ method, path, url: rawUrl, query, body: ctx.request?.body, matched: true, status: 403 });
      }

      if (!context.user) return ctx.unauthorized('Authentication required');
      return ctx.forbidden('Access denied');
    }

    if (!matchedResource.isPublic && context.domain) {
      const userRoleType = context.user?.role?.type || context.user?.role?.name || 'public';
      if (context.domain.strapiRoleType && context.domain.strapiRoleType !== userRoleType) {
        if (shouldRecord) {
          recorder.record({ method, path, url: rawUrl, query, body: ctx.request?.body, matched: true, status: 403 });
        }

        return ctx.forbidden('User role cannot access this domain');
      }
    }

    await requestService.process(ctx, matchedResource, context);

    await next();

    if (shouldRecord) {
      recorder.record({ method, path, url: rawUrl, query, body: ctx.request?.body, matched: true, status: ctx.status || 200 });
    }

    ctx.body = await responseService.process(ctx.body, matchedResource);
  },

  async isAllowedByUsersPermissions(ctx, method, path) {
    try {
      const mapped = this.mapToUsersPermissionsAction(method, path);
      if (!mapped) return false;

      const roleId = await this.resolveUsersPermissionsRoleId(ctx);
      if (!roleId) return false;

      const permission = await strapi.db.query('plugin::users-permissions.permission').findOne({
        where: {
          action: mapped.action,
          role: { id: roleId }
        }
      });

      return Boolean(permission && permission.enabled !== false);
    } catch (err) {
      strapi.log.debug(`[api-guard-pro] users-permissions fallback check failed: ${err.message}`);
      return false;
    }
  },

  async resolveUsersPermissionsRoleId(ctx) {
    if (ctx.state?.user?.role?.id) {
      return ctx.state.user.role.id;
    }

    if (cachedPublicRoleId) {
      return cachedPublicRoleId;
    }

    const publicRole = await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { type: 'public' },
      select: ['id']
    });

    cachedPublicRoleId = publicRole?.id || null;
    return cachedPublicRoleId;
  },

  mapToUsersPermissionsAction(method, path) {
    const normalizedMethod = String(method || '').toUpperCase();
    if (!path.startsWith('/api/')) return null;

    const segments = path.split('/').filter(Boolean);
    if (segments.length < 2) return null;

    const slug = segments[1];
    const isSingleRecordRequest = segments.length > 2;

    const ct = Object.values(strapi.contentTypes).find((item) => {
      if (item.plugin) return false;
      return item.info?.pluralName === slug || item.info?.singularName === slug;
    });

    if (!ct?.uid) return null;

    let operation = null;
    if (normalizedMethod === 'GET') operation = isSingleRecordRequest ? 'findOne' : 'find';
    if (normalizedMethod === 'POST') operation = 'create';
    if (normalizedMethod === 'PUT' || normalizedMethod === 'PATCH') operation = 'update';
    if (normalizedMethod === 'DELETE') operation = 'delete';

    if (!operation) return null;

    return {
      action: `${ct.uid}.${operation}`
    };
  },

  pathToRegex(pattern = '') {
    const escaped = String(pattern)
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\\:[^/]+/g, '([^/]+)');
    return new RegExp(`^${escaped}$`);
  }
});
