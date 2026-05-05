'use strict';

module.exports = {
  default: {
    headerDomainKey: 'x-app-name',
    domainQueryKey: '_domain',
    headerElevatedKey: 'x-app-admin',
    denyByDefault: true,
    interceptorEnabled: true,
    enforcementMode: 'enforce',
      bypassPaths: ['/admin', '/_health', '/documentation', '/upload', '/api-guard-pro', '/content-manager', '/i18n', '/users-permissions', '/api/auth', '/api/me'],
    cacheTTL: 30000,
    enableAdminUI: true,
    enableLogging: true,
    logLevel: 'info',
    publicRoleType: 'public',
    respectUsersPermissions: true,
  },
  validator: (config) => {
    if (typeof config.headerDomainKey !== 'string' || config.headerDomainKey.length < 2) {
      throw new Error('headerDomainKey must be a non-empty string');
    }
    if (typeof config.denyByDefault !== 'boolean') {
      throw new Error('denyByDefault must be a boolean');
    }
    const enforcementMode = String(config.enforcementMode || 'enforce');
    if (!['enforce', 'hybrid', 'observe'].includes(enforcementMode)) {
      throw new Error('enforcementMode must be one of: enforce, hybrid, observe');
    }
    if (config.cacheTTL && (typeof config.cacheTTL !== 'number' || config.cacheTTL < 0)) {
      throw new Error('cacheTTL must be a non-negative number');
    }
    if (typeof config.respectUsersPermissions !== 'boolean') {
      throw new Error('respectUsersPermissions must be a boolean');
    }
    return {
      ...config,
      enforcementMode
    };
  }
};
