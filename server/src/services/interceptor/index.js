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

    const normalizePrefix = (value) => {
      const normalized = `/${String(value || '').trim().replace(/^\/+/, '').replace(/\/+$/, '')}`;
      return normalized === '/' ? normalized : normalized;
    };
    const normalizedPath = normalizePrefix(path);

    const config = strapi.config.get('plugin::api-guard-pro') || {};
    const defaultBypassPaths = ['/admin', '/_health', '/documentation', '/upload', '/api-guard-pro', '/content-manager', '/i18n', '/users-permissions', '/api/auth', '/api/me'];
    const configuredBypassPaths = Array.isArray(config.bypassPaths) ? config.bypassPaths : [];
    const bypassPaths = [...new Set([...defaultBypassPaths, ...configuredBypassPaths])];

    if (bypassPaths.some((prefix) => {
      const normalizedPrefix = normalizePrefix(prefix);
      return normalizedPath === normalizedPrefix || normalizedPath.startsWith(`${normalizedPrefix}/`);
    })) {
      return next();
    }

    const resources = await strapi.db.query('plugin::api-guard-pro.resource').findMany({
      where: { isActive: true },
      populate: { domain: true }
    });

    const enforcementMode = String(config.enforcementMode || 'enforce');

    let matchedResource = null;
    let matchedViaCanonical = false;

    // --- Canonical URL detection: /{domainKey}/{roleKey}/{resourceKey}[/...] ---
    const SYSTEM_PREFIXES = ['/api/', '/admin/', '/_health', '/documentation', '/upload',
      '/content-manager', '/i18n', '/users-permissions', '/api-guard-pro', '/api/auth'];
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

      if (bypassPaths.some((prefix) => {
        const normalizedPrefix = normalizePrefix(prefix);
        return normalizedPath === normalizedPrefix || normalizedPath.startsWith(`${normalizedPrefix}/`);
      })) {
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

    // ── Owner scoping ─────────────────────────────────────────────────────
    // Mirrors app-access-guard.js behaviour: for any content-type that has an
    // `owners` relation pointing at plugin::users-permissions.user, enforce:
    //   find   → inject owners filter so user only sees own records
    //   create → auto-connect the current user as owner
    //   update/delete → pre-flight DB check that the user owns the record
    //
    // Skipped when:
    //   • enforceOwnership config is false (opt-out)
    //   • context.isElevated (admin elevation bypasses scoping)
    //   • matchedResource.isPublic (public resources have no owner concept)
    //   • no authenticated user (anonymous — let Strapi decide)
    //   • content-type has no `owners` relation

    if (
      config.enforceOwnership !== false &&
      !context.isElevated &&
      !matchedResource.isPublic &&
      context.user?.id &&
      matchedResource.contentTypeUid
    ) {
      const model = strapi.contentTypes[matchedResource.contentTypeUid];
      const hasOwnersRelation =
        model?.attributes?.owners &&
        model.attributes.owners.target === 'plugin::users-permissions.user';

      if (hasOwnersRelation) {
        const normalizedMethod = String(method).toUpperCase();

        // ── find: inject filter so user only sees own records ────────────
        if (normalizedMethod === 'GET') {
          const isList = !ctx.params?.id;
          if (isList) {
            ctx.query = ctx.query || {};
            ctx.query.filters = ctx.query.filters || {};
            ctx.query.filters.owners = { id: { $eq: context.user.id } };
          }
        }

        // ── create: auto-connect authenticated user as owner ─────────────
        if (normalizedMethod === 'POST') {
          if (ctx.request.body?.data) {
            ctx.request.body.data.owners = {
              connect: [context.user.documentId || context.user.id],
            };
          } else if (ctx.request.body) {
            ctx.request.body = {
              ...ctx.request.body,
              data: {
                ...(ctx.request.body.data || {}),
                owners: { connect: [context.user.documentId || context.user.id] },
              },
            };
          }
        }

        // ── update / delete: verify the user owns the target record ───────
        if (normalizedMethod === 'PUT' || normalizedMethod === 'PATCH' || normalizedMethod === 'DELETE') {
          const documentId = ctx.params?.id;
          if (documentId) {
            try {
              const record = await strapi.documents(matchedResource.contentTypeUid).findOne({
                documentId,
                populate: { owners: { fields: ['id'] } },
              });

              if (!record) {
                if (shouldRecord) {
                  await recorder.record({ method, path, url: rawUrl, query, body: ctx.request?.body, matched: true, status: 404 });
                }
                return ctx.notFound('Record not found');
              }

              const owners = record.owners || [];
              const isOwner = Array.isArray(owners)
                ? owners.some((o) => o.id === context.user.id)
                : owners?.id === context.user.id;

              if (!isOwner) {
                if (shouldRecord) {
                  await recorder.record({ method, path, url: rawUrl, query, body: ctx.request?.body, matched: true, status: 403 });
                }
                return ctx.forbidden('You can only modify your own records');
              }
            } catch (err) {
              strapi.log.error(
                `[api-guard-pro] ownership check failed for ${matchedResource.contentTypeUid}/${documentId}: ${err.message}`
              );
              return ctx.forbidden('Ownership verification failed');
            }
          }
        }
      }
    }

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
