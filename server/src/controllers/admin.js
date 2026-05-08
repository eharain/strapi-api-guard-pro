'use strict';

/**
 * Admin controller for the api-guard-pro plugin.
 *
 * Surface area is intentionally small and follows the 4-CT model:
 *   domains | roles | resources | policies
 *
 * Plus a few utility endpoints:
 *   - users (assign api-guard-pro roles to users-permissions users)
 *   - strapi-content-types (catalog of Strapi CTs the user can guard)
 *   - resource-recorder (capture live traffic and promote into resource+policy)
 *   - data-transfer (export / import JSON in the compact sample shape)
 *   - clear-cache (drop permission engine cache)
 *   - overview (counts)
 */

const MODEL_UIDS = {
  domains:   'plugin::api-guard-pro.domain',
  roles:     'plugin::api-guard-pro.role',
  resources: 'plugin::api-guard-pro.resource',
  policies:  'plugin::api-guard-pro.policy',
};

const POPULATE = {
  domains:   { roles: true },
  roles:     { domain: true, policies: true },
  resources: { policies: true },
  policies:  { resource: true, grants: true },
};

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const getStandardActions = (ct) => {
  const plural = ct?.info?.pluralName || '';
  const singular = ct?.info?.singularName || '';
  if (!plural || !singular) return [];

  if (ct.kind === 'singleType') {
    return [
      { type: 'standard', action: 'find',   method: 'GET', path: `/api/${singular}` },
      { type: 'standard', action: 'update', method: 'PUT', path: `/api/${singular}` },
    ];
  }
  return [
    { type: 'standard', action: 'find',          method: 'GET',    path: `/api/${plural}` },
    { type: 'standard', action: 'findOne',       method: 'GET',    path: `/api/${plural}/:id` },
    { type: 'standard', action: 'create',        method: 'POST',   path: `/api/${plural}` },
    { type: 'standard', action: 'update',        method: 'PUT',    path: `/api/${plural}/:id` },
    { type: 'standard', action: 'partialUpdate', method: 'PATCH',  path: `/api/${plural}/:id` },
    { type: 'standard', action: 'delete',        method: 'DELETE', path: `/api/${plural}/:id` },
  ];
};

const getRuntimeRoutes = (strapi) => {
  const stack = strapi.server?.router?.stack;
  if (!Array.isArray(stack)) return [];

  const routes = [];
  for (const layer of stack) {
    const path = typeof layer.path === 'string' ? layer.path : null;
    if (!path || !path.startsWith('/api/')) continue;
    const methods = Object.keys(layer.methods || {})
      .filter((m) => layer.methods[m])
      .map((m) => m.toUpperCase())
      .filter((m) => m !== 'HEAD' && m !== 'OPTIONS');
    for (const method of methods) routes.push({ method, path });
  }
  return routes;
};

module.exports = ({ strapi }) => ({
  // ?? Overview ??????????????????????????????????????????????????????????
  async overview(ctx) {
    const [domains, roles, resources, policies, users] = await Promise.all([
      strapi.db.query(MODEL_UIDS.domains).count(),
      strapi.db.query(MODEL_UIDS.roles).count(),
      strapi.db.query(MODEL_UIDS.resources).count(),
      strapi.db.query(MODEL_UIDS.policies).count(),
      strapi.db.query('plugin::users-permissions.user').count(),
    ]);
    ctx.send({ domains, roles, resources, policies, users });
  },

  // ?? Generic CRUD over the 4 entities ??????????????????????????????????
  async list(ctx) {
    const entity = String(ctx.params.entity || '').trim();
    const modelUid = MODEL_UIDS[entity];
    if (!modelUid) return ctx.badRequest('Invalid entity');

    const records = await strapi.db.query(modelUid).findMany({
      orderBy: { id: 'asc' },
      populate: POPULATE[entity] || {},
    });
    ctx.send({ data: records || [] });
  },

  async create(ctx) {
    const entity = String(ctx.params.entity || '').trim();
    const modelUid = MODEL_UIDS[entity];
    if (!modelUid) return ctx.badRequest('Invalid entity');

    const payload = ctx.request.body?.data || ctx.request.body || {};
    const created = await strapi.db.query(modelUid).create({ data: payload });
    ctx.send({ data: created });
  },

  async update(ctx) {
    const entity = String(ctx.params.entity || '').trim();
    const modelUid = MODEL_UIDS[entity];
    if (!modelUid) return ctx.badRequest('Invalid entity');

    const id = toNumber(ctx.params.id);
    if (!id) return ctx.badRequest('Invalid id');

    const payload = ctx.request.body?.data || ctx.request.body || {};
    const updated = await strapi.db.query(modelUid).update({ where: { id }, data: payload });
    ctx.send({ data: updated });
  },

  async remove(ctx) {
    const entity = String(ctx.params.entity || '').trim();
    const modelUid = MODEL_UIDS[entity];
    if (!modelUid) return ctx.badRequest('Invalid entity');

    const id = toNumber(ctx.params.id);
    if (!id) return ctx.badRequest('Invalid id');

    await strapi.db.query(modelUid).delete({ where: { id } });
    ctx.send({ ok: true });
  },

  // ?? Users / role assignment ???????????????????????????????????????????
  async listUsers(ctx) {
    const users = await strapi.db.query('plugin::users-permissions.user').findMany({
      orderBy: { id: 'asc' },
      select: ['id', 'username', 'email', 'displayName', 'blocked', 'confirmed'],
      populate: {
        role: { select: ['id', 'name', 'type'] },
        api_guard_roles: { select: ['id', 'key', 'name'], populate: { domain: { select: ['id', 'key', 'name'] } } },
      },
    });
    ctx.send({ data: users || [] });
  },

  async assignUserRoles(ctx) {
    const id = toNumber(ctx.params.id);
    if (!id) return ctx.badRequest('Invalid user id');

    const body = ctx.request.body || {};
    const roleIds = (Array.isArray(body.roleIds) ? body.roleIds : []).map(Number).filter(Boolean);

    const user = await strapi.db.query('plugin::users-permissions.user').findOne({ where: { id } });
    if (!user) return ctx.notFound('User not found');

    await strapi.db.query('plugin::users-permissions.user').update({
      where: { id },
      data: { api_guard_roles: roleIds },
    });

    const updated = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id },
      select: ['id', 'username', 'email', 'displayName'],
      populate: {
        api_guard_roles: { select: ['id', 'key', 'name'], populate: { domain: { select: ['id', 'key', 'name'] } } },
      },
    });

    ctx.send({ data: updated });
  },

  // ?? Strapi content-type catalog ???????????????????????????????????????
  async strapiContentTypes(ctx) {
    const types = Object.values(strapi.contentTypes)
      .filter((ct) => !ct.plugin)
      .map((ct) => ({
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
          })),
      }));
    ctx.send({ data: types });
  },

  async resourceBuilderCatalog(ctx) {
    const routes = getRuntimeRoutes(strapi);
    const routeSet = new Set(routes.map((r) => `${r.method} ${r.path}`));

    const catalog = Object.values(strapi.contentTypes)
      .filter((ct) => !ct.plugin)
      .map((ct) => {
        const standard = getStandardActions(ct);
        const standardSet = new Set(standard.map((a) => `${a.method} ${a.path}`));
        const prefix = ct.kind === 'singleType'
          ? `/api/${ct.info?.singularName || ''}`
          : `/api/${ct.info?.pluralName || ''}`;
        const extended = routes
          .filter((r) => prefix && r.path.startsWith(prefix) && !standardSet.has(`${r.method} ${r.path}`))
          .map((r) => ({ type: 'extended', action: 'custom', method: r.method, path: r.path }));

        return {
          uid: ct.uid,
          displayName: ct.info?.displayName || ct.uid,
          kind: ct.kind,
          standard,
          extended,
          totalDiscoveredRoutes: routes.filter((r) => prefix && r.path.startsWith(prefix)).length,
          hasKnownRoutes: Array.from(routeSet).some((v) => v.includes(prefix)),
        };
      })
      .filter((ct) => ct.standard.length > 0 || ct.extended.length > 0);

    ctx.send({ data: catalog });
  },

  // ?? Resource recorder ?????????????????????????????????????????????????
  async resourceRecorder(ctx) {
    const recorder = strapi.service('plugin::api-guard-pro.resource-recorder');
    const settings = recorder.getSettings();
    const suggestions = await recorder.suggestions();
    ctx.send({ data: { ...settings, records: suggestions, suggestions } });
  },

  async setResourceRecorder(ctx) {
    const recorder = strapi.service('plugin::api-guard-pro.resource-recorder');
    const body = ctx.request.body || {};
    recorder.setEnabled(Boolean(body.enabled));
    recorder.setFilters(body.filters || {});
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
    const q = ctx.query || {};
    const result = await recorder.listPaginated({
      page: q.page,
      pageSize: q.pageSize,
      search: q.search || '',
      method: q.method || '',
      matched: q.matched || '',
    });
    ctx.send(result);
  },

  async recordingToResource(ctx) {
    const recorder = strapi.service('plugin::api-guard-pro.resource-recorder');
    const recordKey = decodeURIComponent(String(ctx.params.recordKey || '').trim());
    if (!recordKey) return ctx.badRequest('Invalid recordKey');

    const entry = await strapi.db.query('plugin::api-guard-pro.api-recording').findOne({ where: { recordKey } });
    if (!entry) return ctx.notFound('Recording not found');

    ctx.send({ data: recorder.toResourceForm(entry) });
  },

  async promoteRecordings(ctx) {
    const body = ctx.request.body || {};
    const recorder = strapi.service('plugin::api-guard-pro.resource-recorder');
    const results = await recorder.promoteRecordings({
      isActive: Boolean(body.isActive ?? true),
      overwrite: Boolean(body.overwrite ?? false),
      grantRoleKeys: Array.isArray(body.grantRoleKeys) ? body.grantRoleKeys : [],
    });
    ctx.send({ data: results });
  },

  // ?? Permission cache ??????????????????????????????????????????????????
  async clearCache(ctx) {
    const engine = strapi.service('plugin::api-guard-pro.permission-engine');
    if (engine) {
      engine.clearAllCache();
      return ctx.send({ ok: true, message: 'Permission cache cleared successfully' });
    }
    ctx.send({ ok: false, message: 'Permission engine not available' });
  },

  // ?? Data transfer (compact sample shape) ??????????????????????????????
  async exportData(ctx) {
    try {
      const service = strapi.service('plugin::api-guard-pro.data-transfer');
      const data = await service.exportData();
      ctx.set('Content-Disposition', `attachment; filename="api-guard-pro-export-${Date.now()}.json"`);
      ctx.set('Content-Type', 'application/json');
      ctx.send(data);
    } catch (err) {
      strapi.log.error('[api-guard-pro] exportData error:', err.message);
      ctx.throw(500, err.message);
    }
  },

  async importData(ctx) {
    try {
      const { data: payload, clean = false } = ctx.request.body || {};
      if (!payload || typeof payload !== 'object') {
        return ctx.badRequest('Missing or invalid "data" field in request body');
      }
      const service = strapi.service('plugin::api-guard-pro.data-transfer');
      const results = await service.importData(payload, !!clean);
      ctx.send({ results });
    } catch (err) {
      strapi.log.error('[api-guard-pro] importData error:', err.message);
      ctx.throw(500, err.message);
    }
  },
});
