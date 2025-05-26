'use strict';

const controllers = require('./lib/controllers');
const routeHelpers = require.main.require('./src/routes/helpers');

const plugin = {};

plugin.init = async (params) => {
    const { router } = params;
    routeHelpers.setupAdminPageRoute(router, '/admin/plugins/tag-color-maker', controllers.renderAdminPage);
};

module.exports = plugin;