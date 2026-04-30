export default (config, { strapi }) => {
  return async (ctx, next) => {
    await next();
  };
};
