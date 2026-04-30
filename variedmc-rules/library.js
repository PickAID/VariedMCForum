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
const trustMarks = require('./lib/domain/trust-mark-service');
const topicTimeline = require('../variedmc-core/lib/topic-timeline');

const plugin = module.exports;

topicTimeline.register([
	{
		type: 'variedmc-delete-requested',
		icon: 'fa-file-signature',
		action: '提交了删除申请',
		details: [{ field: 'reason', label: '原因' }],
	},
	{
		type: 'variedmc-delete-approved',
		icon: 'fa-check',
		action: '批准了删除申请并删除主题',
		details: [{ field: 'reason', label: '原因' }, { field: 'resolutionNote', label: '说明' }],
	},
	{
		type: 'variedmc-delete-rejected',
		icon: 'fa-ban',
		action: '拒绝了删除申请',
		details: [{ field: 'reason', label: '原因' }, { field: 'resolutionNote', label: '说明' }],
	},
	{
		type: 'variedmc-restore-requested',
		icon: 'fa-history',
		action: '提交了恢复申请',
		details: [{ field: 'reason', label: '原因' }],
	},
	{
		type: 'variedmc-restore-approved',
		icon: 'fa-check',
		action: '批准了恢复申请并恢复主题',
		details: [{ field: 'reason', label: '原因' }, { field: 'resolutionNote', label: '说明' }],
	},
	{
		type: 'variedmc-restore-rejected',
		icon: 'fa-ban',
		action: '拒绝了恢复申请',
		details: [{ field: 'reason', label: '原因' }, { field: 'resolutionNote', label: '说明' }],
	},
	{ type: 'variedmc-edit-requested', icon: 'fa-pencil-square-o', action: '提交了编辑申请', details: [{ field: 'reason', label: '原因' }] },
	{ type: 'variedmc-edit-approved', icon: 'fa-check', action: '批准了编辑申请并更新主题', details: [{ field: 'reason', label: '原因' }, { field: 'resolutionNote', label: '说明' }] },
	{ type: 'variedmc-edit-rejected', icon: 'fa-ban', action: '拒绝了编辑申请', details: [{ field: 'reason', label: '原因' }, { field: 'resolutionNote', label: '说明' }] },
]);

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
		posts.getPostFields(payload.data.pid, ['tid', 'uid']),
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
	if (!isAdmin && !isModerator && DeletePolicy.requiresProtection(rule) && String(postData.uid) === String(payload.uid)) {
		throw new Error('[[error:variedmc-rules-edit-request-required]]');
	}
	if (!isAdmin && !(isModerator && rule.moderatorLengthBypass)) {
		ContentPolicy.assertTopicContent(payload.data.sourceContent || payload.data.content, rule);
	}
	return payload;
};
plugin.filterTopicDelete = async function (payload) {
	if (!payload || !payload.isDelete || !payload.topicData) {
		return payload;
	}
	return await enforceDeleteRequestPolicy(payload, payload.topicData);
};

plugin.filterTopicRestore = async function (payload) {
	if (!payload || payload.isDelete || !payload.topicData) {
		return payload;
	}
	return await enforceRestoreRequestPolicy(payload, payload.topicData);
};

plugin.filterPrivilegesTopicsGet = async function (payload) {
	if (!payload || !payload.tid || !payload.uid || payload.isAdminOrMod) {
		return payload;
	}
	const topicData = await topics.getTopicFields(payload.tid, ['tid', 'cid', 'uid', 'mainPid', 'timestamp', 'deleted']);
	if (await shouldSuppressNativeDeleteTools(topicData, payload.uid)) {
		payload.deletable = false;
		payload['topics:delete'] = false;
		payload['posts:delete'] = false;
		payload.view_thread_tools = true;
	}
	return payload;
};

plugin.filterPostDelete = async function (payload) {
	if (!payload || !payload.isDelete || !payload.postData) {
		return payload;
	}
	const isMain = await posts.isMain(payload.postData.pid);
	if (!isMain) {
		return payload;
	}
	const topicData = await topics.getTopicFields(payload.postData.tid, ['tid', 'cid', 'uid', 'mainPid', 'timestamp']);
	if (!topicData || !topicData.cid) {
		return payload;
	}
	return await enforceDeleteRequestPolicy(payload, {
		...topicData,
		tid: topicData.tid || payload.postData.tid,
		mainPid: topicData.mainPid || payload.postData.pid,
	});
};

plugin.filterPostTools = async function (payload) {
	if (!payload || !payload.pid || !payload.uid || !payload.post) {
		return payload;
	}
	if (!await posts.isMain(payload.pid)) {
		return payload;
	}
	const postData = await posts.getPostFields(payload.pid, ['tid']);
	const tid = payload.post.tid || postData.tid;
	if (!tid) {
		return payload;
	}
	const topicData = await topics.getTopicFields(tid, ['tid', 'cid', 'uid', 'mainPid', 'timestamp', 'deleted']);
	if (await shouldRequireEditRequest(topicData, payload.uid)) {
		payload.post.display_edit_tools = false;
		payload.tools.push({ action: 'variedmc/request-edit', html: '申请编辑', icon: 'fa-pencil-square-o' });
	}
	if (await shouldSuppressNativeDeleteTools(topicData, payload.uid)) {
		payload.post.display_delete_tools = false;
		payload.post.display_moderator_tools = Boolean(payload.post.display_edit_tools);
	}
	return payload;
};

async function enforceDeleteRequestPolicy(payload, topicData) {
	const stored = await settings.getSettings();
	const rule = settings.resolveRule(stored, topicData.cid);
	if (!rule.enabled) {
		return payload;
	}
	const context = {
		uid: payload.uid,
		now: Date.now(),
		nonAuthorReplyCount: 0,
		isAdminOrMod: false,
	};
	if (!DeletePolicy.requiresProtection(rule) || !DeletePolicy.isAuthor(topicData, payload.uid)) {
		return payload;
	}
	context.isAdminOrMod = await isAdminOrMod(topicData.cid, payload.uid);
	if (context.isAdminOrMod) {
		return payload;
	}
	context.nonAuthorReplyCount = await getNonAuthorReplyCount(topicData);
	if (DeletePolicy.requiresRequest(rule, topicData, context)) {
		rejectDeleteRequest(payload);
	}
	return payload;
}

function rejectDeleteRequest(payload) {
	if (payload.canDelete && typeof payload.canDelete === 'object') {
		payload.canDelete = { ...payload.canDelete, flag: false, message: '[[error:variedmc-rules-delete-request-required]]' };
	} else {
		payload.canDelete = false;
	}
	throw new Error('[[error:variedmc-rules-delete-request-required]]');
}

async function enforceRestoreRequestPolicy(payload, topicData) {
	const stored = await settings.getSettings();
	const rule = settings.resolveRule(stored, topicData.cid);
	if (!rule.enabled || !DeletePolicy.requiresProtection(rule) || !DeletePolicy.isAuthor(topicData, payload.uid)) {
		return payload;
	}
	if (await isAdminOrMod(topicData.cid, payload.uid)) {
		return payload;
	}
	rejectRestoreRequest(payload);
	return payload;
}

function rejectRestoreRequest(payload) {
	if (payload.canRestore && typeof payload.canRestore === 'object') {
		payload.canRestore = { ...payload.canRestore, flag: false, message: '[[error:variedmc-rules-restore-request-required]]' };
	} else {
		payload.canRestore = false;
	}
	throw new Error('[[error:variedmc-rules-restore-request-required]]');
}

async function shouldSuppressNativeDeleteTools(topicData, uid) {
	if (!topicData || !topicData.cid || !DeletePolicy.isAuthor(topicData, uid)) {
		return false;
	}
	const stored = await settings.getSettings();
	const rule = settings.resolveRule(stored, topicData.cid);
	if (!rule.enabled || !DeletePolicy.requiresProtection(rule)) {
		return false;
	}
	if (await isAdminOrMod(topicData.cid, uid)) {
		return false;
	}
	if (Number(topicData.deleted)) {
		return true;
	}
	const context = {
		uid,
		now: Date.now(),
		nonAuthorReplyCount: 0,
		isAdminOrMod: false,
	};
	context.nonAuthorReplyCount = await getNonAuthorReplyCount(topicData);
	return DeletePolicy.requiresRequest(rule, topicData, context);
}

async function shouldRequireEditRequest(topicData, uid) {
	if (!topicData || !topicData.cid || Number(topicData.deleted) || String(topicData.uid) !== String(uid)) {
		return false;
	}
	const stored = await settings.getSettings();
	const rule = settings.resolveRule(stored, topicData.cid);
	return !!(rule.enabled && DeletePolicy.requiresProtection(rule) && !await isAdminOrMod(topicData.cid, uid));
}

function moderatorTools() {
	return [
		{ action: 'variedmc-review-queue', class: 'variedmc-review-queue-tool', title: '审核列表', icon: 'fa-list-alt', href: '/review-queue' },
		{ action: 'variedmc-governance', class: 'variedmc-governance', title: '治理操作', icon: 'fa-scale-balanced' },
	];
}

plugin.filterThreadTools = async function (payload) {
	if (!payload || !payload.topic || !payload.uid) {
		return payload;
	}
	const topicData = await completeTopicPolicyData(payload.topic);
	const rule = settings.resolveRule(await settings.getSettings(), topicData.cid);
	payload.tools = Array.isArray(payload.tools) ? payload.tools : [];
	const adminOrMod = await isAdminOrMod(topicData.cid, payload.uid);
	if (!rule.enabled) {
		return payload;
	}
	if (await shouldRequireDeleteRequestTool(topicData, payload.uid, rule, adminOrMod)) {
		payload.tools.push({
			action: 'variedmc-request-delete',
			class: 'variedmc-request-delete',
			title: '申请删除',
			icon: 'fa-file-signature',
		});
	}
	if (DeletePolicy.requiresProtection(rule) && String(topicData.uid) === String(payload.uid) && !adminOrMod && topicData.deleted) {
		payload.tools.push({
			action: 'variedmc-request-restore',
			class: 'variedmc-request-restore',
			title: '申请恢复',
			icon: 'fa-history',
		});
	}
	return payload;
};

async function completeTopicPolicyData(topicData) {
	if (!topicData || !topicData.tid || (topicData.timestamp && topicData.mainPid)) {
		return topicData || {};
	}
	return {
		...topicData,
		...await topics.getTopicFields(topicData.tid, ['tid', 'cid', 'uid', 'mainPid', 'timestamp', 'deleted']),
	};
}

async function shouldRequireDeleteRequestTool(topicData, uid, rule, adminOrMod) {
	if (!topicData || Number(topicData.deleted) || !DeletePolicy.isAuthor(topicData, uid)) {
		return false;
	}
	const context = {
		uid,
		now: Date.now(),
		nonAuthorReplyCount: 0,
		isAdminOrMod: adminOrMod,
	};
	if (!DeletePolicy.requiresProtection(rule)) {
		return false;
	}
	context.nonAuthorReplyCount = await getNonAuthorReplyCount(topicData);
	return DeletePolicy.requiresRequest(rule, topicData, context);
}

plugin.filterCategoryGet = async function (payload) {
	if (!payload || !payload.category || !payload.uid || !await isAdminOrMod(payload.category.cid, payload.uid)) {
		return payload;
	}
	payload.category.thread_tools = Array.isArray(payload.category.thread_tools) ? payload.category.thread_tools : [];
	payload.category.thread_tools.push(...moderatorTools());
	return payload;
};
plugin.filterModifyUserInfo = async function (userData) {
	return await trustMarks.injectBadge(userData);
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
