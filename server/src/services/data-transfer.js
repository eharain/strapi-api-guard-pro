'use strict';

/**
 * Data transfer service for the api-guard-pro plugin.
 *
 * Mirrors docs/sample-import-export.json one-to-one with no normalization
 * layer. The 4 backing content-types are:
 *
 *   domain   (key)
 *   role     (key, domain m:1)
 *   resource (contentTypeUid)
 *   policy   (uid, contentTypeUid, actionName, key,
 *             grants m:n role, query, filters, body, resource m:1)
 */

const UIDS = {
  domain: 'plugin::api-guard-pro.domain',
  role: 'plugin::api-guard-pro.role',
  resource: 'plugin::api-guard-pro.resource',
  policy: 'plugin::api-guard-pro.policy',
};

const isObject = (v) => v && typeof v === 'object' && !Array.isArray(v);
const unique = (arr = []) => Array.from(new Set(arr.filter((v) => v != null)));

const buildPolicyUid = (contentTypeUid, actionName, key) =>
  `${contentTypeUid}.${actionName}.${key}`;

module.exports = ({ strapi }) => ({
  async exportData() {
    const db = strapi.db;

    const [domains, roles, resources, policies] = await Promise.all([
      db.query(UIDS.domain).findMany({ orderBy: { key: 'asc' }, populate: ['roles'] }),
      db.query(UIDS.role).findMany({ orderBy: { key: 'asc' }, populate: ['domain'] }),
      db.query(UIDS.resource).findMany({ orderBy: { contentTypeUid: 'asc' } }),
      db.query(UIDS.policy).findMany({
        orderBy: { uid: 'asc' },
        populate: ['resource', 'grants'],
      }),
    ]);

    const exportedDomains = {};
    for (const d of domains) {
      if (!d?.key) continue;
      exportedDomains[d.key] = {
        roles: unique((d.roles || []).map((r) => r.key)),
      };
    }

    const exportedRoles = {};
    for (const r of roles) {
      if (!r?.key) continue;
      exportedRoles[r.key] = {};
    }

    const exportedResources = {};
    for (const r of resources) {
      if (!r?.contentTypeUid) continue;
      exportedResources[r.contentTypeUid] = {};
    }

    for (const p of policies) {
      const ctUid = p.contentTypeUid || p.resource?.contentTypeUid;
      const action = p.actionName;
      if (!ctUid || !action) continue;

      if (!exportedResources[ctUid]) exportedResources[ctUid] = {};
      if (!exportedResources[ctUid][action]) exportedResources[ctUid][action] = { policies: [] };

      const entry = {
        key: p.key,
        grants: unique((p.grants || []).map((g) => g.key)),
      };
      if (isObject(p.query) && Object.keys(p.query).length) entry.query = p.query;
      if (isObject(p.filters) && Object.keys(p.filters).length) entry.filters = p.filters;
      if (isObject(p.body) && Object.keys(p.body).length) entry.body = p.body;

      exportedResources[ctUid][action].policies.push(entry);
    }

    return {
      domains: exportedDomains,
      roles: exportedRoles,
      resources: exportedResources,
    };
  },

  async importData(payload = {}, clean = false) {
    const db = strapi.db;
    const results = {
      domains: { created: 0, updated: 0, errors: [] },
      roles: { created: 0, updated: 0, errors: [] },
      resources: { created: 0, updated: 0, errors: [] },
      policies: { created: 0, updated: 0, errors: [] },
    };

    if (clean) {
      await db.query(UIDS.policy).deleteMany({ where: {} });
      await db.query(UIDS.resource).deleteMany({ where: {} });
      await db.query(UIDS.role).deleteMany({ where: {} });
      await db.query(UIDS.domain).deleteMany({ where: {} });
    }

    const upsert = async (uid, where, data, bucket) => {
      try {
        const existing = await db.query(uid).findOne({ where });
        if (existing) {
          await db.query(uid).update({ where: { id: existing.id }, data });
          bucket.updated += 1;
          return existing.id;
        }
        const created = await db.query(uid).create({ data });
        bucket.created += 1;
        return created.id;
      } catch (err) {
        bucket.errors.push({ where, error: err.message });
        return null;
      }
    };

    const domainsIn = isObject(payload.domains) ? payload.domains : {};
    const rolesIn = isObject(payload.roles) ? { ...payload.roles } : {};
    const resourcesIn = isObject(payload.resources) ? payload.resources : {};

    // 1. Domains
    const domainIdByKey = {};
    for (const [key, d] of Object.entries(domainsIn)) {
      if (!key) continue;
      const id = await upsert(
        UIDS.domain,
        { key },
        {
          key,
          name: d?.name || key,
          description: d?.description,
          isActive: d?.isActive !== undefined ? d.isActive : true,
        },
        results.domains,
      );
      if (id) domainIdByKey[key] = id;
    }

    // 2. Roles — derive each role's owning domain from domainsIn (first wins).
    const roleDomainKey = {};
    for (const [domainKey, d] of Object.entries(domainsIn)) {
      for (const roleKey of d?.roles || []) {
        if (!roleDomainKey[roleKey]) roleDomainKey[roleKey] = domainKey;
        if (!rolesIn[roleKey]) rolesIn[roleKey] = {};
      }
    }

    const roleIdByKey = {};
    for (const [key, r] of Object.entries(rolesIn)) {
      if (!key) continue;
      const domainKey = r?.domainKey || roleDomainKey[key];
      const data = {
        key,
        name: r?.name || key,
        description: r?.description,
        isActive: r?.isActive !== undefined ? r.isActive : true,
      };
      if (domainKey && domainIdByKey[domainKey]) {
        data.domain = { id: domainIdByKey[domainKey] };
      }
      const id = await upsert(UIDS.role, { key }, data, results.roles);
      if (id) roleIdByKey[key] = id;
    }

    // 3. Resources
    const resourceIdByCtUid = {};
    for (const [contentTypeUid, actions] of Object.entries(resourcesIn)) {
      if (!contentTypeUid || !isObject(actions)) continue;
      const id = await upsert(
        UIDS.resource,
        { contentTypeUid },
        {
          contentTypeUid,
          displayName: contentTypeUid,
          isActive: true,
        },
        results.resources,
      );
      if (id) resourceIdByCtUid[contentTypeUid] = id;
    }

    // 4. Policies
    for (const [contentTypeUid, actions] of Object.entries(resourcesIn)) {
      if (!isObject(actions)) continue;
      const resourceId = resourceIdByCtUid[contentTypeUid];

      for (const [actionName, actionData] of Object.entries(actions)) {
        const policyList = Array.isArray(actionData?.policies) ? actionData.policies : [];

        for (const p of policyList) {
          if (!p?.key) continue;
          const uid = buildPolicyUid(contentTypeUid, actionName, p.key);
          const grantIds = (p.grants || [])
            .map((roleKey) => roleIdByKey[roleKey])
            .filter(Boolean);

          const missing = (p.grants || []).filter((rk) => !roleIdByKey[rk]);
          if (missing.length) {
            results.policies.errors.push({
              uid,
              error: `unknown role keys: ${missing.join(', ')}`,
            });
          }

          const data = {
            uid,
            key: p.key,
            contentTypeUid,
            actionName,
            description: p.description,
            isActive: p.isActive !== undefined ? p.isActive : true,
            query: isObject(p.query) ? p.query : {},
            filters: isObject(p.filters) ? p.filters : {},
            body: isObject(p.body) ? p.body : {},
            grants: grantIds.map((id) => ({ id })),
          };
          if (resourceId) data.resource = { id: resourceId };

          await upsert(UIDS.policy, { uid }, data, results.policies);
        }
      }
    }

    return results;
  },
});
