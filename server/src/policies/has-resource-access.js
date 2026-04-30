'use strict';

export default async (policyCtx, config, { strapi }) => {
  const permissionEngine = strapi.service('plugin::api-guard-pro.permission-engine');
  const contextResolver = strapi.service('plugin::api-guard-pro.context-resolver');
  
  const context = await contextResolver.resolve(policyCtx);
  const action = policyCtx.method;
  const resourceUid = policyCtx.params?.entity;
  
  return permissionEngine.can({
    user: context.user,
    action,
    resourceUid,
    context
  });
};
