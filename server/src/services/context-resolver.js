'use strict';

const normalizeHeader = (value) => {
  if (Array.isArray(value)) return value[0];
  if (value === undefined || value === null) return '';
  return String(value).trim().toLowerCase();
};

// Per-request user access cache — mirrors the same pattern used in app-access-guard.
// Keyed by userId, TTL 60 s, cleared on each Strapi restart.
const userAccessCache = new Map();

async function loadUserAccess(strapi, userId) {
  const cached = userAccessCache.get(userId);
  if (cached && Date.now() - cached.ts < 60_000) return cached.data;

  const user = await strapi.query('plugin::users-permissions.user').findOne({
    where: { id: userId },
    populate: {
      role: { select: ['type'] },
      app_accesses: { select: ['key'] },
      admin_app_accesses: { select: ['key'] },
      api_guard_roles: {
        select: ['key', 'level'],
        populate: { domain: { select: ['key'] } },
      },
    },
  });

  const appKeys = (user?.app_accesses || []).map((a) => a.key).filter(Boolean);
  const adminKeys = (user?.admin_app_accesses || []).map((a) => a.key).filter(Boolean);
  const roleType = user?.role?.type || null;

  // Also expand api_guard_roles domain keys (same logic as app-access-guard
  // getEffectiveAppAccessFromUser, without importing pos-shared here).
  for (const pr of user?.api_guard_roles || []) {
    const dk = pr?.domain?.key;
    if (!dk) continue;
    if (pr.level === 'admin') {
      if (!adminKeys.includes(dk)) adminKeys.push(dk);
    } else {
      if (!appKeys.includes(dk)) appKeys.push(dk);
    }
  }

  const data = { appKeys, adminKeys, roleType };
  userAccessCache.set(userId, { data, ts: Date.now() });
  setTimeout(() => userAccessCache.delete(userId), 60_000);
  return data;
}

module.exports = ({ strapi }) => ({
  async resolve(ctx = {}) {
    const config = strapi.config.get('plugin::api-guard-pro');

    // ── Header key config — must match what Rutba front-end sends ────────
    // Default values are overridden in pos-strapi/config/plugins.js:
    //   headerDomainKey: 'x-rutba-app'
    //   headerElevatedKey: 'x-rutba-app-admin'
    const headerDomainKey = config.headerDomainKey || 'x-rutba-app';
    const domainQueryKey = config.domainQueryKey || '_domain';
    const headerElevatedKey = config.headerElevatedKey || 'x-rutba-app-admin';

    const headers = ctx.request?.headers || {};
    const user = ctx.state?.user || null;
    const query = ctx.query || {};

    // activeDomain — what app the client claims to be operating in
    const headerDomain = normalizeHeader(headers[headerDomainKey]);
    const queryDomain = normalizeHeader(query[domainQueryKey]);
    const activeDomain = headerDomain || queryDomain || null;

    // elevationHeader — the app key the client requests admin elevation for
    const elevationHeader = normalizeHeader(headers[headerElevatedKey]);

    // ── Load Rutba-specific user access from DB ───────────────────────────
    // app_accesses      → domains the user has regular access to
    // admin_app_accesses → domains the user can elevate to admin for
    let appKeys = [];
    let adminKeys = [];
    let roleType = null;

    if (user?.id) {
      try {
        ({ appKeys, adminKeys, roleType } = await loadUserAccess(strapi, user.id));
      } catch (err) {
        strapi.log.error('[api-guard-pro] context-resolver user access load failed:', err.message);
      }
    }

    // ── Elevation: user must have the requested app key in admin_app_accesses ─
    // Mirrors app-access-guard: elevationHeader must be a key the user actually
    // holds in admin_app_accesses; the header value is the app key string, not
    // a boolean — so we check membership rather than truthiness.
    const isElevated = Boolean(
      elevationHeader &&
      adminKeys.includes(elevationHeader)
    );

    // ── Guard roles (from plugin DB, optional — only used when grants are seeded) ─
    const guardRoles = user?.id
      ? await strapi.db.query('plugin::api-guard-pro.role').findMany({
          where: {
            users: { id: user.id },
            isActive: true,
            ...(activeDomain ? { domain: { key: activeDomain } } : {}),
          },
          populate: { domain: true },
        }).catch(() => [])
      : [];

    // ── Resolve guard domain record ───────────────────────────────────────
    const domain = activeDomain
      ? await strapi.db.query('plugin::api-guard-pro.domain').findOne({
          where: { key: activeDomain, isActive: true },
        }).catch(() => null)
      : null;

    return {
      user,
      activeDomain,
      domain,
      isElevated,
      roleType,
      // Rutba-specific — available to permission-engine and owner-scoping logic
      appKeys,
      adminKeys,
      // Guard-role list — used when guard grants are seeded
      guardRoles,
      teamIds: user?.teamIds || [],
    };
  },
});
