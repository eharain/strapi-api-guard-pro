'use strict';

module.exports = ({ strapi }) => ({
  process(body, resource) {
    if (!body || typeof body !== 'object') return body;
    
    const rules = resource.responseRules || {};
    let result = body;
    
    // Allow only specific fields
    if (Array.isArray(rules.allowedFields) && rules.allowedFields.length > 0) {
      result = this.filterFields(result, rules.allowedFields);
    }
    
    // Strip specific fields
    if (Array.isArray(rules.stripFields) && rules.stripFields.length > 0) {
      result = this.stripFields(result, rules.stripFields);
    }
    
    return result;
  },
  
  filterFields(data, allowedFields) {
    if (!data || typeof data !== 'object') return data;
    
    if (Array.isArray(data)) {
      return data.map(item => this.filterFields(item, allowedFields));
    }
    
    const filtered = {};
    for (const field of allowedFields) {
      if (data.hasOwnProperty(field)) {
        filtered[field] = this.filterFields(data[field], allowedFields);
      }
    }
    
    // Always include id if present
    if (data.id && !filtered.id) filtered.id = data.id;
    if (data.documentId && !filtered.documentId) filtered.documentId = data.documentId;
    
    return filtered;
  },
  
  stripFields(data, fieldsToStrip) {
    if (!data || typeof data !== 'object') return data;
    
    if (Array.isArray(data)) {
      return data.map(item => this.stripFields(item, fieldsToStrip));
    }
    
    const stripped = { ...data };
    for (const field of fieldsToStrip) {
      delete stripped[field];
    }
    
    return stripped;
  }
});

