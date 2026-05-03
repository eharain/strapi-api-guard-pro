'use strict';

const TRUTHY_VALUES = new Set(['1', 'true', 'yes', 'on']);

const normalizeHeader = (value) => {
  if (Array.isArray(value)) return value[0];
  if (value === undefined || value === null) return '';
  return String(value).trim();
};

module.exports = ({ strapi }) => ({
  async resolve(ctx = {}) {
    const config = strapi.config.get('plugin::api-guard-pro');
    const headerDomainKey = config.headerDomainKey || 'x-app-name';
    const domainQueryKey = config.domainQueryKey || '_domain';
    const headerElevatedKey = config.headerElevatedKey || 'x-app-admin';
    
    const headers = ctx.request?.headers || {};
    const user = ctx.state?.user || null;
    const query = ctx.query || {};
    
    const headerDomain = normalizeHeader(headers[headerDomainKey]);
    const queryDomain = normalizeHeader(query[domainQueryKey]);
    const activeDomain = headerDomain || queryDomain;
    
    const elevatedHeader = normalizeHeader(headers[headerElevatedKey]).toLowerCase();
    
    // Strapi users-permissions roles (from JWT payload) — kept for back-compat
    const roles = user?.permissionRoles || user?.permission_roles || [];
    const domainAdmin = roles.some(role => role?.level === 'admin' && role?.domain?.key === activeDomain);
    const superAdmin = roles.some(role => role?.level === 'super-admin');

    // Guard roles: query from DB — these are NOT present in the JWT payload
    const guardRoles = user?.id
      ? await strapi.db.query('plugin::api-guard-pro.role').findMany({
          where: {
            users: { id: user.id },
            isActive: true,
            ...(activeDomain ? { domain: { key: activeDomain } } : {})
          },
          populate: { domain: true }
        })
      : [];
    
    const domain = activeDomain
      ? await strapi.db.query('plugin::api-guard-pro.domain').findOne({
          where: { key: activeDomain, isActive: true }
        })
      : null;
    
    return {
      user,
      activeDomain,
      domain,
      isElevated: (TRUTHY_VALUES.has(elevatedHeader) && (domainAdmin || superAdmin)) || superAdmin,
      roles,
      guardRoles,
      teamIds: user?.teamIds || [],
    };
  }
});
