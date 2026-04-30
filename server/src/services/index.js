'use strict';

const contextResolver = require('./context-resolver');
const permissionEngine = require('./permission-engine');
const conditionEvaluator = require('./condition-evaluator');
const interceptor = require('./interceptor');
const requestInterceptor = require('./request-interceptor');
const responseInterceptor = require('./response-interceptor');
const filterBuilder = require('./filter-builder');
const setupService = require('./setup');
const aliasResolver = require('./alias-resolver');
const resourceRecorder = require('./resource-recorder');

module.exports = {
  'context-resolver': contextResolver,
  'permission-engine': permissionEngine,
  'condition-evaluator': conditionEvaluator,
  'interceptor': interceptor,
  'request-interceptor': requestInterceptor,
  'response-interceptor': responseInterceptor,
  'filter-builder': filterBuilder,
  'setup': setupService,
  'alias-resolver': aliasResolver,
  'resource-recorder': resourceRecorder,
};
