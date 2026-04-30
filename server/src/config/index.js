'use strict';

export default {
  default: {
    headerDomainKey: 'x-app-name',
    headerElevatedKey: 'x-app-admin',
    denyByDefault: true,
    interceptorEnabled: true,
    bypassPaths: ['/admin', '/_health', '/documentation', '/uploads'],
    cacheTTL: 30000, // 30 seconds
    enableAdminUI: true,
    enableLogging: true,
    logLevel: 'info', // debug, info, warn, error
  },
  validator: (config) => {
    if (typeof config.headerDomainKey !== 'string') {
      throw new Error('headerDomainKey must be a string');
    }
    if (typeof config.denyByDefault !== 'boolean') {
      throw new Error('denyByDefault must be a boolean');
    }
    return config;
  }
};
