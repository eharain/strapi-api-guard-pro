'use strict';

export default {
  default: {
    headerDomainKey: 'x-app-name',
    domainQueryKey: '_domain',
    headerElevatedKey: 'x-app-admin',
    denyByDefault: true,
    interceptorEnabled: true,
    bypassPaths: ['/admin', '/_health', '/documentation', '/uploads'],
    cacheTTL: 30000,
    enableAdminUI: true,
    enableLogging: true,
    logLevel: 'info',
    publicRoleType: 'public',
  },
  validator: (config) => {
    if (typeof config.headerDomainKey !== 'string' || config.headerDomainKey.length < 2) {
      throw new Error('headerDomainKey must be a non-empty string');
    }
    if (typeof config.denyByDefault !== 'boolean') {
      throw new Error('denyByDefault must be a boolean');
    }
    if (config.cacheTTL && (typeof config.cacheTTL !== 'number' || config.cacheTTL < 0)) {
      throw new Error('cacheTTL must be a non-negative number');
    }
    return config;
  }
};
