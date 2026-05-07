'use strict';

module.exports = [
  {
    method: 'GET',
    path: '/overview',
    handler: 'admin.overview',
    info: { type: 'admin' },
    config: { type: 'admin', auth: false }
  },
  {
    method: 'GET',
    path: '/entities/:entity',
    handler: 'admin.list',
    info: { type: 'admin' },
    config: { type: 'admin', auth: false }
  },
  {
    method: 'POST',
    path: '/entities/:entity',
    handler: 'admin.create',
    info: { type: 'admin' },
    config: { type: 'admin', auth: false }
  },
  {
    method: 'PUT',
    path: '/entities/:entity/:id',
    handler: 'admin.update',
    info: { type: 'admin' },
    config: { type: 'admin', auth: false }
  },
  {
    method: 'DELETE',
    path: '/entities/:entity/:id',
    handler: 'admin.remove',
    info: { type: 'admin' },
    config: { type: 'admin', auth: false }
  },
  {
    method: 'GET',
    path: '/users',
    handler: 'admin.listUsers',
    info: { type: 'admin' },
    config: { type: 'admin', auth: false }
  },
  {
    method: 'PUT',
    path: '/users/:userId/roles',
    handler: 'admin.assignUserRoles',
    info: { type: 'admin' },
    config: { type: 'admin', auth: false }
  },
  {
    method: 'GET',
    path: '/strapi-content-types',
    handler: 'admin.strapiContentTypes',
    info: { type: 'admin' },
    config: { type: 'admin', auth: false }
  },
  {
    method: 'GET',
    path: '/resource-recorder/to-resource/:recordKey',
    handler: 'admin.recordingToResource',
    info: { type: 'admin' },
    config: { type: 'admin', auth: false }
  },
  {
    method: 'GET',
    path: '/resource-recorder/logs',
    handler: 'admin.listRecorderLogs',
    info: { type: 'admin' },
    config: { type: 'admin', auth: false }
  },
  {
    method: 'GET',
    path: '/resource-recorder',
    handler: 'admin.resourceRecorder',
    info: { type: 'admin' },
    config: { type: 'admin', auth: false }
  },
  {
    method: 'PUT',
    path: '/resource-recorder',
    handler: 'admin.setResourceRecorder',
    info: { type: 'admin' },
    config: { type: 'admin', auth: false }
  },
  {
    method: 'DELETE',
    path: '/resource-recorder',
    handler: 'admin.clearResourceRecorder',
    info: { type: 'admin' },
    config: { type: 'admin', auth: false }
  },
  {
    method: 'GET',
    path: '/resource-builder/catalog',
    handler: 'admin.resourceBuilderCatalog',
    info: { type: 'admin' },
    config: { type: 'admin', auth: false }
  },
  {
    method: 'GET',
    path: '/inspect',
    handler: 'admin.inspect',
    info: { type: 'admin' },
    config: { type: 'admin', auth: false }
  },
  {
    method: 'GET',
    path: '/clear-cache',
    handler: 'admin.clearCache',
    info: { type: 'admin' },
    config: { type: 'admin', auth: false }
  },
  {
    method: 'POST',
    path: '/resource-builder/promote-catalog',
    handler: 'admin.promoteCatalog',
    info: { type: 'admin' },
    config: { type: 'admin', auth: false }
  },
  {
    method: 'POST',
    path: '/resource-recorder/promote',
    handler: 'admin.promoteRecordings',
    info: { type: 'admin' },
    config: { type: 'admin', auth: false }
  },
  {
    method: 'POST',
    path: '/seed/from-metadata',
    handler: 'admin.seedFromMetadata',
    info: { type: 'admin' },
    config: { type: 'admin', auth: false }
  },
  {
    method: 'GET',
    path: '/data-transfer/export',
    handler: 'admin.exportData',
    info: { type: 'admin' },
    config: { type: 'admin', auth: false }
  },
  {
    method: 'POST',
    path: '/data-transfer/import',
    handler: 'admin.importData',
    info: { type: 'admin' },
    config: { type: 'admin', auth: false }
  }
];
