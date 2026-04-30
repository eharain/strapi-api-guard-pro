'use strict';

module.exports = ({ strapi }) => ({
  buildFromConditions(conditions = [], context = {}) {
    if (!Array.isArray(conditions) || conditions.length === 0) return {};
    
    const filters = {};
    
    for (const condition of conditions) {
      const { field, operator, value } = condition;
      if (!field || !operator) continue;
      
      const resolvedValue = this.resolveToken(value, context);
      if (resolvedValue === undefined) continue;
      
      const filterOperator = this.mapOperator(operator);
      if (!filterOperator) continue;
      
      this.setNestedValue(filters, field, { [filterOperator]: resolvedValue });
    }
    
    return filters;
  },
  
  resolveToken(value, context) {
    if (typeof value !== 'string' || !value.startsWith('$')) return value;
    
    const parts = value.slice(1).split('.');
    let result = context;
    for (const part of parts) {
      if (result === undefined || result === null) return undefined;
      result = result[part];
    }
    return result;
  },
  
  mapOperator(operator) {
    const operatorMap = {
      eq: '$eq',
      ne: '$ne',
      gt: '$gt',
      gte: '$gte',
      lt: '$lt',
      lte: '$lte',
      in: '$in',
      nin: '$nin',
      contains: '$contains',
      startsWith: '$startsWith',
      endsWith: '$endsWith'
    };
    return operatorMap[operator];
  },
  
  setNestedValue(obj, path, value) {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      current[part] = current[part] || {};
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
  },
  
  withOwnership(filters = {}, context = {}, relationField = 'owners') {
    const config = strapi.config.get('plugin::api-guard-pro');
    if (!config.enforceOwnership || context.isElevated) return filters;
    if (!context.user?.id) return { $and: [filters, { id: { $eq: null } }] };
    
    const ownershipFilter = {
      [relationField]: { id: { $eq: context.user.id } }
    };
    
    if (Object.keys(filters).length === 0) return ownershipFilter;
    return { $and: [filters, ownershipFilter] };
  }
});
