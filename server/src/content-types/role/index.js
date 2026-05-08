'use strict';

const schema = require('./schema.json');

// Dynamically extends the users-permissions.user content-type with the
// owning side of the permission_roles manyToMany relation. Called in
// register.js before Strapi validates DB metadata.
const RELATION_DEF = {
  type: 'relation',
  relation: 'manyToMany',
  target: 'plugin::api-guard-pro.role',
  inversedBy: 'users',
  configurable: false,
  writable: true,
  visible: false,
  useJoinTable: true,
};

// Dynamically extends the users-permissions.user content-type with the
// owning side of the api_guard_roles manyToMany relation.
//
// The authoritative declaration lives in the consuming app's extension at:
//   src/extensions/users-permissions/content-types/user/schema.json
// That file is evaluated before DB schema sync, so the join table is created
// correctly. This function acts as a runtime safety net for any environment
// where that static declaration is absent.
const extendUserRelation = (strapi) => {
  let patched = false;

  // Patch 1 — raw plugin registry (read by DB schema sync).
  // strapi.plugins is the low-level map populated before register() runs.
  const rawPlugin = strapi.plugins?.['users-permissions'];
  if (rawPlugin?.contentTypes?.user?.schema?.attributes) {
    if (!rawPlugin.contentTypes.user.schema.attributes.api_guard_roles) {
      rawPlugin.contentTypes.user.schema.attributes.api_guard_roles = RELATION_DEF;
      patched = true;
    }
  }

  // Patch 2 — processed content-types map (used at runtime for queries).
  const processedCT = strapi.contentTypes?.['plugin::users-permissions.user'];
  if (processedCT?.attributes) {
    if (!processedCT.attributes.api_guard_roles) {
      processedCT.attributes.api_guard_roles = RELATION_DEF;
      patched = true;
    }
  }

  if (patched) {
    strapi.log.info('[api-guard-pro] Registered api_guard_roles relation on users-permissions.user');
  } else if (!rawPlugin && !processedCT) {
    strapi.log.warn('[api-guard-pro] Could not extend user content-type — plugin::users-permissions is not loaded.');
  }
};

module.exports = {
  schema,
  extendUserRelation,
};
