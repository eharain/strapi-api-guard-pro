'use strict';

module.exports = require('@strapi/sdk-plugin').defineConfig({
    entry: {
        './strapi-admin': './admin/src/index.js',
        './strapi-server': './server/src/index.js',
    },
});
