'use strict';

const DEFAULT_ACTION_ALIASES = {
  read: ['find', 'findOne', 'get', 'search'],
  write: ['create', 'update', 'delete', 'put', 'patch', 'destroy'],
  manage: ['find', 'findOne', 'create', 'update', 'delete', 'get', 'post', 'put', 'patch']
};

const actionMatches = (requestedAction, policyActions = []) => {
  if (!Array.isArray(policyActions)) return false;
  if (policyActions.includes(requestedAction) || policyActions.includes('*')) return true;
  
  return Object.entries(DEFAULT_ACTION_ALIASES).some(([alias, actions]) =>
    alias === requestedAction && actions.some(action => policyActions.includes(action))
  );
};

// Permission cache
const cache = new Map();
let cacheTTL = 30000;

module.exports = ({ strapi }) => ({
  async can({ user, action, resourceUid, resourceKey, entity = null, context = {} }) {
    const config = strapi.config.get('plugin::api-guard-pro');
    const denyByDefault = config.denyByDefault !== false;
    cacheTTL = config.cacheTTL || 30000;
    
    if (!user) return denyByDefault ? false : true;
    
    const cacheKey = `${user.id}:${action}:${resourceKey || resourceUid}`;
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < cacheTTL) {
        return cached.result;
      }
      cache.delete(cacheKey);
    }
    
    try {
      // Get all grants with populated relations
      const grants = await strapi.db.query('plugin::api-guard-pro.grant').findMany({
        populate: {
          role: {
            populate: { domain: true }
          },
          policy: {
            populate: { resource: true }
          }
        }
      });
      
      const runtime = {
        user,
        entity,
        context,
        isElevated: Boolean(context.isElevated),
        activeDomain: context.activeDomain,
        teamIds: context.teamIds || [],
      };
      
      const conditionEvaluator = strapi.service('plugin::api-guard-pro.condition-evaluator');
      let allowed = false;
      
      for (const grant of grants) {
        const role = grant.role;
        const policy = grant.policy;
        
        if (!role || !policy) continue;
        
        // Domain filtering
        if (runtime.activeDomain && role.domain?.key && role.domain.key !== runtime.activeDomain) continue;
        
        // Resource matching — prefer resourceKey, fall back to contentTypeUid
        if (resourceKey) {
          if (policy.resource?.key && policy.resource.key !== resourceKey) continue;
        } else if (resourceUid) {
          if (policy.resource?.contentTypeUid && policy.resource.contentTypeUid !== resourceUid) continue;
        }
        
        // Action matching
        if (!actionMatches(action, policy.actions)) continue;
        
        // Condition evaluation
        const passed = conditionEvaluator.evaluate(policy.conditions || [], runtime);
        if (!passed) continue;
        
        // Deny takes precedence
        if (policy.effect === 'deny') {
          cache.set(cacheKey, { result: false, timestamp: Date.now() });
          return false;
        }
        
        allowed = true;
      }
      
      const result = allowed || !denyByDefault;
      cache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    } catch (err) {
      strapi.log.error('[permission-engine] Error:', err.message);
      return denyByDefault ? false : true;
    }
  },
  
  clearCache(userId) {
    if (userId) {
      for (const key of cache.keys()) {
        if (key.startsWith(`${userId}:`)) cache.delete(key);
      }
    }
    strapi.log.debug(`[permission-engine] Cache cleared for user: ${userId || 'all'}`);
  },
  
  clearAllCache() {
    cache.clear();
    strapi.log.debug('[permission-engine] Entire cache cleared');
  }
});
