'use strict';

const fs = require('fs');
const path = require('path');

const serviceFactory = require('../server/src/services/data-transfer');

const UIDS = {
  domain: 'plugin::api-guard-pro.domain',
  role: 'plugin::api-guard-pro.role',
  resource: 'plugin::api-guard-pro.resource',
  policy: 'plugin::api-guard-pro.policy',
};

const clone = (v) => JSON.parse(JSON.stringify(v));
const matchWhere = (row, where = {}) => Object.entries(where).every(([k, v]) => row[k] === v);

const modelStore = {
  [UIDS.domain]: [],
  [UIDS.role]: [],
  [UIDS.resource]: [],
  [UIDS.policy]: [],
};

const modelSeq = {
  [UIDS.domain]: 1,
  [UIDS.role]: 1,
  [UIDS.resource]: 1,
  [UIDS.policy]: 1,
};

const normalizeData = (uid, data = {}) => {
  const out = { ...data };
  if (uid === UIDS.role) {
    out.domainIds = Array.isArray(out.domains) ? out.domains.map((d) => d.id).filter(Boolean) : [];
    delete out.domains;
  }
  if (uid === UIDS.policy) {
    out.grantIds = Array.isArray(out.grants) ? out.grants.map((g) => g.id).filter(Boolean) : [];
    out.resourceId = out.resource?.id || null;
    delete out.grants;
    delete out.resource;
  }
  return out;
};

const db = {
  query(uid) {
    return {
      async findOne({ where }) {
        const row = modelStore[uid].find((r) => matchWhere(r, where));
        return row ? clone(row) : null;
      },
      async create({ data }) {
        const row = { id: modelSeq[uid]++, ...normalizeData(uid, data) };
        modelStore[uid].push(row);
        return clone(row);
      },
      async update({ where, data }) {
        const idx = modelStore[uid].findIndex((r) => matchWhere(r, where));
        if (idx < 0) return null;
        modelStore[uid][idx] = { ...modelStore[uid][idx], ...normalizeData(uid, data) };
        return clone(modelStore[uid][idx]);
      },
      async deleteMany() {
        modelStore[uid] = [];
      },
      async findMany() {
        if (uid === UIDS.domain) {
          return clone(modelStore[uid].map((d) => ({
            ...d,
            roles: modelStore[UIDS.role]
              .filter((r) => Array.isArray(r.domainIds) && r.domainIds.includes(d.id))
              .map((r) => ({ id: r.id, key: r.key, name: r.name })),
          })));
        }
        if (uid === UIDS.policy) {
          return clone(modelStore[uid].map((p) => ({
            ...p,
            resource: modelStore[UIDS.resource].find((r) => r.id === p.resourceId) || null,
            grants: modelStore[UIDS.role].filter((r) => (p.grantIds || []).includes(r.id)),
          })));
        }
        return clone(modelStore[uid]);
      },
    };
  },
};

(async () => {
  const payloadPath = 'D:/Rutba/ERP/packages/api-provider/config/configuration.json';
  const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));

  const service = serviceFactory({ strapi: { db } });

  const clean = await service.importData(payload, true);
  const merge = await service.importData(payload, false);
  const exported = await service.exportData();

  const summary = {
    clean,
    merge,
    exportedCounts: {
      domains: Object.keys(exported.domains || {}).length,
      roles: Object.keys(exported.roles || {}).length,
      resources: Object.keys(exported.resources || {}).length,
    },
    inputCounts: {
      domains: Object.keys(payload.domains || {}).length,
      roles: Object.keys(payload.roles || {}).length,
      resources: Object.keys(payload.resources || {}).length,
      publicResources: Object.keys(payload.publicResources || {}).length,
    },
  };

  console.log(JSON.stringify(summary, null, 2));
})();
