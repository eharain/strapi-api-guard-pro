'use strict';

/**
 * Permission engine for the api-guard-pro plugin.
 *
 * Authorization is driven entirely by the `policy` content-type:
 *
 *   policy { uid, contentTypeUid, actionName, key, isActive,
 *            grants m:n role, query, filters, body, resource m:1 }
 *
 * For a given (user, contentTypeUid, actionName) the engine returns all
 * matching policies. The caller (request/response interceptors) merges
 * `query` / `filters` / `body` from those policies onto the request.
 *
 * If no policy matches ? access is denied.
 */

const POLICY_UID = 'plugin::api-guard-pro.policy';
const ROLE_UID = 'plugin::api-guard-pro.role';
const USER_UID = 'plugin::users-permissions.user';

const cache = new Map();
let cacheTTL = 30000;

const buildCacheKey = (user, contentTypeUid, actionName) =>
  `${user?.id || 'anon'}::${contentTypeUid}::${actionName}`;

module.exports = ({ strapi }) => ({
  async findMatchingPolicies({ user, contentTypeUid, actionName }) {
    if (!contentTypeUid || !actionName) return [];

    const cacheKey = buildCacheKey(user, contentTypeUid, actionName);
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.t < cacheTTL) return hit.v;

    const userRoleKeys = await this.resolveUserRoleKeys(user);
    if (!userRoleKeys.length) {
      cache.set(cacheKey, { t: Date.now(), v: [] });
      return [];
    }

    const policies = await strapi.db.query(POLICY_UID).findMany({
      where: {
        contentTypeUid,
        actionName,
        isActive: true,
        grants: { key: { $in: userRoleKeys } },
      },
      populate: ['grants'],
    });

    cache.set(cacheKey, { t: Date.now(), v: policies });
    return policies;
  },

  async can({ user, contentTypeUid, actionName }) {
    const policies = await this.findMatchingPolicies({ user, contentTypeUid, actionName });
    return policies.length > 0;
  },

  async resolveUserRoleKeys(user) {
    if (!user) return [];

    const candidateKeys = new Set();

    // Preferred: plugin guard roles directly attached to the user.
    const directGuardRoles = Array.isArray(user.api_guard_roles)
      ? user.api_guard_roles
      : [];
    for (const gr of directGuardRoles) {
      if (gr?.key) candidateKeys.add(String(gr.key));
    }

    // If not already present on ctx.state.user, load from DB.
    if (!candidateKeys.size && user?.id) {
      const dbUser = await strapi.db.query(USER_UID).findOne({
        where: { id: user.id },
        populate: {
          api_guard_roles: { select: ['key'] },
        },
      }).catch(() => null);

      for (const gr of dbUser?.api_guard_roles || []) {
        if (gr?.key) candidateKeys.add(String(gr.key));
      }
    }

    // Backward-compatible fallback: users-permissions role names.
    const roleNames = []
      .concat(user.role?.name || [])
      .concat((user.roles || []).map((r) => r?.name))
      .filter(Boolean);
    for (const name of roleNames) {
      candidateKeys.add(String(name));
    }

    if (!candidateKeys.size) return [];

    const matches = await strapi.db.query(ROLE_UID).findMany({
      where: { key: { $in: Array.from(candidateKeys) }, isActive: true },
    });
    return Array.from(new Set(matches.map((r) => r.key)));
  },

  configure({ ttl } = {}) {
    if (typeof ttl === 'number') cacheTTL = ttl;
  },

  clearCache(userId) {
    if (!userId) {
      cache.clear();
      return;
    }
    for (const key of cache.keys()) {
      if (key.startsWith(`${userId}::`)) cache.delete(key);
    }
  },

  clearAllCache() {
    cache.clear();
  },
});
