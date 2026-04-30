'use strict';

const OPERATORS = {
  eq: (a, b) => a === b,
  ne: (a, b) => a !== b,
  gt: (a, b) => a > b,
  gte: (a, b) => a >= b,
  lt: (a, b) => a < b,
  lte: (a, b) => a <= b,
  in: (a, b) => Array.isArray(b) && b.includes(a),
  nin: (a, b) => Array.isArray(b) && !b.includes(a),
  contains: (a, b) => String(a).toLowerCase().includes(String(b).toLowerCase()),
  startsWith: (a, b) => String(a).toLowerCase().startsWith(String(b).toLowerCase()),
  endsWith: (a, b) => String(a).toLowerCase().endsWith(String(b).toLowerCase())
};

const resolveToken = (value, context) => {
  if (typeof value !== 'string' || !value.startsWith('$')) return value;
  
  const parts = value.slice(1).split('.');
  let result = context;
  for (const part of parts) {
    if (result === undefined || result === null) return undefined;
    result = result[part];
  }
  return result;
};

export default ({ strapi }) => ({
  evaluate(conditions = [], context = {}) {
    if (!Array.isArray(conditions) || conditions.length === 0) return true;
    
    return conditions.every(condition => {
      const { field, operator, value } = condition;
      
      if (!field || !operator) return true;
      
      const fieldValue = resolveToken(field, context);
      const conditionValue = resolveToken(value, context);
      
      const operatorFn = OPERATORS[operator];
      if (!operatorFn) return true;
      
      return operatorFn(fieldValue, conditionValue);
    });
  }
});
