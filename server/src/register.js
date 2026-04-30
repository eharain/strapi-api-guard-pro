'use strict';

export default ({ strapi }) => {
  // Register plugin API
  strapi.apiGuard = {
    can: async (params) => {
      return strapi.service('plugin::api-guard-pro.permission-engine').can(params);
    },
    clearCache: (userId) => {
      return strapi.service('plugin::api-guard-pro.permission-engine').clearCache(userId);
    },
    clearAllCache: () => {
      return strapi.service('plugin::api-guard-pro.permission-engine').clearAllCache();
    }
  };

  strapi.log.info('[api-guard-pro] Plugin registered successfully');
};
