'use strict';

module.exports = ({ strapi }) => {
  // Clear all caches on server shutdown
  const permissionEngine = strapi.service('plugin::api-guard-pro.permission-engine');
  if (permissionEngine) {
    permissionEngine.clearAllCache();
  }
  
  strapi.log.info('[api-guard-pro] Plugin destroyed, caches cleared');
};
