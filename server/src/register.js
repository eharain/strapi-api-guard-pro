'use strict';

export default ({ strapi }) => {
  // Register plugin hooks and extend Strapi functionality

  // Extend Strapi's core API with guard functionality
  strapi.apiGuard = {
    can: (user, action, resource, context) => {
      return strapi.service('plugin::api-guard-pro.engine').can({ user, action, resource, context });
    },
    clearCache: () => {
      return strapi.service('plugin::api-guard-pro.cache').clearAll();
    }
  };

  strapi.log.info('[api-guard-pro] Plugin registered successfully');
};
