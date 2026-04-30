'use strict';

export default ({ strapi }) => ({
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
