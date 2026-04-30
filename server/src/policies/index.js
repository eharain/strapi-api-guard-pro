'use strict';

const hasDomainAccess = require('./has-domain-access');
const hasResourceAccess = require('./has-resource-access');

module.exports = {
  'has-domain-access': hasDomainAccess,
  'has-resource-access': hasResourceAccess
};
