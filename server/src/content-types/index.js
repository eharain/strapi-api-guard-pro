'use strict';

const domain = require('./domain');
const resource = require('./resource');
const role = require('./role');
const policy = require('./policy');
const grant = require('./grant');
const group = require('./group');
const apiRecording = require('./api-recording');

module.exports = {
  domain,
  resource,
  role,
  policy,
  grant,
  group,
  'api-recording': apiRecording,
};
