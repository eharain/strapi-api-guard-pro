'use strict';

import schema from './schema.json';

export default {
  schema,
  lifecycles: {
    async beforeDelete(event) {
      const { where } = event.params;
      const resourceId = where.id;
      
      // Find all policies linked to this resource
      const policies = await strapi.db.query('plugin::api-guard-pro.policy').findMany({
        where: { resource: resourceId },
        select: ['id']
      });
      
      const policyIds = policies.map(p => p.id);
      
      // Delete grants linked to those policies
      if (policyIds.length > 0) {
        await strapi.db.query('plugin::api-guard-pro.grant').deleteMany({
          where: { policy: { $in: policyIds } }
        });
        
        // Delete the policies
        await strapi.db.query('plugin::api-guard-pro.policy').deleteMany({
          where: { id: { $in: policyIds } }
        });
      }
      
      // Delete child resources (selected-field subsets)
      await strapi.db.query('plugin::api-guard-pro.resource').deleteMany({
        where: { parentResource: resourceId }
      });
    }
  }
};
