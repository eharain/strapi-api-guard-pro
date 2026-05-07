'use strict';

const adminRoute = (method, path, handler) => ({
  method,
  path,
  handler,
  info: { type: 'admin' },
  config: { type: 'admin', auth: false },
});

module.exports = [
  // Overview
  adminRoute('GET', '/overview', 'admin.overview'),

  // CRUD over the 4 entities (domains | roles | resources | policies)
  adminRoute('GET',    '/entities/:entity',     'admin.list'),
  adminRoute('POST',   '/entities/:entity',     'admin.create'),
  adminRoute('PUT',    '/entities/:entity/:id', 'admin.update'),
  adminRoute('DELETE', '/entities/:entity/:id', 'admin.remove'),

  // Users (read-only)
  adminRoute('GET', '/users', 'admin.listUsers'),

  // Strapi catalog
  adminRoute('GET', '/strapi-content-types',     'admin.strapiContentTypes'),
  adminRoute('GET', '/resource-builder/catalog', 'admin.resourceBuilderCatalog'),

  // Resource recorder
  adminRoute('GET',    '/resource-recorder/to-resource/:recordKey', 'admin.recordingToResource'),
  adminRoute('GET',    '/resource-recorder/logs',                   'admin.listRecorderLogs'),
  adminRoute('GET',    '/resource-recorder',                        'admin.resourceRecorder'),
  adminRoute('PUT',    '/resource-recorder',                        'admin.setResourceRecorder'),
  adminRoute('DELETE', '/resource-recorder',                        'admin.clearResourceRecorder'),
  adminRoute('POST',   '/resource-recorder/promote',                'admin.promoteRecordings'),

  // Cache
  adminRoute('GET', '/clear-cache', 'admin.clearCache'),

  // Data transfer
  adminRoute('GET',  '/data-transfer/export', 'admin.exportData'),
  adminRoute('POST', '/data-transfer/import', 'admin.importData'),
];
