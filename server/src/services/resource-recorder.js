'use strict';

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

  const parseQuery = (url = '') => {
    const queryString = String(url || '').split('?')[1];
    if (!queryString) return {};

    const params = new URLSearchParams(queryString);
    const result = {};

    for (const [key, value] of params.entries()) {
      if (Object.prototype.hasOwnProperty.call(result, key)) {
        if (Array.isArray(result[key])) {
          result[key].push(value);
        } else {
          result[key] = [result[key], value];
        }
      } else {
        result[key] = value;
      }
    }

    return result;
  };

  const summarizeRequestRules = (method, query, body) => {
    const rules = {};

    if (String(method).toUpperCase() === 'GET' && query && Object.keys(query).length > 0) {
      if (query.filters || query['filters']) {
        rules.filters = query.filters || query['filters'];
      }

      if (query.populate || query['populate']) {
        const populate = query.populate || query['populate'];
        if (Array.isArray(populate)) {
          rules.allowedPopulate = populate;
        } else if (typeof populate === 'string') {
          rules.allowedPopulate = [populate];
        }
      }
    }

    if (body && typeof body === 'object' && Object.keys(body).length > 0) {
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
        requestRules: entry.suggestedRequestRules || {}
      }));
    },

    record(payload = {}) {
      if (!enabled) return null;

      const method = String(payload.method || '').toUpperCase();
      const methodKey = method.toLowerCase();
      const path = normalizePath(payload.path || payload.url || '/');
      const rawUrl = String(payload.url || '');
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
