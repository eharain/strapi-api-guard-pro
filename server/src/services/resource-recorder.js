'use strict';

const qs = require('qs');

const RECORDING_UID = 'plugin::api-guard-pro.api-recording';

const DEFAULT_FILTERS = {
  methods: { get: true, post: true, put: true, delete: true },
  paths: { api: true, contentManager: true }
};

const DEFAULT_MAX_RECORDS = 500;
const DEFAULT_TIME_LIMIT_SECONDS = 0;

// Replace ID-like path segments with :id (UUIDs, numeric IDs, long document IDs)
const ID_SEGMENT = /^([a-f0-9]{8,}(?:-[a-f0-9\d]+)+|[a-z0-9]{20,}|[0-9]+)$/i;

function convertPathToPattern(path) {
  const segments = String(path || '').split('/');
  return segments.map(seg => ID_SEGMENT.test(seg) ? ':id' : seg).join('/') || '/';
}

// Match a path pattern string (with :param placeholders) against a concrete path
function matchRoutePattern(pattern, path) {
  const patParts = pattern.split('/');
  const pathParts = path.split('/');
  if (patParts.length !== pathParts.length) return false;
  return patParts.every((p, i) => p.startsWith(':') || p === pathParts[i]);
}

// Walk all Strapi content type routes and find the best match for method + path
function inferStrapiBinding(strapi, method, recordedPath) {
  const upperMethod = String(method || '').toUpperCase();
  const cleanPath = String(recordedPath || '').split('?')[0];

  // All api:: content types, keyed by uid
  const apiContentTypes = Object.values(strapi.contentTypes || {}).filter(
    ct => ct.uid && ct.uid.startsWith('api::')
  );

  // Build a map: pluralName -> contentType (for fallback matching)
  const byPluralName = {};
  apiContentTypes.forEach(ct => {
    const plural = ct.info && ct.info.pluralName;
    if (plural) byPluralName[plural] = ct;
  });

  // Collect all API routes from strapi.apis, annotated with their content type uid
  const allRoutes = [];
  try {
    Object.values(strapi.apis || {}).forEach(api => {
      Object.values(api.routes || {}).forEach(router => {
        (router.routes || []).forEach(r => allRoutes.push(r));
      });
    });
  } catch {}

  // Try to match method + path against a known Strapi route pattern
  let matched = null;
  for (const route of allRoutes) {
    if (String(route.method || '').toUpperCase() !== upperMethod) continue;
    const routePath = route.path || '';
    if (!routePath) continue;
    if (matchRoutePattern(routePath, cleanPath)) {
      matched = { routePath, handler: route.handler || '' };
      break;
    }
  }

  if (matched) {
    // Derive uid + action from handler string, e.g. "api::cms-page.cms-page.find"
    const handler = matched.handler;
    let contentTypeUid = '';
    let controllerAction = handler;

    if (handler && handler.startsWith('api::')) {
      // handler format: "api::<singularName>.<singularName>.<action>"
      const dotParts = handler.split('.');
      // uid = first two dot-parts joined: "api::<name>.<name>"
      if (dotParts.length >= 2) {
        const candidate = dotParts.slice(0, 2).join('.');
        // Verify it exists in strapi.contentTypes
        if (strapi.contentTypes[candidate]) {
          contentTypeUid = candidate;
        } else {
          // Try looking up by matching singularName from the handler
          const singularName = dotParts[0].replace('api::', '');
          const found = apiContentTypes.find(
            ct => ct.info && (ct.info.singularName === singularName || ct.uid === candidate)
          );
          if (found) contentTypeUid = found.uid;
        }
      }
    }

    return {
      contentTypeUid,
      controllerAction,
      pathPattern: matched.routePath,
    };
  }

  // Fallback: match by /api/<pluralName> prefix in the recorded path
  for (const ct of apiContentTypes) {
    const plural = ct.info && ct.info.pluralName;
    if (!plural) continue;
    const apiBase = `/api/${plural}`;
    if (cleanPath !== apiBase && !cleanPath.startsWith(apiBase + '/')) continue;

    const routePattern = convertPathToPattern(cleanPath);
    const suffix = cleanPath.slice(apiBase.length);
    const hasId = suffix.startsWith('/') && suffix.length > 1;
    // Extra segment after :id (e.g. /publish) becomes part of the action name
    const extraSegment = hasId ? suffix.replace(/^\/[^/]+/, '').replace(/^\//, '') : '';

    const actionMap = {
      GET: hasId ? 'findOne' : 'find',
      POST: extraSegment ? extraSegment : 'create',
      PUT: 'update',
      PATCH: 'update',
      DELETE: 'delete',
    };
    const action = actionMap[upperMethod] || 'custom';

    return {
      contentTypeUid: ct.uid,
      controllerAction: `${ct.uid}.${action}`,
      pathPattern: routePattern,
    };
  }

  return { contentTypeUid: '', controllerAction: '', pathPattern: convertPathToPattern(cleanPath) };
}

module.exports = ({ strapi }) => {
  let enabled = false;
  let filters = JSON.parse(JSON.stringify(DEFAULT_FILTERS));
  let maxRecords = DEFAULT_MAX_RECORDS;
  let timeLimitSeconds = DEFAULT_TIME_LIMIT_SECONDS;
  let startedAt = null;
  let autoStopTimer = null;

  const normalizePath = (value = '') => {
    const input = String(value || '');
    return input.split('?')[0] || '/';
  };

  const getUrlParts = (url = '') => {
    const raw = String(url || '');
    const [pathnamePart, queryStringPart] = raw.split('?');
    const pathname = normalizePath(pathnamePart || '/');
    const queryString = queryStringPart || '';
    const segments = pathname.split('/').filter(Boolean);
    return {
      fullUrl: raw, pathname, queryString, segments,
      apiPrefix: segments[0] || null, collection: segments[1] || null, identifier: segments[2] || null
    };
  };

  const parseQuery = (url = '') => {
    const { queryString } = getUrlParts(url);
    if (!queryString) return {};
    return qs.parse(queryString, { ignoreQueryPrefix: true, depth: 20, arrayLimit: 100, allowDots: false });
  };

  const summarizeRequestRules = (method, query, body) => {
    const rules = {};
    const upperMethod = String(method).toUpperCase();
    if (query && typeof query === 'object' && Object.keys(query).length > 0) {
      if (query.filters) rules.filters = query.filters;
      if (query.fields) { const f = query.fields; rules.allowedFields = Array.isArray(f) ? f.map(String) : [String(f)]; }
      if (query.populate) { const p = query.populate; rules.allowedPopulate = Array.isArray(p) ? p.map(String) : typeof p === 'object' ? Object.keys(p) : [String(p)]; }
      if (query.sort) rules.allowedSort = query.sort;
      if (query.pagination) rules.defaultPagination = query.pagination;
      if (query.status) rules.allowedStatus = query.status;
      if (query.locale) rules.allowedLocale = query.locale;
    }
    if ((upperMethod === 'POST' || upperMethod === 'PUT' || upperMethod === 'PATCH') && body && typeof body === 'object' && Object.keys(body).length > 0) {
      rules.forceBodyFields = body;
    }
    return rules;
  };

  const makeKey = (method, path) => String(method || '').toUpperCase() + ' ' + normalizePath(path);

  const shouldRecordPath = (path) => {
    if (filters.paths.api && path.startsWith('/api')) return true;
    if (filters.paths.contentManager && path.startsWith('/content-manager')) return true;
    return false;
  };

  const clearAutoStopTimer = () => {
    if (autoStopTimer) { clearTimeout(autoStopTimer); autoStopTimer = null; }
  };

  const stopRecording = () => {
    enabled = false; startedAt = null; clearAutoStopTimer();
  };

  const startAutoStopTimer = () => {
    clearAutoStopTimer();
    if (timeLimitSeconds > 0) {
      autoStopTimer = setTimeout(() => { stopRecording(); }, timeLimitSeconds * 1000);
    }
  };

  return {
    isEnabled() { return enabled; },

    getSettings() {
      return { enabled, filters: JSON.parse(JSON.stringify(filters)), maxRecords, timeLimitSeconds, startedAt };
    },

    setEnabled(value) {
      const next = Boolean(value);
      if (next && !enabled) { startedAt = new Date().toISOString(); startAutoStopTimer(); }
      else if (!next) { stopRecording(); return false; }
      enabled = next;
      return enabled;
    },

    getFilters() { return JSON.parse(JSON.stringify(filters)); },

    setFilters(value = {}) {
      const next = { methods: { ...filters.methods, ...(value.methods || {}) }, paths: { ...filters.paths, ...(value.paths || {}) } };
      filters = { methods: { get: Boolean(next.methods.get), post: Boolean(next.methods.post), put: Boolean(next.methods.put), delete: Boolean(next.methods.delete) }, paths: { api: Boolean(next.paths.api), contentManager: Boolean(next.paths.contentManager) } };
      return this.getFilters();
    },

    setMaxRecords(value) {
      const n = Number(value);
      maxRecords = Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_MAX_RECORDS;
      return maxRecords;
    },

    setTimeLimitSeconds(value) {
      const n = Number(value);
      timeLimitSeconds = Number.isFinite(n) && n >= 0 ? Math.floor(n) : DEFAULT_TIME_LIMIT_SECONDS;
      if (enabled) startAutoStopTimer();
      return timeLimitSeconds;
    },

    async clear() {
      clearAutoStopTimer();
      await strapi.db.query(RECORDING_UID).deleteMany({ where: {} });
      return true;
    },

    async list() {
      return await strapi.db.query(RECORDING_UID).findMany({ orderBy: { lastSeenAt: 'desc' } });
    },

    async suggestions() {
      const rows = await this.list();
      return rows.map((entry) => {
        const routePattern = convertPathToPattern(entry.path || '');
        return {
          ...entry,
          key: entry.recordKey,
          displayName: entry.method + ' ' + routePattern,
          type: entry.matched ? 'extended' : 'standard',
          pathPattern: routePattern,
          urlParts: entry.urlParts || null,
          queryParamsJson: entry.queryParamsJson || {},
          recordedRequestRaw: { method: entry.method, path: entry.path, url: entry.exampleUrl || null, query: entry.exampleQuery || {}, body: entry.exampleBody || null, status: entry.lastStatus != null ? entry.lastStatus : null },
          recordedRequestParsed: { uri: entry.urlParts || null, queryParams: entry.queryParamsJson || {}, body: entry.exampleBody || null, requestRules: entry.suggestedRequestRules || {} },
          requestRules: entry.suggestedRequestRules || {}
        };
      });
    },

    toResourceForm(entry) {
      const qp = (entry.queryParamsJson && typeof entry.queryParamsJson === 'object') ? entry.queryParamsJson : {};
      const body = entry.exampleBody && typeof entry.exampleBody === 'object' ? entry.exampleBody : null;
      const count = entry.count || 1;

      // ── Infer content type binding from the recorded path + method ──────────
      const inferredBinding = inferStrapiBinding(strapi, entry.method || 'GET', entry.path || '');
      const contentTypeUid = inferredBinding.contentTypeUid || '';

      // controllerAction is 'api::xx.xx.find' — actionName must be '<singular>.<action>'
      const handlerParts = String(inferredBinding.controllerAction || '').split('.');
      const actionName = handlerParts.length >= 3
        ? `${handlerParts[1]}.${handlerParts.slice(2).join('.')}`
        : '';

      // Build the policy.query payload from recorded REST query params.
      const query = {};
      if (qp.filters && typeof qp.filters === 'object') query.filters = qp.filters;
      if (qp.fields)     query.fields = Array.isArray(qp.fields) ? qp.fields.map(String) : [String(qp.fields)];
      if (qp.populate)   query.populate = qp.populate;
      if (qp.sort)       query.sort = qp.sort;
      if (qp.pagination && typeof qp.pagination === 'object') query.pagination = qp.pagination;

      const description = [
        `Suggested from recorder (${count} hit${count > 1 ? 's' : ''})`,
        entry.exampleUrl ? `Example URL: ${entry.exampleUrl}` : null,
        entry.lastStatus ? `Last status: ${entry.lastStatus}` : null,
      ].filter(Boolean).join(' | ');

      return {
        // Resource side
        contentTypeUid,
        displayName: contentTypeUid || (entry.method + ' ' + (entry.path || '')),
        description,
        isActive: true,

        // Action + suggested policy under the resource
        actionName,
        suggestedPolicy: {
          key: 'recorded',
          query,
          filters: {},
          body: body || {},
        },

        // Raw recording context (for UI)
        recordedQueryParams: qp,
        recordedRequestRaw: {
          method: entry.method,
          path: entry.path,
          url: entry.exampleUrl || null,
          query: entry.exampleQuery || {},
          body: entry.exampleBody || null,
          status: entry.lastStatus != null ? entry.lastStatus : null,
        },
      };
    },

    async record(payload = {}) {
      if (!enabled) return null;
      const method = String(payload.method || '').toUpperCase();
      const methodKey = method.toLowerCase();
      const path = normalizePath(payload.path || payload.url || '/');
      const rawUrl = String(payload.url || '');
      const urlParts = getUrlParts(rawUrl || path);
      const parsedQuery = (payload.query && typeof payload.query === 'object') ? payload.query : parseQuery(rawUrl);
      const body = payload.body && typeof payload.body === 'object' ? payload.body : null;
      const suggestedRequestRules = summarizeRequestRules(method, parsedQuery, body);

      if (!method || !path.startsWith('/')) return null;
      if (path.startsWith('/admin')) return null;
      if (!filters.methods[methodKey]) return null;
      if (!shouldRecordPath(path)) return null;

      const now = new Date().toISOString();
      const key = makeKey(method, path);
      const existing = await strapi.db.query(RECORDING_UID).findOne({ where: { recordKey: key } });

      if (!existing) {
        const currentCount = await strapi.db.query(RECORDING_UID).count();
        if (maxRecords > 0 && currentCount >= maxRecords) { stopRecording(); return null; }
      }

      const data = {
        recordKey: key, method, path, lastSeenAt: now,
        lastStatus: Number(payload.status) || null,
        matched: Boolean(payload.matched),
        exampleUrl: rawUrl || null,
        urlParts,
        queryParamsJson: Object.keys(parsedQuery).length ? parsedQuery : {},
        exampleQuery: Object.keys(parsedQuery).length ? parsedQuery : null,
        exampleBody: body,
        suggestedRequestRules
      };

      if (existing) {
        data.count = (existing.count || 1) + 1;
        if (!data.exampleUrl) data.exampleUrl = existing.exampleUrl;
        const qpKeys = data.queryParamsJson ? Object.keys(data.queryParamsJson) : [];
        if (!qpKeys.length) data.queryParamsJson = existing.queryParamsJson;
        if (!data.exampleQuery) data.exampleQuery = existing.exampleQuery;
        if (!data.exampleBody) data.exampleBody = existing.exampleBody;
        if (!Object.keys(suggestedRequestRules).length) data.suggestedRequestRules = existing.suggestedRequestRules;
        return await strapi.db.query(RECORDING_UID).update({ where: { id: existing.id }, data });
      }

      return await strapi.db.query(RECORDING_UID).create({ data: { ...data, count: 1, firstSeenAt: now } });
    },

    // ── Promote all recordings → resource + policy rows ────────────────────
    // Each unique contentTypeUid becomes (or updates) a resource. Each
    // unique (contentTypeUid, actionName) gets a suggested policy row.
    // Returns { resources: {...}, policies: {...} }.
    async promoteRecordings({ isActive = true, overwrite = false, grantRoleKeys = [] } = {}) {
      const rows = await this.list();
      const results = {
        resources: { created: 0, updated: 0, skipped: 0, errors: [] },
        policies:  { created: 0, updated: 0, skipped: 0, errors: [] },
      };

      const RES_UID = 'plugin::api-guard-pro.resource';
      const POL_UID = 'plugin::api-guard-pro.policy';
      const ROLE_UID = 'plugin::api-guard-pro.role';

      // Resolve grant role IDs once.
      let grantIds = [];
      if (Array.isArray(grantRoleKeys) && grantRoleKeys.length) {
        const roles = await strapi.db.query(ROLE_UID).findMany({ where: { key: { $in: grantRoleKeys } } });
        grantIds = roles.map((r) => ({ id: r.id }));
      }

      const resourceIdByCtUid = {};

      for (const entry of rows) {
        let form;
        try { form = this.toResourceForm(entry); } catch (err) {
          results.resources.errors.push({ key: entry.recordKey, error: err.message });
          continue;
        }

        if (!form.contentTypeUid || !form.actionName) {
          results.resources.skipped++;
          continue;
        }

        // 1. Upsert resource
        try {
          if (!resourceIdByCtUid[form.contentTypeUid]) {
            const existing = await strapi.db.query(RES_UID).findOne({ where: { contentTypeUid: form.contentTypeUid } });
            const data = {
              contentTypeUid: form.contentTypeUid,
              displayName: form.displayName || form.contentTypeUid,
              description: form.description || null,
              isActive: Boolean(isActive),
            };
            if (existing) {
              if (overwrite) {
                await strapi.db.query(RES_UID).update({ where: { id: existing.id }, data });
                results.resources.updated++;
              } else {
                results.resources.skipped++;
              }
              resourceIdByCtUid[form.contentTypeUid] = existing.id;
            } else {
              const created = await strapi.db.query(RES_UID).create({ data });
              resourceIdByCtUid[form.contentTypeUid] = created.id;
              results.resources.created++;
            }
          }
        } catch (err) {
          results.resources.errors.push({ key: form.contentTypeUid, error: err.message });
          continue;
        }

        // 2. Upsert suggested policy under (contentTypeUid, actionName)
        try {
          const sp = form.suggestedPolicy || {};
          const policyKey = sp.key || 'recorded';
          const uid = `${form.contentTypeUid}.${form.actionName}.${policyKey}`;
          const policyData = {
            uid,
            key: policyKey,
            contentTypeUid: form.contentTypeUid,
            actionName: form.actionName,
            description: form.description || null,
            isActive: Boolean(isActive),
            query: sp.query || {},
            filters: sp.filters || {},
            body: sp.body || {},
            resource: { id: resourceIdByCtUid[form.contentTypeUid] },
          };
          if (grantIds.length) policyData.grants = grantIds;

          const existingPolicy = await strapi.db.query(POL_UID).findOne({ where: { uid } });
          if (existingPolicy) {
            if (overwrite) {
              await strapi.db.query(POL_UID).update({ where: { id: existingPolicy.id }, data: policyData });
              results.policies.updated++;
            } else {
              results.policies.skipped++;
            }
          } else {
            await strapi.db.query(POL_UID).create({ data: policyData });
            results.policies.created++;
          }
        } catch (err) {
          results.policies.errors.push({ key: entry.recordKey, error: err.message });
        }
      }

      return results;
    },

    async listPaginated({ page = 1, pageSize = 20, search = '', method: methodFilter = '', matched = '' } = {}) {
      const pageNum = Math.max(1, Number(page) || 1);
      const pageSizeNum = Math.min(100, Math.max(1, Number(pageSize) || 20));
      const where = {};
      const conditions = [];
      if (search) { conditions.push({ $or: [{ path: { $contains: search } }, { recordKey: { $contains: search } }] }); }
      if (methodFilter) { conditions.push({ method: { $eq: methodFilter.toUpperCase() } }); }
      if (matched === 'true') conditions.push({ matched: { $eq: true } });
      if (matched === 'false') conditions.push({ matched: { $eq: false } });
      if (conditions.length > 0) { where.$and = conditions; }

      const [rows, total] = await Promise.all([
        strapi.db.query(RECORDING_UID).findMany({ where, orderBy: { lastSeenAt: 'desc' }, limit: pageSizeNum, offset: (pageNum - 1) * pageSizeNum }),
        strapi.db.query(RECORDING_UID).count({ where })
      ]);

      return {
        data: rows,
        meta: { page: pageNum, pageSize: pageSizeNum, total, pageCount: Math.max(1, Math.ceil(total / pageSizeNum)) }
      };
    }
  };
};
