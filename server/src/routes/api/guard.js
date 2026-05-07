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
  ],
};
