'use strict';

const MODEL_UIDS = {
  domains: 'plugin::api-guard-pro.domain',
  resources: 'plugin::api-guard-pro.resource',
  roles: 'plugin::api-guard-pro.role',
  policies: 'plugin::api-guard-pro.policy',
  grants: 'plugin::api-guard-pro.grant',
  groups: 'plugin::api-guard-pro.group'
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export default ({ strapi }) => ({
  async overview(ctx) {
    const counts = await Promise.all([
      strapi.db.query(MODEL_UIDS.domains).count(),
      strapi.db.query(MODEL_UIDS.resources).count(),
      strapi.db.query(MODEL_UIDS.roles).count(),
      strapi.db.query(MODEL_UIDS.policies).count(),
      strapi.db.query(MODEL_UIDS.grants).count(),
      strapi.db.query(MODEL_UIDS.groups).count(),
      strapi.db.query('plugin::users-permissions.user').count()
    ]);
    
    const [domains, resources, roles, policies, grants, groups, users] = counts;
    
    ctx.send({ domains, resources, roles, policies, grants, groups, users });
  },
  
  async list(ctx) {
    const entity = String(ctx.params.entity || '').trim();
    const modelUid = MODEL_UIDS[entity];
    
    if (!modelUid) {
      return ctx.badRequest('Invalid entity');
    }
    
    const records = await strapi.db.query(modelUid).findMany({
      orderBy: { id: 'asc' }
    });
    
    ctx.send({ data: records || [] });
  },
  
  async create(ctx) {
    const entity = String(ctx.params.entity || '').trim();
    const modelUid = MODEL_UIDS[entity];
    
    if (!modelUid) {
      return ctx.badRequest('Invalid entity');
    }
    
    const payload = ctx.request.body?.data || ctx.request.body || {};
    const created = await strapi.db.query(modelUid).create({ data: payload });
    
    ctx.send({ data: created });
  },
  
  async update(ctx) {
    const entity = String(ctx.params.entity || '').trim();
    const modelUid = MODEL_UIDS[entity];
    
    if (!modelUid) {
      return ctx.badRequest('Invalid entity');
    }
    
    const id = toNumber(ctx.params.id);
    if (!id) return ctx.badRequest('Invalid id');
    
    const payload = ctx.request.body?.data || ctx.request.body || {};
    const updated = await strapi.db.query(modelUid).update({
      where: { id },
      data: payload
    });
    
    ctx.send({ data: updated });
  },
  
  async remove(ctx) {
    const entity = String(ctx.params.entity || '').trim();
    const modelUid = MODEL_UIDS[entity];
    
    if (!modelUid) {
      return ctx.badRequest('Invalid entity');
    }
    
    const id = toNumber(ctx.params.id);
    if (!id) return ctx.badRequest('Invalid id');
    
    await strapi.db.query(modelUid).delete({ where: { id } });
    ctx.send({ ok: true });
  },
  
  async listUsers(ctx) {
    const users = await strapi.db.query('plugin::users-permissions.user').findMany({
      orderBy: { id: 'asc' },
      select: ['id', 'username', 'email', 'displayName', 'blocked', 'confirmed'],
      populate: {
        role: { select: ['id', 'name', 'type'] },
        permission_roles: { populate: { domain: true } }
      }
    });
    
    ctx.send({ data: users || [] });
  },
  
  async assignUserRoles(ctx) {
    const userId = toNumber(ctx.params.userId);
    if (!userId) return ctx.badRequest('Invalid user id');
    
    const roleIds = Array.isArray(ctx.request.body?.roleIds)
      ? ctx.request.body.roleIds.map(id => toNumber(id)).filter(Boolean)
      : [];
    
    const updated = await strapi.db.query('plugin::users-permissions.user').update({
      where: { id: userId },
      data: { permission_roles: roleIds }
    });
    
    ctx.send({ data: updated });
  },
  
  async strapiContentTypes(ctx) {
    const allTypes = Object.values(strapi.contentTypes);
    const types = allTypes
      .filter(ct => !ct.plugin && ct.kind === 'collectionType')
      .map(ct => ({
        uid: ct.uid,
        displayName: ct.info?.displayName || ct.uid,
        attributes: Object.entries(ct.attributes || {})
          .filter(([, attr]) => attr.type !== 'relation' && attr.type !== 'dynamiczone')
          .map(([name]) => name)
      }));
    
    ctx.send({ data: types });
  },
  
  async clearCache(ctx) {
    const permissionEngine = strapi.service('plugin::api-guard-pro.permission-engine');
    if (permissionEngine) {
      permissionEngine.clearAllCache();
      ctx.send({ ok: true, message: 'Permission cache cleared successfully' });
    } else {
      ctx.send({ ok: false, message: 'Permission engine not available' });
    }
  }
});
