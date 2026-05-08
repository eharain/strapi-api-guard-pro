// Public content-api routes — served by Strapi at:
//   GET|POST /api/api-guard-pro/me/permissions
// Not linked to a content-type controller; the handler is the plugin's own
// guard controller which authenticates via JWT and returns AGP permissions.
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/me/permissions',
      handler: 'guard.myPermissions',
      config: {
        auth: false,   // we handle JWT manually so custom headers work
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/me/permissions',
      handler: 'guard.myPermissions',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
