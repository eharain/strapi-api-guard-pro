'use strict';

const MODEL_UIDS = {
  domains: 'plugin::api-guard-pro.domain',
  resources: 'plugin::api-guard-pro.resource',
  roles: 'plugin::api-guard-pro.role',
  policies: 'plugin::api-guard-pro.policy',
  grants: 'plugin::api-guard-pro.grant',
  groups: 'plugin::api-guard-pro.group',
};

const FALLBACK_CONTENT_TYPE_UID = '__unbound__';
const MAX_POLICY_KEY_LENGTH = 5;

const unique = (values = []) => Array.from(new Set(values.filter((value) => value !== undefined && value !== null)));
const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

const sanitizeKeySegment = (value = '') => String(value)
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9._-]+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

const buildContentTypeKey = (contentTypeUid) => {
  const normalized = sanitizeKeySegment(contentTypeUid || FALLBACK_CONTENT_TYPE_UID);
  return normalized || FALLBACK_CONTENT_TYPE_UID;
};

const deriveContentTypeUid = (resource = {}) => {
  if (resource.contentTypeUid) return String(resource.contentTypeUid);
  const controllerAction = String(resource.controllerAction || '');
  const parts = controllerAction.split('.').filter(Boolean);
  if (parts.length >= 2 && parts[0].startsWith('api::')) return `${parts[0]}.${parts[1]}`;
  return FALLBACK_CONTENT_TYPE_UID;
};

const deriveActionName = (resource = {}) => {
  const controllerAction = String(resource.controllerAction || '').trim();
  if (controllerAction.includes('.')) {
    const parts = controllerAction.split('.').filter(Boolean);
    if (parts.length >= 3) {
      const controllerName = sanitizeKeySegment(parts[1]);
      const actionName = sanitizeKeySegment(parts[parts.length - 1]);
      if (controllerName && actionName) return `${controllerName}.${actionName}`;
    }
  }

  const routeName = String(resource['route-name'] || '').trim();
  if (routeName) return routeName;

  const method = sanitizeKeySegment(resource.method || 'action');
  const pathPart = String(resource.pathPattern || '')
    .split('/')
    .filter(Boolean)
    .map((segment) => sanitizeKeySegment(segment.replace(/^:/, '')))
    .filter(Boolean)
    .join('-');

  return sanitizeKeySegment(pathPart ? `${method}.${pathPart}` : method) || 'action';
};

const buildActionStorageKey = (contentTypeUid, actionName) => {
  const contentTypeKey = buildContentTypeKey(contentTypeUid);
  const actionKey = sanitizeKeySegment(String(actionName || 'action').replace(/\./g, '-')) || 'action';
  return `${contentTypeKey}.${actionKey}`;
};

const toShortPolicyKey = (value = '') => {
  const sanitized = sanitizeKeySegment(value).replace(/\./g, '').replace(/-/g, '');
  if (sanitized) return sanitized.slice(0, MAX_POLICY_KEY_LENGTH);
  return 'p001';
};

const cleanPolicyPayload = (policy = {}) => {
  const normalized = {
    key: toShortPolicyKey(policy.key || policy.name || 'p001'),
    grants: unique(policy.grants || policy.roleKeys || []),
  };

  if (isObject(policy.query)) normalized.query = policy.query;
  if (isObject(policy.filters)) normalized.filters = policy.filters;
  if (isObject(policy.body)) normalized.body = policy.body;

  return normalized;
};

const mergePolicyLists = (base = [], incoming = []) => {
  const map = new Map();
  [...base, ...incoming].forEach((policy) => {
    const key = toShortPolicyKey(policy?.key || 'p001');
    const previous = map.get(key) || { key, grants: [] };
    const current = cleanPolicyPayload(policy || {});
    map.set(key, {
      ...previous,
      ...current,
      grants: unique([...(previous.grants || []), ...(current.grants || [])]),
    });
  });

  return Array.from(map.values());
};

const normalizeDomainMap = (domains = {}, roles = {}) => {
  if (Array.isArray(domains)) {
    const map = {};
    domains.forEach((domain) => {
      if (!domain?.key) return;
      map[domain.key] = {
        roles: unique(domain.roles || []),
      };
    });
    return map;
  }

  const domainMap = isObject(domains) ? { ...domains } : {};
  Object.entries(roles || {}).forEach(([roleKey, roleData]) => {
    const domainKey = roleData?.domainKey;
    if (!domainKey) return;
    if (!domainMap[domainKey]) domainMap[domainKey] = { roles: [] };
    domainMap[domainKey].roles = unique([...(domainMap[domainKey].roles || []), roleKey]);
  });
  return domainMap;
};

const normalizeRoleMap = (roles = []) => {
  if (isObject(roles)) return roles;

  const map = {};
  if (Array.isArray(roles)) {
    roles.forEach((role) => {
      if (!role?.key) return;
      map[role.key] = {
        name: role.name,
        level: role.level,
        domainKey: role.domainKey,
      };
    });
  }
  return map;
};

const normalizeResourceMap = (resources = []) => {
  if (isObject(resources)) return resources;

  const grouped = normalizeLegacyResourceGroups(resources);
  const resourceMap = {};
  grouped.forEach((group) => {
    const contentTypeUid = group?.contentTypeUid || FALLBACK_CONTENT_TYPE_UID;
    if (!resourceMap[contentTypeUid]) resourceMap[contentTypeUid] = {};

    (group.actions || []).forEach((action) => {
      const actionName = action?.action || deriveActionName(action);
      resourceMap[contentTypeUid][actionName] = {
        policies: (action?.policies || []).map(cleanPolicyPayload),
      };
    });
  });

  return resourceMap;
};

const normalizeLegacyResourceGroups = (resources = []) => {
  if (!Array.isArray(resources)) return [];

  const hasGroupedShape = resources.some((resource) => Array.isArray(resource?.actions));
  if (hasGroupedShape) return resources;

  const byContentType = new Map();
  for (const resource of resources) {
    const contentTypeUid = resource?.contentTypeUid || FALLBACK_CONTENT_TYPE_UID;
    if (!byContentType.has(contentTypeUid)) {
      byContentType.set(contentTypeUid, {
        key: buildContentTypeKey(contentTypeUid),
        contentTypeUid,
        domainKey: resource?.domainKey,
        actions: [],
      });
    }

    const group = byContentType.get(contentTypeUid);
    group.actions.push({
      ...resource,
      action: resource?.action || deriveActionName(resource),
      key: resource?.key || buildActionStorageKey(contentTypeUid, deriveActionName(resource)),
    });
  }

  return Array.from(byContentType.values());
};

module.exports = ({ strapi }) => ({
  /**
   * Export all plugin data into a compact, non-repetitive JSON structure.
   * Relations are expressed as key references, not IDs.
   */
  async exportData() {
    const db = strapi.db;

    const [domains, resources, roles, policies, grants] = await Promise.all([
      db.query(MODEL_UIDS.domains).findMany({ orderBy: { key: 'asc' } }),
      db.query(MODEL_UIDS.resources).findMany({ orderBy: { key: 'asc' }, populate: ['domain'] }),
      db.query(MODEL_UIDS.roles).findMany({ orderBy: { key: 'asc' }, populate: ['domain'] }),
      db.query(MODEL_UIDS.policies).findMany({ orderBy: { key: 'asc' }, populate: ['resource'] }),
      db.query(MODEL_UIDS.grants).findMany({ populate: ['role', 'policy'] }),
    ]);

    const roleByKey = new Map(roles.map((role) => [role.key, role]));
    const policyRoleKeys = new Map();
    for (const grant of grants) {
      const policyId = grant?.policy?.id;
      const roleKey = grant?.role?.key;
      if (!policyId || !roleKey) continue;
      if (!policyRoleKeys.has(policyId)) policyRoleKeys.set(policyId, new Set());
      policyRoleKeys.get(policyId).add(roleKey);
    }

    const policiesByResourceId = new Map();
    for (const policy of policies) {
      const resourceId = policy?.resource?.id;
      if (!resourceId) continue;
      if (!policiesByResourceId.has(resourceId)) policiesByResourceId.set(resourceId, []);
      policiesByResourceId.get(resourceId).push(policy);
    }

    const resourceGroupsMap = new Map();
    for (const resource of resources) {
      const contentTypeUid = resource.contentTypeUid || FALLBACK_CONTENT_TYPE_UID;
      const groupKey = buildContentTypeKey(contentTypeUid);
      const domainKey = resource.domain?.key || undefined;
      const actionName = buildActionName(resource);
      const actionKey = buildResourceActionKey(contentTypeUid, actionName);

      if (!resourceGroupsMap.has(groupKey)) {
        resourceGroupsMap.set(groupKey, {
          key: groupKey,
          contentTypeUid: contentTypeUid === FALLBACK_CONTENT_TYPE_UID ? undefined : contentTypeUid,
          actions: [],
        });
      }

      const group = resourceGroupsMap.get(groupKey);
      if (!group.domainKey && domainKey) group.domainKey = domainKey;

      const resourcePolicies = (policiesByResourceId.get(resource.id) || []).map((policy) => ({
        key: policy.key,
        name: policy.name,
        description: policy.description || undefined,
        effect: policy.effect,
        actions: Array.isArray(policy.actions) ? policy.actions : [],
        conditions: policy.conditions || [],
        fields: policy.fields || [],
        priority: policy.priority ?? 0,
        isActive: policy.isActive,
        roleKeys: Array.from(policyRoleKeys.get(policy.id) || []),
      }));

      const roleIds = unique(resourcePolicies.flatMap((policy) => policy.roleKeys))
        .map((roleKey) => roleByKey.get(roleKey)?.id)
        .filter(Boolean);

      const nextAction = {
        key: actionKey,
        action: actionName,
        displayName: resource.displayName,
        description: resource.description || undefined,
        type: resource.type,
        method: resource.method,
        pathPattern: resource.pathPattern,
        aliasPath: resource.aliasPath || undefined,
        controllerAction: resource.controllerAction || undefined,
        routeName: resource['route-name'] || undefined,
        isPublic: resource.isPublic,
        isActive: resource.isActive,
        effect: resource.effect,
        domainKey,
        roleIds,
        policies: resourcePolicies,
      };

      const existingAction = group.actions.find((action) => action.key === actionKey);
      if (existingAction) {
        existingAction.roleIds = unique([...(existingAction.roleIds || []), ...roleIds]);
        existingAction.policies = unique([
          ...(existingAction.policies || []).map((policy) => policy.key),
          ...resourcePolicies.map((policy) => policy.key),
        ]).map((policyKey) => {
          return (existingAction.policies || []).find((policy) => policy.key === policyKey)
            || resourcePolicies.find((policy) => policy.key === policyKey);
        }).filter(Boolean);
      } else {
        group.actions.push(nextAction);
      }
    }

    const resourcesGrouped = Array.from(resourceGroupsMap.values())
      .map((group) => ({
        ...group,
        actions: group.actions.sort((a, b) => String(a.key).localeCompare(String(b.key))),
      }))
      .sort((a, b) => String(a.key).localeCompare(String(b.key)));

    return {
      _meta: {
        exportedAt: new Date().toISOString(),
        version: '2',
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
      roles: roles.map(r => ({
        id: r.id,
        key: r.key,
        name: r.name,
        level: r.level,
        description: r.description || undefined,
        isActive: r.isActive,
        domainKey: r.domain?.key || undefined,
      })),
      resources: resourcesGrouped,
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
      policies: { created: 0, updated: 0, errors: [] },
      grants: { created: 0, updated: 0, errors: [] },
    };

    // Clean wipe if requested — order respects FK constraints
    if (clean) {
      await db.query(MODEL_UIDS.grants).deleteMany({ where: {} });
      await db.query(MODEL_UIDS.policies).deleteMany({ where: {} });
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
      policies = [],
      grants = [],
    } = payload;

    const groupedResources = normalizeLegacyResourceGroups(resources);

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

    // 2. Roles
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

    const roleKeyById = {};
    for (const role of roles) {
      if (role?.id && role?.key) roleKeyById[role.id] = role.key;
    }

    // 3. Resources (from grouped content type actions)
    const resourceIdByKey = {};
    const normalizedActions = [];

    for (const group of groupedResources) {
      const groupDomainKey = group?.domainKey;
      const contentTypeUid = group?.contentTypeUid || group?.key || FALLBACK_CONTENT_TYPE_UID;
      const actions = Array.isArray(group?.actions) ? group.actions : [];

      for (const action of actions) {
        const actionName = action?.action || buildActionName(action);
        const resourceKey = action?.key || buildResourceActionKey(contentTypeUid, actionName);
        if (!resourceKey) continue;

        const resolvedDomainKey = action?.domainKey || groupDomainKey;
        const domainId = resolvedDomainKey ? domainIdByKey[resolvedDomainKey] : null;

        const data = {
          key: resourceKey,
          'route-name': action?.routeName || action?.['route-name'] || resourceKey,
          displayName: action?.displayName || actionName || resourceKey,
          description: action?.description,
          type: action?.type || 'standard',
          method: action?.method || 'GET',
          pathPattern: action?.pathPattern || `/${resourceKey}`,
          aliasPath: action?.aliasPath,
          contentTypeUid: contentTypeUid === FALLBACK_CONTENT_TYPE_UID ? null : contentTypeUid,
          controllerAction: action?.controllerAction,
          isPublic: action?.isPublic === true,
          isActive: action?.isActive !== undefined ? action.isActive : true,
          effect: action?.effect || 'allow',
        };
        if (domainId) data.domain = { id: domainId };

        const id = await upsert(MODEL_UIDS.resources, { key: resourceKey }, data, results.resources);
        if (!id) continue;
        resourceIdByKey[resourceKey] = id;

        normalizedActions.push({
          ...action,
          key: resourceKey,
          action: actionName,
          contentTypeUid,
        });
      }
    }

    // 4. Policies (action-level first, then legacy payload fallback)
    const policyIdByKey = {};
    const generatedPolicies = [];

    for (const action of normalizedActions) {
      const actionPolicies = Array.isArray(action?.policies) ? action.policies : [];
      for (const policy of actionPolicies) {
        const roleKeys = unique([
          ...(Array.isArray(policy?.roleKeys) ? policy.roleKeys : []),
          ...(Array.isArray(policy?.roleIds) ? policy.roleIds.map((id) => roleKeyById[id]) : []),
          ...(Array.isArray(action?.roleKeys) ? action.roleKeys : []),
          ...(Array.isArray(action?.roleIds) ? action.roleIds.map((id) => roleKeyById[id]) : []),
        ]);

        generatedPolicies.push({
          key: policy?.key || `${action.key}.policy.${sanitizeKeySegment(policy?.name || 'default')}`,
          name: policy?.name || `${action.displayName || action.action || action.key} Policy`,
          description: policy?.description,
          actions: Array.isArray(policy?.actions) ? policy.actions : ['read'],
          effect: policy?.effect || action?.effect || 'allow',
          conditions: policy?.conditions || [],
          fields: policy?.fields || [],
          priority: policy?.priority || 0,
          isActive: policy?.isActive !== undefined ? policy.isActive : true,
          resourceKey: action.key,
          roleKeys,
        });
      }
    }

    const policiesToImport = generatedPolicies.length > 0
      ? generatedPolicies
      : (Array.isArray(policies) ? policies : []);

    for (const p of policiesToImport) {
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

    // 5. Grants (generated from action-level policy role assignments)
    const generatedGrants = [];
    for (const p of generatedPolicies) {
      for (const roleKey of p.roleKeys || []) {
        generatedGrants.push({
          roleKey,
          policyKey: p.key,
          isActive: true,
        });
      }
    }

    const grantsToImport = generatedGrants.length > 0
      ? generatedGrants
      : (Array.isArray(grants) ? grants : []);

    for (const g of grantsToImport) {
      const roleKey = g?.roleKey || roleKeyById[g?.roleId];
      const roleId = roleKey ? roleIdByKey[roleKey] : null;
      const policyId = policyIdByKey[g.policyKey];
      if (!roleId || !policyId) {
        results.grants.errors.push({ grant: g, error: 'role or policy key not resolved' });
        continue;
      }

      const grantKey = `${roleKey}.${g.policyKey}`;
      await upsert(
        MODEL_UIDS.grants,
        { key: grantKey },
        {
          key: grantKey,
          role: { id: roleId },
          policy: { id: policyId },
          isActive: g.isActive !== undefined ? g.isActive : true,
        },
        results.grants
      );
    }

    return results;
  },
});
