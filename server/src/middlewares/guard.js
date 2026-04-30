'use strict';

module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    const interceptor = strapi.service('plugin::api-guard-pro.interceptor');
    if (interceptor) {
      await interceptor.intercept(ctx, next);
    } else {
      await next();
    }
  };
};
