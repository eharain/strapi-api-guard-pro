'use strict';

module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    const contextResolver = strapi.service('plugin::api-guard-pro.context-resolver');
    const context = await contextResolver.resolve(ctx);
    
    // Attach domain info to state for use in other middleware
    ctx.state.activeDomain = context.activeDomain;
    ctx.state.domain = context.domain;
    ctx.state.isElevated = context.isElevated;
    
    await next();
  };
};
