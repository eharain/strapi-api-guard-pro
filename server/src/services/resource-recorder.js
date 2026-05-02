'use strict';

const qs = require('qs');

const RECORDING_UID = 'plugin::api-guard-pro.api-recording';

const DEFAULT_FILTERS = {
  methods: { get: true, post: true, put: true, delete: true },
  paths: { api: true, contentManager: true }
};

const DEFAULT_MAX_RECORDS = 500;
const DEFAULT_TIME_LIMIT_SECONDS = 0;

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
      return rows.map((entry) => ({
        ...entry,
        key: entry.recordKey,
        displayName: entry.method + ' ' + entry.path,
        type: entry.matched ? 'extended' : 'standard',
        pathPattern: entry.path,
        urlParts: entry.urlParts || null,
        queryParamsJson: entry.queryParamsJson || {},
        recordedRequestRaw: { method: entry.method, path: entry.path, url: entry.exampleUrl || null, query: entry.exampleQuery || {}, body: entry.exampleBody || null, status: entry.lastStatus != null ? entry.lastStatus : null },
        recordedRequestParsed: { uri: entry.urlParts || null, queryParams: entry.queryParamsJson || {}, body: entry.exampleBody || null, requestRules: entry.suggestedRequestRules || {} },
        requestRules: entry.suggestedRequestRules || {}
      }));
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
