'use strict';

import contextResolver from './context-resolver';
import permissionEngine from './permission-engine';
import conditionEvaluator from './condition-evaluator';
import requestInterceptor from './request-interceptor';
import responseInterceptor from './response-interceptor';
import filterBuilder from './filter-builder';
import setupService from './setup';
import aliasResolver from './alias-resolver';

export default {
  'context-resolver': contextResolver,
  'permission-engine': permissionEngine,
  'condition-evaluator': conditionEvaluator,
  'request-interceptor': requestInterceptor,
  'response-interceptor': responseInterceptor,
  'filter-builder': filterBuilder,
  'setup': setupService,
  'alias-resolver': aliasResolver,
};
