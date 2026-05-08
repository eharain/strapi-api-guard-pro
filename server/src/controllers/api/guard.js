'use strict';

/**
 * GET|POST /api/api-guard-pro/me/permissions
 *
 * Returns the current user's effective AGP permissions.
 * Exposed on the public content-api (not admin) so frontend clients can call
 * it directly. Auth is handled manually via JWT so custom auth headers work.
 *
 * Only references content types owned by this plugin and the universal
 * plugin::users-permissions.user. No app-specific content types.
 *
 * Response shape:
 * {
 *   role: string,
 *   roleType: string,
 *   domains: [{ key, name, roleKey }],
 *   permissions: {
 *     "api::branch.branch": {
 *       "branch.find": { allowed: true, policies: [{ key, uid, query, filters, body }] }
 *     }
 *   },
 *   _debug?: {   // only present when ?debug=true
 *     userId: number,
 *     email: string,
 *     strapiRole: string,
 *     directRoleKeys: string[],
 *     activeGuardRoles: [{ key, domain }],
 *     policiesFound: number,
 *     diagnosis: string,
 *   }
 * }
 */

module.exports = {
  async myPermissions(ctx) {
    try {
      const debugMode = ctx.query?.debug === 'true';

      // 1. Authenticate via JWT manually (auth: false on route)
      let user = ctx.state?.user;
      if (!user) {
        try {
          const token = await strapi
            .plugin('users-permissions')
            .service('jwt')
            .getToken(ctx);
          if (token?.id) {
            user = await strapi
              .plugin('users-permissions')
              .service('user')
              .fetchAuthenticatedUser(token.id);
          }
        } catch (_) {}
      }
      if (!user || user.blocked) {
        return ctx.unauthorized('Authentication required');
      }

      // 2. Load user with Strapi role + directly assigned AGP permission_roles
      const fullUser = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: user.id },
        populate: {
          role: { select: ['type', 'name', 'id'] },
          api_guard_roles: { select: ['id', 'key'] },
        },
      });

      const roleType = fullUser?.role?.type;

      // 3. Collect role keys from direct api_guard_roles assignment (AGP-managed)
      const directRoleKeys = (fullUser?.api_guard_roles || []).map((r) => r.key).filter(Boolean);
      const guardRoleKeys = [...new Set(directRoleKeys)];

      // 4. Load matching active AGP roles with their domain
      let domains = [];
      let activeGuardRoles = [];
      if (guardRoleKeys.length) {
        const guardRoles = await strapi.db.query('plugin::api-guard-pro.role').findMany({
          where: { key: { $in: guardRoleKeys }, isActive: true },
          populate: { domain: true },
        });

        activeGuardRoles = guardRoles.map((r) => ({
          key: r.key,
          domain: r.domain ? { key: r.domain.key, name: r.domain.name } : null,
        }));

        domains = guardRoles
          .filter((r) => r?.domain)
          .map((r) => ({
            key: r.domain.key,
            name: r.domain.name,
            roleKey: r.key,
          }));
      }

      // 5. Load active policies granted to this user's roles
      let policies = [];
      if (guardRoleKeys.length) {
        policies = await strapi.db.query('plugin::api-guard-pro.policy').findMany({
          where: {
            isActive: true,
            grants: { key: { $in: guardRoleKeys } },
          },
          populate: ['grants', 'resource'],
        });
      }

      // 6. Build permissions map: { contentTypeUid: { action: { allowed, policies[] } } }
      const permissions = {};
      for (const policy of policies) {
        const ctUid = policy.contentTypeUid;
        const action = policy.actionName;
        if (!ctUid || !action) continue;

        if (!permissions[ctUid]) permissions[ctUid] = {};
        if (!permissions[ctUid][action]) {
          permissions[ctUid][action] = { allowed: true, policies: [] };
        }
        permissions[ctUid][action].policies.push({
          key: policy.key,
          uid: policy.uid,
          query: policy.query || {},
          filters: policy.filters || {},
          body: policy.body || {},
        });
      }

      // 7. Debug chain diagnosis
      let _debug;
      if (debugMode) {
        let diagnosis = 'OK — permissions resolved successfully';
        if (guardRoleKeys.length === 0) {
          diagnosis = 'NO ROLES — no permission_roles are directly assigned to this user. Use the AGP admin "User Assignments" tab to assign roles.';
        } else if (activeGuardRoles.length === 0) {
          diagnosis = 'NO MATCHING AGP ROLES — role keys [' + guardRoleKeys.join(', ') + '] do not match any active plugin::api-guard-pro.role records. Seed or create them.';
        } else if (policies.length === 0) {
          diagnosis = 'NO POLICIES — guard roles exist but no active policies are granted to [' + guardRoleKeys.join(', ') + ']. Assign policies in AGP admin.';
        }

        _debug = {
          userId: user.id,
          email: user.email,
          strapiRole: fullUser?.role?.name,
          directRoleKeys,
          activeGuardRoles,
          policiesFound: policies.length,
          diagnosis,
        };
      }

      // 8. Respond — pure AGP shape; app-specific fields (strapiPermissions,
      //    sessionTimeout) are the responsibility of the consuming app layer.
      const response = {
        role: fullUser?.role?.name,
        roleType,
        domains,
        permissions,
      };

      if (_debug) response._debug = _debug;

      ctx.send(response);
    } catch (err) {
      strapi.log.error('[api-guard-pro] Error fetching user permissions', err);
      ctx.internalServerError('Error fetching permissions');
    }
  },
};
