'use strict';

const adminRoutes = require('./admin');
const guardRoutes = require('./api/guard');

module.exports = {
  admin: {
    type: 'admin',
    routes: adminRoutes,
  },
  'content-api': {
    type: 'content-api',
    routes: guardRoutes.routes,
  },
};
