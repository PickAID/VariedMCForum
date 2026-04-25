'use strict';

const SocketPlugins = require.main.require('./src/socket.io/plugins');
const routeHelpers = require.main.require('./src/routes/helpers');

const controllers = require('./lib/controllers');
const socketMethods = require('./lib/sockets');
const settings = require('./lib/settings');

const plugin = module.exports;

plugin.id = 'tag-controller';

plugin.init = async function (params) {
	const { router } = params;

	SocketPlugins.tagController = socketMethods;
	routeHelpers.setupAdminPageRoute(router, '/admin/plugins/tag-controller', controllers.renderAdminPage);

	await settings.ensureSynchronized();
};

plugin.addAdminNavigation = async function (header) {
	header.plugins.push({
		route: '/plugins/tag-controller',
		icon: 'fa-tags',
		name: 'Tag Controller',
	});

	return header;
};

plugin.appendConfig = async function (config) {
	config.tagController = await settings.getPublicConfig();
	return config;
};
