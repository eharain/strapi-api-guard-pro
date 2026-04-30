'use strict';

export default ({ strapi }) => ({
  async resolveAlias(aliasPath, method) {
    const resource = await strapi.db.query('plugin::api-guard-pro.resource').findOne({
      where: {
        aliasPath,
        method,
        isActive: true,
        type: 'alias'
      },
      populate: { domain: true }
    });
    
    if (!resource) return null;
    
    return {
      originalPath: resource.pathPattern,
      resource,
      requestRules: resource.requestRules || {}
    };
  },
  
  async getAllAliases(domainId = null) {
    const where = { type: 'alias', isActive: true };
    if (domainId) where.domain = domainId;
    
    return strapi.db.query('plugin::api-guard-pro.resource').findMany({
      where,
      populate: { domain: true }
    });
  }
});
