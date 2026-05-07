'use strict';

const adminController = require('./admin');
const guardController = require('./api/guard');

module.exports = {
  admin: adminController,
  guard: guardController,
};
