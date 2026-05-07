'use strict';

/**
 * GET /api/api-guard-pro/me/permissions
 *
 * Returns the current user effective permissions driven from:
 *   up_users -> hr_employees (via user link) -> hr_teams (via member link)
 *   -> hr_teams.app_roles (array of guard role keys) -> guard_policies
 *
 * Response shape:
 * {
 *   user: { id, username, email },
 *   domains: [{ key, name, roleKey }],
 *   permissions: {
 *     "api::branch.branch": {
 *       "branch.find": { allowed: true, policies: [{ key, query, filters, body }] }
 *     }
 *   }
 * }
 */

module.exports = {
  async myPermissions(ctx) {
    // 1. Authenticate
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

    // 2. Resolve hr_employee for this user
    const hrEmployee = await strapi.db.query('api::hr-employee.hr-employee').findOne({
      where: { user: { id: user.id } },
      select: ['id'],
    });

    // 3. Load all teams the employee belongs to and collect guard role keys
    let guardRoleKeys = [];

    if (hrEmployee) {
      const teams = await strapi.db.query('api::hr-team.hr-team').findMany({
        where: { members: { id: hrEmployee.id } },
        select: ['id', 'app_roles'],
      });

      const allKeys = [];
      for (const team of teams) {
        const appRoles = team.app_roles;
        if (Array.isArray(appRoles)) {
          allKeys.push(...appRoles);
        }
      }
      guardRoleKeys = [...new Set(allKeys)];
    }

    // 4. Load matching guard roles with their domain
    let domainsOut = [];
    if (guardRoleKeys.length) {
      const guardRoles = await strapi.db.query('plugin::api-guard-pro.role').findMany({
        where: { key: { $in: guardRoleKeys }, isActive: true },
        populate: { domain: true },
      });

      domainsOut = guardRoles
        .filter((r) => r?.domain)
        .map((r) => ({
          key: r.domain.key,
          name: r.domain.name,
          roleKey: r.key,
        }));
    }

    // 5. Load all active policies granted to this user roles
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

    // 6. Shape into permissions map
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

    // 7. Respond
    ctx.send({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      domains: domainsOut,
      permissions,
    });
  },
};
