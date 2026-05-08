'use strict';

const { extendUserRelation } = require('./content-types/role');

module.exports = ({ strapi }) => {
  try {
    extendUserRelation(strapi);
  } catch (err) {
    strapi.log.error('[api-guard-pro] Failed to extend user content-type:', err.message);
  }

  // Register global API surface
  strapi.apiGuard = {
    can: async (params) => {
      return strapi.service('plugin::api-guard-pro.permission-engine').can(params);
    },
    clearCache: (userId) => {
      return strapi.service('plugin::api-guard-pro.permission-engine').clearCache(userId);
    },
    clearAllCache: () => {
      return strapi.service('plugin::api-guard-pro.permission-engine').clearAllCache();
    },
  };

  strapi.log.info('[api-guard-pro] Plugin registered successfully');
};
