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

    const POPULATE = {
      domains:   {},
      resources: { domain: true, parentResource: true },
      roles:     { domain: true },
      policies:  { resource: true },
      grants:    { role: { populate: { domain: true } }, policy: { populate: { resource: true } } },
      groups:    { domain: true, parentGroup: true },
    };

    const records = await strapi.db.query(modelUid).findMany({
      orderBy: { id: 'asc' },
      populate: POPULATE[entity] || {}
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

  async inspect(ctx) {
    const domains = await strapi.db.query(MODEL_UIDS.domains).findMany({ where: { isActive: true } });
    const resources = await strapi.db.query(MODEL_UIDS.resources).findMany({
      where: { isActive: true },
      populate: { domain: true }
    });
    const roles = await strapi.db.query(MODEL_UIDS.roles).findMany({
      where: { isActive: true },
      populate: { domain: true }
    });
    const grants = await strapi.db.query(MODEL_UIDS.grants).findMany({
      populate: {
        role: { populate: { domain: true } },
        policy: { populate: { resource: true } }
      }
    });

    // Build canonical URL map: for each resource with a domain, list all roles in that domain
    const canonicalMap = resources
      .filter(r => r.domain?.key && r.key)
      .map(r => {
        const domainRoles = roles.filter(role => role.domain?.key === r.domain.key);
        return {
          resourceKey: r.key,
          displayName: r.displayName,
          method: r.method,
          pathPattern: r.pathPattern,
          domain: r.domain.key,
          blockLegacyPath: r.blockLegacyPath || false,
          canonicalUrls: domainRoles.map(role => ({
            role: role.key,
            url: `/${r.domain.key}/${role.key}/${r.key}`
          }))
        };
      });

    // Domain summary
    const domainSummary = domains.map(d => ({
      key: d.key,
      name: d.name,
      blockDirectAccess: d.blockDirectAccess || false,
      matchMode: d.matchMode,
      matchKey: d.matchKey,
      resourceCount: resources.filter(r => r.domain?.key === d.key).length,
      roleCount: roles.filter(r => r.domain?.key === d.key).length
    }));

    // Grant summary: role → policy → resource chain
    const grantChains = grants.map(g => ({
      grantId: g.id,
      role: g.role?.key,
      roleDomain: g.role?.domain?.key,
      policy: g.policy?.key,
      policyEffect: g.policy?.effect,
      resource: g.policy?.resource?.key,
      actions: g.policy?.actions
    }));

    ctx.send({
      data: {
        domains: domainSummary,
        canonicalMap,
        grantChains,
        totals: {
          domains: domains.length,
          resources: resources.length,
          roles: roles.length,
          grants: grants.length
        }
      }
    });
  },

  async clearCache(ctx) {
    const permissionEngine = strapi.service('plugin::api-guard-pro.permission-engine');
    if (permissionEngine) {
      permissionEngine.clearAllCache();
      ctx.send({ ok: true, message: 'Permission cache cleared successfully' });
    } else {
      ctx.send({ ok: false, message: 'Permission engine not available' });
    }
  },

  // ── Promote live router catalog → guard_resources ──────────────────────
  // Converts every Strapi API route from the live Koa router stack into a
  // guard_resource record.  Idempotent (keyed on `key`).
  // Body: { domainId?, isPublic?, isActive?, overwrite? }
  async promoteCatalog(ctx) {
    const body = ctx.request.body || {};
    const domainId = body.domainId ? Number(body.domainId) : null;
    const isPublic = Boolean(body.isPublic ?? false);
    const isActive = Boolean(body.isActive ?? true);
    const overwrite = Boolean(body.overwrite ?? false);

    const routes = getRuntimeRoutes(strapi);
    const apiRoutes = routes.filter(r => r.path.startsWith('/api/'));

    const results = { created: 0, updated: 0, skipped: 0, errors: [] };

    for (const route of apiRoutes) {
      try {
        // Derive a stable key from method + path pattern
        const key = (route.method.toLowerCase() + '.' + route.path)
          .replace(/\//g, '.')
          .replace(/[:{}]/g, '')
          .replace(/\.+/g, '.')
          .replace(/^\.|\.$/g, '');

        if (!key) { results.skipped++; continue; }

        const recorder = strapi.service('plugin::api-guard-pro.resource-recorder');
        const binding = recorder
          // toResourceForm needs an entry — build a minimal one inline
          ? (() => {
            const { inferStrapiBinding } = require('../services/resource-recorder');
            // inferStrapiBinding is not exported directly; use recorder internal path matching
            return null;
          })()
          : null;

        // Resolve contentTypeUid from content types by pluralName match
        const pathSegments = route.path.split('/').filter(Boolean);
        const collectionSlug = pathSegments[1] || '';
        const ct = Object.values(strapi.contentTypes).find(c =>
          !c.plugin && (c.info?.pluralName === collectionSlug || c.info?.singularName === collectionSlug)
        );

        const hasId = route.path.includes(':id');
        const actionMap = {
          GET: hasId ? 'findOne' : 'find',
          POST: 'create',
          PUT: 'update',
          PATCH: 'update',
          DELETE: 'delete'
        };
        const action = actionMap[route.method] || 'custom';
        const displayName = `${route.method} ${route.path}`;

        const data = {
          key,
          displayName,
          method: route.method,
          pathPattern: route.path,
          contentTypeUid: ct?.uid || null,
          isPublic,
          isActive,
          effect: 'allow',
          requestRules: {},
          responseRules: {},
          domain: domainId ? { id: domainId } : null
        };

        const existing = await strapi.db.query(MODEL_UIDS.resources).findOne({ where: { key } });
        if (existing) {
          if (!overwrite) { results.skipped++; continue; }
          await strapi.db.query(MODEL_UIDS.resources).update({ where: { id: existing.id }, data });
          results.updated++;
        } else {
          await strapi.db.query(MODEL_UIDS.resources).create({ data });
          results.created++;
        }
      } catch (err) {
        results.errors.push({ path: route.path, method: route.method, error: err.message });
      }
    }

    ctx.send({ data: results, total: apiRoutes.length });
  },

  // ── Promote recordings → guard_resources ───────────────────────────────
  // Body: { domainId?, isPublic?, isActive?, overwrite? }
  async promoteRecordings(ctx) {
    const body = ctx.request.body || {};
    const recorder = strapi.service('plugin::api-guard-pro.resource-recorder');
    const results = await recorder.promoteRecordings({
      domainId: body.domainId ? Number(body.domainId) : null,
      isPublic: Boolean(body.isPublic ?? false),
      isActive: Boolean(body.isActive ?? true),
      overwrite: Boolean(body.overwrite ?? false)
    });
    ctx.send({ data: results });
  },

  // ── Seed domains / roles / policies / grants from metadata ─────────────
  // Accepts a structured metadata payload produced by the ERP's access-metadata.js.
  // All upserts are idempotent (keyed on `key` per entity type).
  //
  // Payload shape:
  // {
  //   domains: [{ key, name, matchKey?, matchMode?, strapiRoleType?, blockDirectAccess? }],
  //   roles:   [{ key, name, domainKey, type?, strapiRoleType? }],
  //   policies:[{ key, name, resourceKey, actions, effect?, conditions? }],
  //   grants:  [{ roleKey, policyKey }]
  // }
  async seedFromMetadata(ctx) {
    const payload = ctx.request.body || {};
    const domains   = Array.isArray(payload.domains)  ? payload.domains  : [];
    const roles     = Array.isArray(payload.roles)     ? payload.roles    : [];
    const policies  = Array.isArray(payload.policies)  ? payload.policies : [];
    const grants    = Array.isArray(payload.grants)    ? payload.grants   : [];

    const results = { domains: {created:0,updated:0,errors:[]}, roles: {created:0,updated:0,errors:[]}, policies: {created:0,updated:0,errors:[]}, grants: {created:0,updated:0,errors:[]} };

    const upsert = async (uid, where, data, bucket) => {
      try {
        const existing = await strapi.db.query(uid).findOne({ where });
        if (existing) {
          await strapi.db.query(uid).update({ where: { id: existing.id }, data });
          bucket.updated++;
          return existing.id;
        } else {
          const created = await strapi.db.query(uid).create({ data });
          bucket.created++;
          return created.id;
        }
      } catch (err) {
        bucket.errors.push({ where, error: err.message });
        return null;
      }
    };

    // 1. Domains
    const domainIdByKey = {};
    for (const d of domains) {
      if (!d.key) continue;
      const id = await upsert(MODEL_UIDS.domains, { key: d.key }, {
        key: d.key,
        name: d.name || d.key,
        matchKey: d.matchKey || d.key,
        matchMode: d.matchMode || 'header',
        strapiRoleType: d.strapiRoleType || 'authenticated',
        blockDirectAccess: Boolean(d.blockDirectAccess ?? false),
        isActive: true
      }, results.domains);
      if (id) domainIdByKey[d.key] = id;
    }

    // 2. Roles
    const roleIdByKey = {};
    for (const r of roles) {
      if (!r.key) continue;
      const domainId = r.domainKey ? domainIdByKey[r.domainKey] : null;
      const id = await upsert(MODEL_UIDS.roles, { key: r.key }, {
        key: r.key,
        name: r.name || r.key,
        type: r.type || 'app',
        strapiRoleType: r.strapiRoleType || 'authenticated',
        isActive: true,
        domain: domainId ? { id: domainId } : null
      }, results.roles);
      if (id) roleIdByKey[r.key] = id;
    }

    // 3. Policies — link to resource by key if resourceKey is provided
    const policyIdByKey = {};
    for (const p of policies) {
      if (!p.key) continue;
      let resourceId = null;
      if (p.resourceKey) {
        const res = await strapi.db.query(MODEL_UIDS.resources).findOne({ where: { key: p.resourceKey } });
        resourceId = res?.id || null;
      }
      const id = await upsert(MODEL_UIDS.policies, { key: p.key }, {
        key: p.key,
        name: p.name || p.key,
        effect: p.effect || 'allow',
        actions: Array.isArray(p.actions) ? p.actions : [p.actions].filter(Boolean),
        conditions: p.conditions || {},
        resource: resourceId ? { id: resourceId } : null
      }, results.policies);
      if (id) policyIdByKey[p.key] = id;
    }

    // 4. Grants — link role → policy
    for (const g of grants) {
      const roleId   = roleIdByKey[g.roleKey];
      const policyId = policyIdByKey[g.policyKey];
      if (!roleId || !policyId) { results.grants.errors.push({ grant: g, error: 'role or policy not found' }); continue; }
      await upsert(MODEL_UIDS.grants, { role: { id: roleId }, policy: { id: policyId } }, {
        role: { id: roleId },
        policy: { id: policyId },
        isActive: true
      }, results.grants);
    }

    ctx.send({ data: results });
  },

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
