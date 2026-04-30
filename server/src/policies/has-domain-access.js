'use strict';

module.exports = async (policyCtx, config, { strapi }) => {
  const contextResolver = strapi.service('plugin::api-guard-pro.context-resolver');
  const context = await contextResolver.resolve(policyCtx);
  
  if (!context.activeDomain) {
    return false;
  }
  
  if (context.isElevated) {
    return true;
  }
  
  const hasDomainRole = context.roles.some(role => role.domain?.key === context.activeDomain);
  return hasDomainRole;
};
