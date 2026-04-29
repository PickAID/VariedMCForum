'use strict';

const routeHelpers = require.main.require('./src/routes/helpers');
const SocketPlugins = require.main.require('./src/socket.io/plugins');

const controllers = require('./lib/controllers');
const settings = require('./lib/settings');
const sockets = require('./lib/sockets');

const plugin = module.exports;

plugin.init = async function ({ router, middleware }) {
	SocketPlugins.variedmcRules = sockets;
	routeHelpers.setupAdminPageRoute(router, '/admin/plugins/variedmc-rules', controllers.renderAdminPage);
	router.get('/review-queue', middleware.ensureLoggedIn, controllers.renderReviewQueue);
	await settings.getSettings();
};

plugin.addAdminNavigation = async function (header) {
	header.plugins.push({
		route: '/plugins/variedmc-rules',
		icon: 'fa-scale-balanced',
		name: 'VariedMC Rules',
	});
	return header;
};

plugin.appendConfig = async function (config) {
	config.variedmcRules = await settings.getPublicConfig();
	return config;
};

plugin.filterTopicPost = async data => data;
plugin.filterPostEdit = async payload => payload;
plugin.filterTopicDelete = async payload => payload;
plugin.filterThreadTools = async payload => payload;
plugin.filterModifyUserInfo = async userData => userData;

plugin.filterTopicEventsInit = async function (payload) {
	payload.types['variedmc-delete-requested'] = {
		icon: 'fa-file-signature',
		translation: async () => '提交了删除申请',
	};
	payload.types['variedmc-delete-approved'] = {
		icon: 'fa-check',
		translation: async () => '批准了删除申请',
	};
	payload.types['variedmc-delete-rejected'] = {
		icon: 'fa-ban',
		translation: async () => '拒绝了删除申请',
	};
	payload.types['variedmc-governance-action'] = {
		icon: 'fa-scale-balanced',
		translation: async () => '记录了一次治理操作',
	};
	return payload;
};
