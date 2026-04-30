'use strict';

export const validateDomain = (data) => {
  const errors = [];
  
  if (!data.key) errors.push('key is required');
  if (data.key && !/^[a-z][a-z0-9-]*$/.test(data.key)) {
    errors.push('key must start with a letter and contain only lowercase letters, numbers, and hyphens');
  }
  if (!data.name) errors.push('name is required');
  if (data.matchMode && !['header', 'query', 'both'].includes(data.matchMode)) {
    errors.push('matchMode must be header, query, or both');
  }
  
  return errors;
};

export const validateResource = (data) => {
  const errors = [];
  
  if (!data.key) errors.push('key is required');
  if (!data.displayName) errors.push('displayName is required');
  if (!data.method || !['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(data.method)) {
    errors.push('method must be GET, POST, PUT, PATCH, or DELETE');
  }
  if (!data.pathPattern) errors.push('pathPattern is required');
  if (data.pathPattern && !data.pathPattern.startsWith('/')) {
    errors.push('pathPattern must start with /');
  }
  if (data.type && !['standard', 'extended', 'alias'].includes(data.type)) {
    errors.push('type must be standard, extended, or alias');
  }
  
  return errors;
};

export const validateRole = (data) => {
  const errors = [];
  
  if (!data.key) errors.push('key is required');
  if (!data.name) errors.push('name is required');
  if (!data.level || !['staff', 'manager', 'admin', 'super-admin'].includes(data.level)) {
    errors.push('level must be staff, manager, admin, or super-admin');
  }
  
  return errors;
};

export const validatePolicy = (data) => {
  const errors = [];
  
  if (!data.key) errors.push('key is required');
  if (!data.name) errors.push('name is required');
  if (!data.actions || !Array.isArray(data.actions) || data.actions.length === 0) {
    errors.push('actions must be a non-empty array');
  }
  if (data.effect && !['allow', 'deny'].includes(data.effect)) {
    errors.push('effect must be allow or deny');
  }
  
  return errors;
};

module.exports = {
  validateDomain,
  validateResource,
  validateRole,
  validatePolicy
};
