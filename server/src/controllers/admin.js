'use strict';

const MODEL_UIDS = {
  domains: 'plugin::api-guard-pro.domain',
  resources: 'plugin::api-guard-pro.resource',
  roles: 'plugin::api-guard-pro.role',
  policies: 'plugin::api-guard-pro.policy',
  grants: 'plugin::api-guard-pro.grant',
  groups: 'plugin::api-guard-pro.group'
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getStandardActions = (ct) => {
  const plural = ct?.info?.pluralName || '';
  const singular = ct?.info?.singularName || '';

  if (!plural || !singular) return [];

  if (ct.kind === 'singleType') {
    return [
      { type: 'standard', action: 'find', method: 'GET', path: `/api/${singular}` },
      { type: 'standard', action: 'update', method: 'PUT', path: `/api/${singular}` }
    ];
  }

  return [
    { type: 'standard', action: 'find', method: 'GET', path: `/api/${plural}` },
    { type: 'standard', action: 'findOne', method: 'GET', path: `/api/${plural}/:id` },
    { type: 'standard', action: 'create', method: 'POST', path: `/api/${plural}` },
    { type: 'standard', action: 'update', method: 'PUT', path: `/api/${plural}/:id` },
    { type: 'standard', action: 'partialUpdate', method: 'PATCH', path: `/api/${plural}/:id` },
    { type: 'standard', action: 'delete', method: 'DELETE', path: `/api/${plural}/:id` }
  ];
};

const getRuntimeRoutes = (strapi) => {
  const routerStack = strapi.server?.router?.stack;
  if (!Array.isArray(routerStack)) return [];

  const routes = [];

  for (const layer of routerStack) {
    const path = typeof layer.path === 'string' ? layer.path : null;
    if (!path || !path.startsWith('/api/')) continue;

    const methods = Object.keys(layer.methods || {})
      .filter((method) => layer.methods[method])
      .map((method) => method.toUpperCase())
      .filter((method) => method !== 'HEAD' && method !== 'OPTIONS');

    for (const method of methods) {
      routes.push({ method, path });
    }
  }

  return routes;
};

module.exports = ({ strapi }) => ({
  async overview(ctx) {
    const counts = await Promise.all([
      strapi.db.query(MODEL_UIDS.domains).count(),
      strapi.db.query(MODEL_UIDS.resources).count(),
      strapi.db.query(MODEL_UIDS.roles).count(),
      strapi.db.query(MODEL_UIDS.policies).count(),
      strapi.db.query(MODEL_UIDS.grants).count(),
      strapi.db.query(MODEL_UIDS.groups).count(),
      strapi.db.query('plugin::users-permissions.user').count()
    ]);

    const [domains, resources, roles, policies, grants, groups, users] = counts;

    ctx.send({ domains, resources, roles, policies, grants, groups, users });
  },

  async list(ctx) {
    const entity = String(ctx.params.entity || '').trim();
    const modelUid = MODEL_UIDS[entity];

    if (!modelUid) {
      return ctx.badRequest('Invalid entity');
    }

    const records = await strapi.db.query(modelUid).findMany({
      orderBy: { id: 'asc' }
    });

    ctx.send({ data: records || [] });
  },

  async create(ctx) {
    const entity = String(ctx.params.entity || '').trim();
    const modelUid = MODEL_UIDS[entity];

    if (!modelUid) {
      return ctx.badRequest('Invalid entity');
    }

    const payload = ctx.request.body?.data || ctx.request.body || {};
    const created = await strapi.db.query(modelUid).create({ data: payload });

    ctx.send({ data: created });
  },

  async update(ctx) {
    const entity = String(ctx.params.entity || '').trim();
    const modelUid = MODEL_UIDS[entity];

    if (!modelUid) {
      return ctx.badRequest('Invalid entity');
    }

    const id = toNumber(ctx.params.id);
    if (!id) return ctx.badRequest('Invalid id');

    const payload = ctx.request.body?.data || ctx.request.body || {};
    const updated = await strapi.db.query(modelUid).update({
      where: { id },
      data: payload
    });

    ctx.send({ data: updated });
  },

  async remove(ctx) {
    const entity = String(ctx.params.entity || '').trim();
    const modelUid = MODEL_UIDS[entity];

    if (!modelUid) {
      return ctx.badRequest('Invalid entity');
    }

    const id = toNumber(ctx.params.id);
    if (!id) return ctx.badRequest('Invalid id');

    await strapi.db.query(modelUid).delete({ where: { id } });
    ctx.send({ ok: true });
  },

  async listUsers(ctx) {
    const users = await strapi.db.query('plugin::users-permissions.user').findMany({
      orderBy: { id: 'asc' },
      select: ['id', 'username', 'email', 'displayName', 'blocked', 'confirmed'],
      populate: {
        role: { select: ['id', 'name', 'type'] },
        permission_roles: { populate: { domain: true } }
      }
    });

    ctx.send({ data: users || [] });
  },

  async assignUserRoles(ctx) {
    const userId = toNumber(ctx.params.userId);
    if (!userId) return ctx.badRequest('Invalid user id');

    const roleIds = Array.isArray(ctx.request.body?.roleIds)
      ? ctx.request.body.roleIds.map(id => toNumber(id)).filter(Boolean)
      : [];

    const updated = await strapi.db.query('plugin::users-permissions.user').update({
      where: { id: userId },
      data: { permission_roles: roleIds }
    });

    ctx.send({ data: updated });
  },

  async strapiContentTypes(ctx) {
    const allTypes = Object.values(strapi.contentTypes);
    const types = allTypes
      .filter(ct => !ct.plugin)
      .map(ct => ({
        uid: ct.uid,
        displayName: ct.info?.displayName || ct.uid,
        kind: ct.kind,
        pluralName: ct.info?.pluralName || null,
        singularName: ct.info?.singularName || null,
        attributes: Object.entries(ct.attributes || {})
          .filter(([, attr]) => attr.type !== 'dynamiczone')
          .map(([name, attr]) => ({
            name,
            type: attr.type,
            target: attr.target || null,
            component: attr.component || null,
            relation: attr.relation || null,
            required: attr.required || false,
            private: attr.private || false,
          }))
      }));

    ctx.send({ data: types });
  },

  async recordingToResource(ctx) {
    const recorder = strapi.service('plugin::api-guard-pro.resource-recorder');
    const recordKey = decodeURIComponent(String(ctx.params.recordKey || '').trim());
    if (!recordKey) return ctx.badRequest('Invalid recordKey');

    const entry = await strapi.db.query('plugin::api-guard-pro.api-recording').findOne({ where: { recordKey } });
    if (!entry) return ctx.notFound('Recording not found');

    ctx.send({ data: recorder.toResourceForm(entry) });
  },

  async resourceRecorder(ctx) {
    const recorder = strapi.service('plugin::api-guard-pro.resource-recorder');
    const settings = recorder.getSettings();
    const suggestions = await recorder.suggestions();

    ctx.send({
      data: {
        ...settings,
        records: suggestions,
        suggestions
      }
    });
  },

  async setResourceRecorder(ctx) {
    const recorder = strapi.service('plugin::api-guard-pro.resource-recorder');
    const body = ctx.request.body || {};
    const enabled = recorder.setEnabled(Boolean(body.enabled));
    const filters = recorder.setFilters(body.filters || {});
    if (body.maxRecords !== undefined) recorder.setMaxRecords(body.maxRecords);
    if (body.timeLimitSeconds !== undefined) recorder.setTimeLimitSeconds(body.timeLimitSeconds);
    ctx.send({ data: recorder.getSettings() });
  },

  async clearResourceRecorder(ctx) {
    const recorder = strapi.service('plugin::api-guard-pro.resource-recorder');
    await recorder.clear();
    ctx.send({ data: { ok: true } });
  },

  async listRecorderLogs(ctx) {
    const recorder = strapi.service('plugin::api-guard-pro.resource-recorder');
    const query = ctx.query || {};
    const result = await recorder.listPaginated({
      page: query.page,
      pageSize: query.pageSize,
      search: query.search || '',
      method: query.method || '',
      matched: query.matched || ''
    });
    ctx.send(result);
  },

  async resourceBuilderCatalog(ctx) {
    const routes = getRuntimeRoutes(strapi);
    const routeSet = new Set(routes.map((route) => `${route.method} ${route.path}`));

    const contentTypes = Object.values(strapi.contentTypes)
      .filter((ct) => !ct.plugin)
      .map((ct) => {
        const standard = getStandardActions(ct);
        const standardSet = new Set(standard.map((action) => `${action.method} ${action.path}`));
        const prefix = ct.kind === 'singleType'
          ? `/api/${ct.info?.singularName || ''}`
          : `/api/${ct.info?.pluralName || ''}`;

        const extended = routes
          .filter((route) => prefix && route.path.startsWith(prefix) && !standardSet.has(`${route.method} ${route.path}`))
          .map((route) => ({
            type: 'extended',
            action: 'custom',
            method: route.method,
            path: route.path
          }));

        return {
          uid: ct.uid,
          displayName: ct.info?.displayName || ct.uid,
          kind: ct.kind,
          standard,
          extended,
          totalDiscoveredRoutes: routes.filter((route) => prefix && route.path.startsWith(prefix)).length,
          hasKnownRoutes: Array.from(routeSet).some((value) => value.includes(prefix))
        };
      })
      .filter((ct) => ct.standard.length > 0 || ct.extended.length > 0);

    ctx.send({ data: contentTypes });
  },

  async clearCache(ctx) {
    const permissionEngine = strapi.service('plugin::api-guard-pro.permission-engine');
    if (permissionEngine) {
      permissionEngine.clearAllCache();
      ctx.send({ ok: true, message: 'Permission cache cleared successfully' });
    } else {
      ctx.send({ ok: false, message: 'Permission engine not available' });
    }
  }
});
