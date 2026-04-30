import interceptor from './interceptor';
import permission from './engine/permission';
import condition from './engine/condition';
import cache from './engine/cache';
import context from './resolver/context';
import domain from './resolver/domain';
import user from './resolver/user';
import filter from './builder/filter';
import query from './builder/query';
import response from './builder/response';

export default {
  interceptor,
  engine: permission,
  condition,
  cache,
  context,
  domain,
  user,
  filter,
  query,
  response,
};
