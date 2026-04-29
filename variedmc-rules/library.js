'use strict';

const routeHelpers = require.main.require('./src/routes/helpers');
const SocketPlugins = require.main.require('./src/socket.io/plugins');
const privileges = require.main.require('./src/privileges');
const posts = require.main.require('./src/posts');
const topics = require.main.require('./src/topics');

const controllers = require('./lib/controllers');
const settings = require('./lib/settings');
const sockets = require('./lib/sockets');
const ContentPolicy = require('./lib/domain/content-policy');

const plugin = module.exports;

plugin.init = async function ({ router, middleware }) {
	SocketPlugins.variedmcRules = sockets;
	routeHelpers.setupAdminPageRoute(router, '/admin/plugins/variedmc-rules', controllers.renderAdminPage);
	routeHelpers.setupPageRoute(router, '/review-queue', [middleware.ensureLoggedIn], controllers.renderReviewQueue);
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

plugin.filterTopicPost = async function (data) {
	if (!data || !data.cid || data.fromQueue) {
		return data;
	}
	const stored = await settings.getSettings();
	const rule = settings.resolveRule(stored, data.cid);
	if (!rule.enabled) {
		return data;
	}
	const [isAdmin, isModerator] = await Promise.all([
		privileges.users.isAdministrator(data.uid),
		privileges.categories.isAdminOrMod(data.cid, data.uid),
	]);
	if (!isAdmin && !(isModerator && rule.moderatorLengthBypass)) {
		ContentPolicy.assertTopicContent(data.sourceContent || data.content, rule);
	}
	return data;
};

plugin.filterPostEdit = async function (payload) {
	if (!payload || !payload.data || !payload.data.pid) {
		return payload;
	}
	const [isMain, postData] = await Promise.all([
		posts.isMain(payload.data.pid),
		posts.getPostFields(payload.data.pid, ['tid']),
	]);
	if (!isMain || !postData || !postData.tid) {
		return payload;
	}
	const topicData = await topics.getTopicFields(postData.tid, ['cid']);
	const stored = await settings.getSettings();
	const rule = settings.resolveRule(stored, topicData.cid);
	if (!rule.enabled) {
		return payload;
	}
	const [isAdmin, isModerator] = await Promise.all([
		privileges.users.isAdministrator(payload.uid),
		privileges.categories.isAdminOrMod(topicData.cid, payload.uid),
	]);
	if (!isAdmin && !(isModerator && rule.moderatorLengthBypass)) {
		ContentPolicy.assertTopicContent(payload.data.sourceContent || payload.data.content, rule);
	}
	return payload;
};
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
