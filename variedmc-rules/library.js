'use strict';

const routeHelpers = require.main.require('./src/routes/helpers');
const SocketPlugins = require.main.require('./src/socket.io/plugins');
const db = require.main.require('./src/database');
const privileges = require.main.require('./src/privileges');
const posts = require.main.require('./src/posts');
const topics = require.main.require('./src/topics');
const user = require.main.require('./src/user');

const controllers = require('./lib/controllers');
const settings = require('./lib/settings');
const sockets = require('./lib/sockets');
const ContentPolicy = require('./lib/domain/content-policy');
const DeletePolicy = require('./lib/domain/delete-policy');

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
plugin.filterTopicDelete = async function (payload) {
	if (!payload || !payload.isDelete || !payload.topicData) {
		return payload;
	}
	const stored = await settings.getSettings();
	const rule = settings.resolveRule(stored, payload.topicData.cid);
	if (!rule.enabled) {
		return payload;
	}
	const context = {
		uid: payload.uid,
		now: Date.now(),
		nonAuthorReplyCount: 0,
		isAdminOrMod: false,
	};
	if (!rule.traceRequired || rule.deletePolicy === 'normal' || !DeletePolicy.isAuthor(payload.topicData, payload.uid)) {
		return payload;
	}
	context.isAdminOrMod = await isAdminOrMod(payload.topicData.cid, payload.uid);
	if (DeletePolicy.requiresRequest(rule, payload.topicData, context)) {
		payload.canDelete = false;
		throw new Error('[[error:variedmc-rules-delete-request-required]]');
	}
	if (context.isAdminOrMod || rule.deletePolicy !== 'request-after-grace') {
		return payload;
	}
	context.nonAuthorReplyCount = await getNonAuthorReplyCount(payload.topicData);
	if (DeletePolicy.requiresRequest(rule, payload.topicData, context)) {
		payload.canDelete = false;
		throw new Error('[[error:variedmc-rules-delete-request-required]]');
	}
	return payload;
};
plugin.filterThreadTools = async function (payload) {
	if (!payload || !payload.topic || !payload.uid) {
		return payload;
	}
	const stored = await settings.getSettings();
	const rule = settings.resolveRule(stored, payload.topic.cid);
	if (!rule.enabled) {
		return payload;
	}
	const adminOrMod = await isAdminOrMod(payload.topic.cid, payload.uid);
	if (rule.traceRequired && String(payload.topic.uid) === String(payload.uid) && !adminOrMod) {
		payload.tools.push({
			action: 'variedmc-request-delete',
			class: 'variedmc-request-delete',
			title: '申请删除',
			icon: 'fa-file-signature',
		});
	}
	if (adminOrMod) {
		payload.tools.push({
			action: 'variedmc-governance',
			class: 'variedmc-governance',
			title: '治理操作',
			icon: 'fa-scale-balanced',
		});
	}
	return payload;
};
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

async function getNonAuthorReplyCount(topicData) {
	const pids = await db.getSortedSetRange(`tid:${topicData.tid}:posts`, 0, -1);
	const replyPids = pids.filter(pid => String(pid) !== String(topicData.mainPid));
	if (!replyPids.length) {
		return 0;
	}
	const postsData = await posts.getPostsFields(replyPids, ['pid', 'uid']);
	return postsData.filter(post => post && post.uid != null && String(post.uid) !== String(topicData.uid)).length;
}

async function isAdminOrMod(cid, uid) {
	const [isAdmin, isMod] = await Promise.all([
		user.isAdministrator(uid),
		user.isModerator(uid, cid),
	]);
	return isAdmin || isMod;
}
