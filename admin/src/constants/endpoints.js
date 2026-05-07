export const API_BASE = '/api-guard-pro';

export const ENDPOINTS = {
  OVERVIEW: `${API_BASE}/overview`,
  ENTITIES: (entity) => `${API_BASE}/entities/${entity}`,
  ENTITY: (entity, id) => `${API_BASE}/entities/${entity}/${id}`,
  USERS: `${API_BASE}/users`,
  USER_ROLES: (userId) => `${API_BASE}/users/${userId}/roles`,
  STRAPI_TYPES: `${API_BASE}/strapi-content-types`,
  CLEAR_CACHE: `${API_BASE}/clear-cache`,
  RESOURCE_RECORDER: `${API_BASE}/resource-recorder`,
  RECORDER_LOGS: `${API_BASE}/resource-recorder/logs`,
  DATA_EXPORT: `${API_BASE}/data-transfer/export`,
  DATA_IMPORT: `${API_BASE}/data-transfer/import`,
};
