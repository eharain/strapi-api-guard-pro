'use strict';

const domain = require('./domain');
const role = require('./role');
const resource = require('./resource');
const policy = require('./policy');
const apiRecording = require('./api-recording');

module.exports = {
  domain,
  role,
  resource,
  policy,
  'api-recording': apiRecording,
};
