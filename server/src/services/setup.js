'use strict';

/**
 * setup.js — Generic bootstrap service for api-guard-pro.
 *
 * All application-specific data (domains, aliases, etc.) is supplied via
 * the plugin config block in the host app's config/plugins.js.
 * No ERP-specific constants live here.
 */
module.exports = ({ strapi }) => ({
  async ensureDefaults() {
    await this.ensureConfiguredDomains();
    strapi.log.info('[api-guard-pro] Setup completed');
  },

  /**
   * Upsert domains declared in plugin config.
   *
   * Expected config shape:
   *   config.domains: Array<{ key, name, matchKey?, aliasKeys? }>
   *
   * Each entry is upserted (created if absent, updated if present) so this
   * is safe to run on every Strapi restart.
   */
  async ensureConfiguredDomains() {
    const pluginConfig = strapi.config.get('plugin::api-guard-pro') ||
                         strapi.config.get('plugin.api-guard-pro') || {};
    const domains = pluginConfig.domains || [];

    if (!domains.length) {
      strapi.log.debug('[api-guard-pro] No domains configured — skipping domain seed');
      return;
    }

    const query = strapi.db.query('plugin::api-guard-pro.domain');
    const headerKey = pluginConfig.headerDomainKey || 'x-app-name';

    for (const domain of domains) {
      const matchKey = domain.matchKey || headerKey;
      const existing = await query.findOne({ where: { key: domain.key } });

      if (!existing) {
        await query.create({
          data: {
            key: domain.key,
            name: domain.name,
            description: domain.description || `Domain — ${domain.name}`,
            isActive: domain.isActive !== false,
            matchMode: domain.matchMode || 'header',
            matchKey,
          },
        });
        strapi.log.info(`[api-guard-pro] Seeded domain: ${domain.key}`);
      } else {
        await query.update({
          where: { id: existing.id },
          data: {
            name: domain.name,
            isActive: domain.isActive !== false,
            matchMode: domain.matchMode || 'header',
            matchKey,
          },
        });
        strapi.log.debug(`[api-guard-pro] Domain updated: ${domain.key}`);
      }
    }
  },
});
