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

    const config = strapi.config.get('plugin::api-guard-pro') || {};
    const enforcementMode = String(config.enforcementMode || 'enforce');

    let matchedResource = null;
    let matchedViaCanonical = false;

    // --- Canonical URL detection: /{domainKey}/{roleKey}/{resourceKey}[/...] ---
    const SYSTEM_PREFIXES = ['/api/', '/admin/', '/_health', '/documentation', '/uploads',
      '/content-manager', '/i18n', '/users-permissions', '/api-guard-pro'];
    const isSystemPath = SYSTEM_PREFIXES.some(p => path.startsWith(p));

    if (!isSystemPath) {
      const segments = path.split('/').filter(Boolean);
      if (segments.length >= 3) {
        const [domainKey, roleKey, resourceKey, ...rest] = segments;
        const candidate = resources.find(r =>
          r.key === resourceKey &&
          r.domain?.key === domainKey &&
          String(r.method).toUpperCase() === String(method).toUpperCase()
        );
        if (candidate) {
          matchedResource = candidate;
          matchedViaCanonical = true;
          // Rewrite ctx.path so koa-router dispatches to the real Strapi endpoint.
          // Use the resource's pathPattern as the base and append any extra segments (e.g. :id values).
          const basePath = candidate.pathPattern.replace(/:[^/]+/g, () => rest.shift() || '');
          const remaining = rest.length > 0 ? `/${rest.join('/')}` : '';
          const rewritten = basePath + remaining;
          ctx.path = rewritten;
          ctx.url = rewritten + (ctx.url.includes('?') ? `?${ctx.url.split('?')[1]}` : '');
          strapi.log.debug(`[api-guard-pro] Canonical URL /${domainKey}/${roleKey}/${resourceKey} → ${rewritten}`);
        }
      }
    }

    for (const resource of resources) {
      if (matchedResource) break;
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

    // blockLegacyPath: reject if resource requires canonical URL
    if (!matchedViaCanonical && matchedResource?.blockLegacyPath) {
      const domainKey = matchedResource.domain?.key || '<domain>';
      const canonicalHint = `/${domainKey}/<roleKey>/${matchedResource.key}`;
      return ctx.forbidden(`Direct access to this resource is disabled. Use the canonical URL: ${canonicalHint}`);
    }

    const recorder = strapi.service('plugin::api-guard-pro.resource-recorder');
    const shouldRecord = recorder?.isEnabled?.() === true;
    const defaultBypassPaths = ['/admin', '/_health', '/documentation', '/uploads', '/api-guard-pro', '/content-manager', '/i18n', '/users-permissions'];
    const configuredBypassPaths = Array.isArray(config.bypassPaths) ? config.bypassPaths : [];
    const bypassPaths = [...new Set([...defaultBypassPaths, ...configuredBypassPaths])];

    if (!matchedResource) {
      const recordedEntry = shouldRecord
        ? await recorder.record({
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

      if (enforcementMode === 'observe') {
        return next();
      }

      const allowFallback = enforcementMode === 'hybrid' || config.respectUsersPermissions !== false;
      if (allowFallback) {
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

    // blockDirectAccess: domain-level legacy path blocking
    if (!matchedViaCanonical && context.domain?.blockDirectAccess) {
      const canonicalHint = `/${context.domain.key}/<roleKey>/${matchedResource.key}`;
      if (shouldRecord) {
        await recorder.record({ method, path, url: rawUrl, query, body: ctx.request?.body, matched: true, status: 403 });
      }
      return ctx.forbidden(`Direct /api/* access is disabled for domain '${context.domain.key}'. Use the canonical URL: ${canonicalHint}`);
    }

    const permissionEngine = strapi.service('plugin::api-guard-pro.permission-engine');
    const allowed = await permissionEngine.can({
      user: context.user,
      action: method,
      resourceKey: matchedResource.key,
      resourceUid: matchedResource.contentTypeUid,
      context
    });

    if (!allowed) {
      if (shouldRecord) {
        await recorder.record({ method, path, url: rawUrl, query, body: ctx.request?.body, matched: true, status: 403 });
      }

      if (enforcementMode === 'observe') {
        return next();
      }

      if (enforcementMode === 'hybrid') {
        const allowedByUp = await this.isAllowedByUsersPermissions(ctx, method, path);
        if (allowedByUp) {
          return next();
        }
      }

      if (!context.user) return ctx.unauthorized('Authentication required');
      return ctx.forbidden('Access denied');
    }

    if (!matchedResource.isPublic && context.domain) {
      const userRoleType = context.user?.role?.type || context.user?.role?.name || 'public';
      if (context.domain.strapiRoleType && context.domain.strapiRoleType !== userRoleType) {
        if (shouldRecord) {
          await recorder.record({ method, path, url: rawUrl, query, body: ctx.request?.body, matched: true, status: 403 });
        }

        return ctx.forbidden('User role cannot access this domain');
      }
    }

    await requestService.process(ctx, matchedResource, context);

    await next();

    if (shouldRecord) {
      await recorder.record({ method, path, url: rawUrl, query, body: ctx.request?.body, matched: true, status: ctx.status || 200 });
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
