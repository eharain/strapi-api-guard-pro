'use strict';

export default [
  {
    method: 'GET',
    path: '/overview',
    handler: 'admin.overview',
    config: { auth: false }
  },
  {
    method: 'GET',
    path: '/entities/:entity',
    handler: 'admin.list',
    config: { auth: false }
  },
  {
    method: 'POST',
    path: '/entities/:entity',
    handler: 'admin.create',
    config: { auth: false }
  },
  {
    method: 'PUT',
    path: '/entities/:entity/:id',
    handler: 'admin.update',
    config: { auth: false }
  },
  {
    method: 'DELETE',
    path: '/entities/:entity/:id',
    handler: 'admin.remove',
    config: { auth: false }
  },
  {
    method: 'GET',
    path: '/users',
    handler: 'admin.listUsers',
    config: { auth: false }
  },
  {
    method: 'PUT',
    path: '/users/:userId/roles',
    handler: 'admin.assignUserRoles',
    config: { auth: false }
  },
  {
    method: 'GET',
    path: '/strapi-content-types',
    handler: 'admin.strapiContentTypes',
    config: { auth: false }
  },
  {
    method: 'GET',
    path: '/clear-cache',
    handler: 'admin.clearCache',
    config: { auth: false }
  }
];
