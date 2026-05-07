'use strict';

const MODEL_UIDS = {
  domains: 'plugin::api-guard-pro.domain',
  resources: 'plugin::api-guard-pro.resource',
  roles: 'plugin::api-guard-pro.role',
  policies: 'plugin::api-guard-pro.policy',
  grants: 'plugin::api-guard-pro.grant',
  groups: 'plugin::api-guard-pro.group',
};

module.exports = ({ strapi }) => ({
  /**
   * Export all plugin data into a compact, non-repetitive JSON structure.
   * Relations are expressed as key references, not IDs.
   */
  async exportData() {
    const db = strapi.db;

    const [domains, resources, roles, policies, grants, groups] = await Promise.all([
      db.query(MODEL_UIDS.domains).findMany({ orderBy: { key: 'asc' } }),
      db.query(MODEL_UIDS.resources).findMany({ orderBy: { key: 'asc' }, populate: ['domain'] }),
      db.query(MODEL_UIDS.roles).findMany({ orderBy: { key: 'asc' }, populate: ['domain'] }),
      db.query(MODEL_UIDS.policies).findMany({ orderBy: { key: 'asc' }, populate: ['resource'] }),
      db.query(MODEL_UIDS.grants).findMany({ populate: ['role', 'policy'] }),
      db.query(MODEL_UIDS.groups).findMany({ orderBy: { key: 'asc' }, populate: ['domain', 'parentGroup'] }),
    ]);

    return {
      _meta: {
        exportedAt: new Date().toISOString(),
        version: '1',
        plugin: 'api-guard-pro',
      },
      domains: domains.map(d => ({
        key: d.key,
        name: d.name,
        description: d.description || undefined,
        isActive: d.isActive,
        strapiRoleType: d.strapiRoleType,
        matchMode: d.matchMode,
        matchKey: d.matchKey,
        blockDirectAccess: d.blockDirectAccess,
      })),
      resources: resources.map(r => ({
        key: r.key,
        'route-name': r['route-name'],
        displayName: r.displayName,
        description: r.description || undefined,
        type: r.type,
        method: r.method,
        pathPattern: r.pathPattern,
        aliasPath: r.aliasPath || undefined,
        contentTypeUid: r.contentTypeUid || undefined,
        controllerAction: r.controllerAction || undefined,
        isPublic: r.isPublic,
        isActive: r.isActive,
        effect: r.effect,
        domainKey: r.domain?.key || undefined,
      })),
      roles: roles.map(r => ({
        key: r.key,
        name: r.name,
        level: r.level,
        description: r.description || undefined,
        isActive: r.isActive,
        domainKey: r.domain?.key || undefined,
      })),
      groups: groups.map(g => ({
        key: g.key,
        name: g.name,
        description: g.description || undefined,
        isActive: g.isActive,
        isBundle: g.isBundle,
        domainKey: g.domain?.key || undefined,
        parentGroupKey: g.parentGroup?.key || undefined,
      })),
      policies: policies.map(p => ({
        key: p.key,
        name: p.name,
        description: p.description || undefined,
        actions: p.actions,
        effect: p.effect,
        conditions: p.conditions,
        fields: p.fields,
        priority: p.priority,
        isActive: p.isActive,
        resourceKey: p.resource?.key || undefined,
      })),
      grants: grants
        .filter(g => g.role?.key && g.policy?.key)
        .map(g => ({
          roleKey: g.role.key,
          policyKey: g.policy.key,
          isActive: g.isActive,
        })),
    };
  },

  /**
   * Import plugin data from a structured JSON payload.
   * @param {object} payload - The export JSON structure
   * @param {boolean} clean - If true, wipe all existing data before importing
   */
  async importData(payload, clean = false) {
    const db = strapi.db;
    const results = {
      domains: { created: 0, updated: 0, errors: [] },
      resources: { created: 0, updated: 0, errors: [] },
      roles: { created: 0, updated: 0, errors: [] },
      groups: { created: 0, updated: 0, errors: [] },
      policies: { created: 0, updated: 0, errors: [] },
      grants: { created: 0, updated: 0, errors: [] },
    };

    // Clean wipe if requested — order respects FK constraints
    if (clean) {
      await db.query(MODEL_UIDS.grants).deleteMany({ where: {} });
      await db.query(MODEL_UIDS.policies).deleteMany({ where: {} });
      await db.query(MODEL_UIDS.groups).deleteMany({ where: {} });
      await db.query(MODEL_UIDS.roles).deleteMany({ where: {} });
      await db.query(MODEL_UIDS.resources).deleteMany({ where: {} });
      await db.query(MODEL_UIDS.domains).deleteMany({ where: {} });
    }

    const upsert = async (model, where, data, bucket) => {
      try {
        const existing = await db.query(model).findOne({ where });
        if (existing) {
          await db.query(model).update({ where: { id: existing.id }, data });
          bucket.updated += 1;
          return existing.id;
        } else {
          const created = await db.query(model).create({ data });
          bucket.created += 1;
          return created.id;
        }
      } catch (err) {
        bucket.errors.push({ where, error: err.message });
        return null;
      }
    };

    const {
      domains = [],
      resources = [],
      roles = [],
      groups = [],
      policies = [],
      grants = [],
    } = payload;

    // 1. Domains
    const domainIdByKey = {};
    for (const d of domains) {
      if (!d.key) continue;
      const id = await upsert(MODEL_UIDS.domains, { key: d.key }, {
        key: d.key,
        name: d.name || d.key,
        description: d.description,
        isActive: d.isActive !== undefined ? d.isActive : true,
        strapiRoleType: d.strapiRoleType || 'authenticated',
        matchMode: d.matchMode || 'header',
        matchKey: d.matchKey || 'x-app-name',
        blockDirectAccess: d.blockDirectAccess || false,
      }, results.domains);
      if (id) domainIdByKey[d.key] = id;
    }

    // 2. Resources
    const resourceIdByKey = {};
    for (const r of resources) {
      if (!r.key) continue;
      const domainId = r.domainKey ? domainIdByKey[r.domainKey] : null;
      const data = {
        key: r.key,
        'route-name': r['route-name'] || r.key,
        displayName: r.displayName || r.key,
        description: r.description,
        type: r.type || 'standard',
        method: r.method || 'GET',
        pathPattern: r.pathPattern || `/${r.key}`,
        aliasPath: r.aliasPath,
        contentTypeUid: r.contentTypeUid,
        controllerAction: r.controllerAction,
        isPublic: r.isPublic || false,
        isActive: r.isActive !== undefined ? r.isActive : true,
        effect: r.effect,
      };
      if (domainId) data.domain = { id: domainId };
      const id = await upsert(MODEL_UIDS.resources, { key: r.key }, data, results.resources);
      if (id) resourceIdByKey[r.key] = id;
    }

    // 3. Roles
    const roleIdByKey = {};
    for (const r of roles) {
      if (!r.key) continue;
      const domainId = r.domainKey ? domainIdByKey[r.domainKey] : null;
      const data = {
        key: r.key,
        name: r.name || r.key,
        level: r.level || 'staff',
        description: r.description,
        isActive: r.isActive !== undefined ? r.isActive : true,
      };
      if (domainId) data.domain = { id: domainId };
      const id = await upsert(MODEL_UIDS.roles, { key: r.key }, data, results.roles);
      if (id) roleIdByKey[r.key] = id;
    }

    // 4. Groups (two-pass for parent references)
    const groupIdByKey = {};
    for (const g of groups) {
      if (!g.key) continue;
      const domainId = g.domainKey ? domainIdByKey[g.domainKey] : null;
      const data = {
        key: g.key,
        name: g.name || g.key,
        description: g.description,
        isActive: g.isActive !== undefined ? g.isActive : true,
        isBundle: g.isBundle || false,
      };
      if (domainId) data.domain = { id: domainId };
      const id = await upsert(MODEL_UIDS.groups, { key: g.key }, data, results.groups);
      if (id) groupIdByKey[g.key] = id;
    }
    // Second pass — wire parentGroup
    for (const g of groups) {
      if (!g.key || !g.parentGroupKey) continue;
      const parentId = groupIdByKey[g.parentGroupKey];
      const selfId = groupIdByKey[g.key];
      if (parentId && selfId) {
        try {
          await db.query(MODEL_UIDS.groups).update({ where: { id: selfId }, data: { parentGroup: { id: parentId } } });
        } catch (err) {
          results.groups.errors.push({ key: g.key, error: err.message });
        }
      }
    }

    // 5. Policies
    const policyIdByKey = {};
    for (const p of policies) {
      if (!p.key) continue;
      const resourceId = p.resourceKey ? resourceIdByKey[p.resourceKey] : null;
      const data = {
        key: p.key,
        name: p.name || p.key,
        description: p.description,
        actions: Array.isArray(p.actions) ? p.actions : ['read'],
        effect: p.effect || 'allow',
        conditions: p.conditions || [],
        fields: p.fields || [],
        priority: p.priority || 0,
        isActive: p.isActive !== undefined ? p.isActive : true,
      };
      if (resourceId) data.resource = { id: resourceId };
      const id = await upsert(MODEL_UIDS.policies, { key: p.key }, data, results.policies);
      if (id) policyIdByKey[p.key] = id;
    }

    // 6. Grants
    for (const g of grants) {
      const roleId = roleIdByKey[g.roleKey];
      const policyId = policyIdByKey[g.policyKey];
      if (!roleId || !policyId) {
        results.grants.errors.push({ grant: g, error: 'role or policy key not resolved' });
        continue;
      }
      await upsert(
        MODEL_UIDS.grants,
        { role: { id: roleId }, policy: { id: policyId } },
        { role: { id: roleId }, policy: { id: policyId }, isActive: g.isActive !== undefined ? g.isActive : true },
        results.grants
      );
    }

    return results;
  },
});
