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

      // Map Strapi standard REST query params to their requestRules counterparts
      const parsedQueryRules = {};
      if (qp.filters && typeof qp.filters === 'object') parsedQueryRules.filters = qp.filters;
      if (qp.fields) {
        const f = qp.fields;
        parsedQueryRules.allowedFields = Array.isArray(f) ? f.map(String) : [String(f)];
      }
      if (qp.populate) {
        const p = qp.populate;
        parsedQueryRules.allowedPopulate = Array.isArray(p) ? p.map(String) : typeof p === 'object' ? Object.keys(p) : [String(p)];
      }
      if (qp.sort) parsedQueryRules.allowedSort = qp.sort;
      if (qp.pagination && typeof qp.pagination === 'object') parsedQueryRules.defaultPagination = qp.pagination;
      if (qp.locale) parsedQueryRules.allowedLocale = qp.locale;
      if (qp.status) parsedQueryRules.allowedStatus = qp.status;

      const baseRules = entry.suggestedRequestRules || {};
      const count = entry.count || 1;

      // ── Infer content type binding from the recorded path + method ──────────
      const inferredBinding = inferStrapiBinding(strapi, entry.method || 'GET', entry.path || '');

      // ── Convert raw recorded path to a route pattern (replace IDs with :id) ─
      const routePattern = inferredBinding.pathPattern || convertPathToPattern(entry.path || '');
      const routeName = (entry.method || 'get').toLowerCase() + '.' + routePattern.replace(/\//g, '.').replace(/[:{}]/g, '').replace(/\.+/g, '.').replace(/^\./, '') || 'root';

      return {
        // Identity
        key: entry.recordKey,
        displayName: entry.method + ' ' + routePattern,
        description: [
          `Suggested from recorder (${count} hit${count > 1 ? 's' : ''})`,
          entry.exampleUrl ? `Example URL: ${entry.exampleUrl}` : null,
          entry.lastStatus ? `Last status: ${entry.lastStatus}` : null
        ].filter(Boolean).join(' | '),

        // Type & method
        type: entry.matched ? 'extended' : 'standard',
        method: entry.method || 'GET',

        // Routing — use matched route pattern, not the raw recorded path
        pathPattern: routePattern,
        aliasPath: '',
        'route-name': routeName,

        // Strapi binding — inferred from route matching
        contentTypeUid: inferredBinding.contentTypeUid || '',
        'content-type-uid': inferredBinding.contentTypeUid || '',
        controllerAction: inferredBinding.controllerAction || '',

        // Defaults
        domain: null,
        parentResource: null,
        isPublic: false,
        isActive: true,
        effect: 'allow',

        // Rules — server-derived from recorded query params
        requestRules: { ...baseRules, ...parsedQueryRules, recordedUrlParts: entry.urlParts || null, recordedQueryParams: qp, recordedBodySample: entry.exampleBody || null },
        responseRules: {},
        matchCriteria: { method: entry.method || 'GET', pathPattern: entry.path || '', uri: entry.urlParts || null, queryParams: qp },
        requestMutation: { ...baseRules },
        responseMutation: { exampleQuery: entry.exampleQuery || null, exampleBody: entry.exampleBody || null },

        // Recorded metadata for the form UI
        recordedQueryParams: qp,
        recordedParsedQueryRules: parsedQueryRules,
        recordedRequestRaw: { method: entry.method, path: entry.path, url: entry.exampleUrl || null, query: entry.exampleQuery || {}, body: entry.exampleBody || null, status: entry.lastStatus != null ? entry.lastStatus : null },
        recordedRequestParsed: { uri: entry.urlParts || null, queryParams: qp, body: entry.exampleBody || null, requestRules: baseRules }
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

    // ── Promote all recordings → guard_resources ─────────────────────────
    // Converts every stored recording into a resource form via toResourceForm()
    // and upserts it into plugin::api-guard-pro.resource keyed on `key`.
    // Returns { created, updated, skipped, errors }.
    async promoteRecordings({ domainId = null, isPublic = false, isActive = true, overwrite = false } = {}) {
      const rows = await this.list();
      const results = { created: 0, updated: 0, skipped: 0, errors: [] };

      for (const entry of rows) {
        try {
          const form = this.toResourceForm(entry);
          if (!form.key || !form.method || !form.pathPattern) { results.skipped++; continue; }

          const existing = await strapi.db.query('plugin::api-guard-pro.resource').findOne({ where: { key: form.key } });

          const data = {
            key: form.key,
            displayName: form.displayName || form.key,
            description: form.description || null,
            method: form.method,
            pathPattern: form.pathPattern,
            aliasPath: form.aliasPath || null,
            contentTypeUid: form.contentTypeUid || null,
            isPublic: Boolean(isPublic),
            isActive: Boolean(isActive),
            effect: form.effect || 'allow',
            requestRules: form.requestRules || {},
            responseRules: form.responseRules || {},
            domain: domainId ? { id: domainId } : null
          };

          if (existing) {
            if (!overwrite) { results.skipped++; continue; }
            await strapi.db.query('plugin::api-guard-pro.resource').update({ where: { id: existing.id }, data });
            results.updated++;
          } else {
            await strapi.db.query('plugin::api-guard-pro.resource').create({ data });
            results.created++;
          }
        } catch (err) {
          results.errors.push({ key: entry.recordKey, error: err.message });
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
