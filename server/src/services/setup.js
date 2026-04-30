'use strict';

export default ({ strapi }) => ({
  async ensureDefaults() {
    // Check if any domains exist
    const domainCount = await strapi.db.query('plugin::api-guard-pro.domain').count();
    
    if (domainCount === 0) {
      strapi.log.info('[api-guard-pro] No domains found, creating default domain');
      
      await strapi.db.query('plugin::api-guard-pro.domain').create({
        data: {
          key: 'default',
          name: 'Default Domain',
          description: 'Auto-created default domain',
          isActive: true,
          matchMode: 'header',
          matchKey: 'x-app-name'
        }
      });
    }
    
    strapi.log.info('[api-guard-pro] Setup completed');
  }
});
