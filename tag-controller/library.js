'use strict';

const SocketPlugins = require.main.require('./src/socket.io/plugins');
const routeHelpers = require.main.require('./src/routes/helpers');

const controllers = require('./lib/controllers');
const socketMethods = require('./lib/sockets');
const settings = require('./lib/settings');
const tagPolicy = require('./lib/tag-policy');

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

plugin.filterTopicPost = async function (data) {
	if (data && Array.isArray(data.tags)) {
		data.tags = await tagPolicy.assertExistingTags(data.tags);
	}
	return data;
};

plugin.filterTopicEdit = async function (payload) {
	if (payload && payload.data && Array.isArray(payload.data.tags)) {
		payload.data.tags = await tagPolicy.assertExistingTags(payload.data.tags);
	}
	return payload;
};

plugin.filterTags = async function (payload) {
	if (payload && Array.isArray(payload.tags)) {
		payload.tags = await tagPolicy.filterExistingTags(payload.tags);
	}
	return payload;
};
