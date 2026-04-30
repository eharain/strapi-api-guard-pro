'use strict';

const qs = require('qs');

const MAX_RECORDS = 500;

const DEFAULT_FILTERS = {
  methods: {
    get: true,
    post: true,
    put: true,
    delete: true
  },
  paths: {
    api: true,
    contentManager: true
  }
};

module.exports = () => {
  let enabled = false;
  let filters = JSON.parse(JSON.stringify(DEFAULT_FILTERS));
  const records = [];

  const normalizePath = (value = '') => {
    const input = String(value || '');
    return input.split('?')[0] || '/';
  };

  const getUrlParts = (url = '') => {
    const raw = String(url || '');
    const [pathnamePart, queryStringPart] = raw.split('?');
    const pathname = normalizePath(pathnamePart || '/');
    const queryString = queryStringPart || '';

    return {
      pathname,
      queryString,
      segments: pathname.split('/').filter(Boolean)
    };
  };

  const parseQuery = (url = '') => {
    const { queryString } = getUrlParts(url);
    if (!queryString) return {};

    return qs.parse(queryString, {
      ignoreQueryPrefix: true,
      depth: 20,
      arrayLimit: 100,
      allowDots: false
    });
  };

  const summarizeRequestRules = (method, query, body) => {
    const rules = {};
    const upperMethod = String(method).toUpperCase();

    if (query && typeof query === 'object' && Object.keys(query).length > 0) {
      if (query.filters || query['filters']) {
        rules.filters = query.filters || query['filters'];
      }

      if (query.fields || query['fields']) {
        const fields = query.fields || query['fields'];
        if (Array.isArray(fields)) {
          rules.allowedFields = fields.map((f) => String(f));
        } else if (typeof fields === 'string') {
          rules.allowedFields = [fields];
        }
      }

      if (query.populate || query['populate']) {
        const populate = query.populate || query['populate'];

        if (Array.isArray(populate)) {
          rules.allowedPopulate = populate.map((p) => String(p));
        } else if (typeof populate === 'string') {
          rules.allowedPopulate = [populate];
        } else if (typeof populate === 'object') {
          rules.allowedPopulate = Object.keys(populate);
        }
      }

      if (query.sort || query['sort']) {
        rules.allowedSort = query.sort || query['sort'];
      }

      if (query.pagination || query['pagination']) {
        rules.defaultPagination = query.pagination || query['pagination'];
      }

      if (query.status || query['status']) {
        rules.allowedStatus = query.status || query['status'];
      }

      if (query.locale || query['locale']) {
        rules.allowedLocale = query.locale || query['locale'];
      }
    }

    if ((upperMethod === 'POST' || upperMethod === 'PUT' || upperMethod === 'PATCH') && body && typeof body === 'object' && Object.keys(body).length > 0) {
      rules.forceBodyFields = body;
    }

    return rules;
  };

  const makeKey = (method, path) => `${String(method || '').toUpperCase()} ${normalizePath(path)}`;

  const shouldRecordPath = (path) => {
    if (filters.paths.api && path.startsWith('/api')) return true;
    if (filters.paths.contentManager && path.startsWith('/content-manager')) return true;
    return false;
  };

  return {
    isEnabled() {
      return enabled;
    },

    setEnabled(value) {
      enabled = Boolean(value);
      return enabled;
    },

    getFilters() {
      return JSON.parse(JSON.stringify(filters));
    },

    setFilters(value = {}) {
      const next = {
        methods: {
          ...filters.methods,
          ...(value.methods || {})
        },
        paths: {
          ...filters.paths,
          ...(value.paths || {})
        }
      };

      filters = {
        methods: {
          get: Boolean(next.methods.get),
          post: Boolean(next.methods.post),
          put: Boolean(next.methods.put),
          delete: Boolean(next.methods.delete)
        },
        paths: {
          api: Boolean(next.paths.api),
          contentManager: Boolean(next.paths.contentManager)
        }
      };

      return this.getFilters();
    },

    clear() {
      records.length = 0;
      return true;
    },

    list() {
      return records
        .slice()
        .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
    },

    suggestions() {
      return this.list().map((entry) => ({
        ...entry,
        key: `${entry.method.toLowerCase()}.${entry.path.replace(/^\/+/, '').replace(/[/:]+/g, '.').replace(/\.+/g, '.') || 'root'}`,
        displayName: `${entry.method} ${entry.path}`,
        type: entry.matched ? 'extended' : 'standard',
        pathPattern: entry.path,
        urlParts: entry.urlParts || null,
        queryParamsJson: entry.queryParamsJson || {},
        requestRules: entry.suggestedRequestRules || {}
      }));
    },

    record(payload = {}) {
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
      const existing = records.find((item) => item.key === key);

      if (existing) {
        existing.count += 1;
        existing.lastSeenAt = now;
        existing.lastStatus = Number(payload.status) || existing.lastStatus || null;
        existing.matched = Boolean(payload.matched);
        existing.exampleUrl = rawUrl || existing.exampleUrl;
        existing.urlParts = urlParts || existing.urlParts;
        existing.queryParamsJson = Object.keys(parsedQuery).length ? parsedQuery : existing.queryParamsJson;
        existing.exampleQuery = Object.keys(parsedQuery).length ? parsedQuery : existing.exampleQuery;
        existing.exampleBody = body || existing.exampleBody;
        if (Object.keys(suggestedRequestRules).length > 0) {
          existing.suggestedRequestRules = suggestedRequestRules;
        }
        return existing;
      }

      const next = {
        key,
        method,
        path,
        count: 1,
        firstSeenAt: now,
        lastSeenAt: now,
        lastStatus: Number(payload.status) || null,
        matched: Boolean(payload.matched),
        exampleUrl: rawUrl || null,
        urlParts,
        queryParamsJson: Object.keys(parsedQuery).length ? parsedQuery : {},
        exampleQuery: Object.keys(parsedQuery).length ? parsedQuery : null,
        exampleBody: body,
        suggestedRequestRules
      };

      records.push(next);
      if (records.length > MAX_RECORDS) {
        records.shift();
      }

      return next;
    },
  };
};
