'use strict';

const Sockets = module.exports;

Sockets.load = async function (socket) {
	await ensureAdmin(socket);
	return await require('./settings').getAdminState();
};

Sockets.save = async function (socket, data) {
	await ensureAdmin(socket);
	const settings = require('./settings');
	await settings.save(data || {});
	return await settings.getAdminState();
};

Sockets.requestDeleteTopic = async function (socket, data) {
	return await createTopicRequest(socket, data, {
		type: 'delete-topic',
		create: 'createDeleteTopicRequest',
		eventType: 'variedmc-delete-requested',
		requiresDeleted: false,
	});
};

Sockets.requestRestoreTopic = async function (socket, data) {
	return await createTopicRequest(socket, data, {
		type: 'restore-topic',
		create: 'createRestoreTopicRequest',
		eventType: 'variedmc-restore-requested',
		requiresDeleted: true,
	});
};

Sockets.requestEditTopic = async function (socket, data) {
	if (!socket.uid) {
		throw new Error('[[error:not-logged-in]]');
	}
	const topics = require.main.require('./src/topics');
	const topicData = await topics.getTopicFields(data && data.tid, ['tid', 'cid', 'uid', 'mainPid', 'deleted']);
	if (!topicData || !topicData.tid || String(topicData.uid) !== String(socket.uid) || Number(topicData.deleted)) {
		throw new Error('[[error:no-privileges]]');
	}
	const settings = require('./settings');
	const rule = settings.resolveRule(await settings.getSettings(), topicData.cid);
	const DeletePolicy = require('./domain/delete-policy');
	if (!rule.enabled || !DeletePolicy.requiresProtection(rule) || !String(data && data.content || '').trim()) {
		throw new Error('[[error:invalid-data]]');
	}
	const request = await require('./domain/review-request-service').createEditTopicRequest({
		tid: topicData.tid,
		cid: topicData.cid,
		requesterUid: socket.uid,
		targetUid: topicData.uid,
		reason: data && data.reason,
		proposedTitle: data && data.title,
		proposedContent: data && data.content,
	});
	await topics.events.log(topicData.tid, { type: 'variedmc-edit-requested', uid: socket.uid, reason: data && data.reason });
	return request;
};

Sockets.getLatestEditTopicRequest = async function (socket, data) {
	if (!socket.uid) {
		throw new Error('[[error:not-logged-in]]');
	}
	const topics = require.main.require('./src/topics');
	const topicData = await topics.getTopicFields(data && data.tid, ['tid', 'uid']);
	if (!topicData || !topicData.tid || String(topicData.uid) !== String(socket.uid)) {
		throw new Error('[[error:no-privileges]]');
	}
	const request = await require('./domain/review-request-service').findLatestOpenEditTopicRequest(topicData.tid, socket.uid);
	return request ? {
		title: request.proposedTitle,
		content: request.proposedContent,
		reason: request.reason,
	} : null;
};

async function createTopicRequest(socket, data, options) {
	if (!socket.uid) {
		throw new Error('[[error:not-logged-in]]');
	}
	const topics = require.main.require('./src/topics');
	const topicData = await topics.getTopicFields(data && data.tid, ['tid', 'cid', 'uid', 'title', 'deleted', 'mainPid', 'timestamp']);
	if (!topicData || !topicData.tid || String(topicData.uid) !== String(socket.uid)) {
		throw new Error('[[error:no-privileges]]');
	}
	const isDeleted = !!Number(topicData.deleted);
	if (options.requiresDeleted !== isDeleted) {
		throw new Error('[[error:invalid-data]]');
	}
	if (options.type === 'delete-topic') {
		await assertDeleteRequestRequired(topicData, socket.uid);
	}
	const reason = data && data.reason;
	const request = await require('./domain/review-request-service')[options.create]({
		tid: topicData.tid,
		cid: topicData.cid,
		requesterUid: socket.uid,
		targetUid: topicData.uid,
		reason,
	});
	await topics.events.log(topicData.tid, { type: options.eventType, uid: socket.uid, reason });
	return request;
}

async function assertDeleteRequestRequired(topicData, uid) {
	const settings = require('./settings');
	const DeletePolicy = require('./domain/delete-policy');
	const rule = settings.resolveRule(await settings.getSettings(), topicData.cid);
	const privileges = require.main.require('./src/privileges');
	const isAdminOrMod = await privileges.categories.isAdminOrMod(topicData.cid, uid);
	const nonAuthorReplyCount = await getNonAuthorReplyCount(topicData);
	const required = DeletePolicy.requiresRequest(rule, topicData, {
		uid,
		isAdminOrMod,
		nonAuthorReplyCount,
		now: Date.now(),
	});
	if (!required) {
		throw new Error('[[error:variedmc-rules-delete-request-not-required]]');
	}
}

async function getNonAuthorReplyCount(topicData) {
	const db = require.main.require('./src/database');
	const posts = require.main.require('./src/posts');
	const pids = await db.getSortedSetRange(`tid:${topicData.tid}:posts`, 0, -1);
	const replyPids = pids.filter(pid => String(pid) !== String(topicData.mainPid));
	if (!replyPids.length) {
		return 0;
	}
	const postsData = await posts.getPostsFields(replyPids, ['pid', 'uid']);
	return postsData.filter(post => post && post.uid != null && String(post.uid) !== String(topicData.uid)).length;
}

Sockets.resolveRequest = async function (socket, data) {
	if (!socket.uid) {
		throw new Error('[[error:not-logged-in]]');
	}
	const reviewRequests = require('./domain/review-request-service');
	const privileges = require.main.require('./src/privileges');
	const request = await reviewRequests.get(data && data.id);
	if (!request || !await privileges.categories.isAdminOrMod(request.cid, socket.uid)) {
		throw new Error('[[error:no-privileges]]');
	}
	const topics = require.main.require('./src/topics');
	const resolution = {
		state: data.state,
		resolverUid: socket.uid,
		resolutionNote: data.resolutionNote,
	};
	if (data.state === 'approved' && request.type === 'delete-topic') {
		return await approveTopicRequest(reviewRequests, request, resolution, socket.uid, 'delete', 'variedmc-delete-approved');
	}
	if (data.state === 'approved' && request.type === 'restore-topic') {
		return await approveTopicRequest(reviewRequests, request, resolution, socket.uid, 'restore', 'variedmc-restore-approved');
	}
	if (data.state === 'approved' && request.type === 'edit-topic') {
		return await approveEditRequest(reviewRequests, request, resolution, socket.uid);
	}
	const resolved = await reviewRequests.resolve(request.id, resolution);
	if (resolved.state === 'rejected' && resolved.type === 'delete-topic') {
		await logResolutionEvent(topics, resolved, 'variedmc-delete-rejected', socket.uid);
	}
	if (resolved.state === 'rejected' && resolved.type === 'restore-topic') {
		await logResolutionEvent(topics, resolved, 'variedmc-restore-rejected', socket.uid);
	}
	if (resolved.state === 'rejected' && resolved.type === 'edit-topic') {
		await logResolutionEvent(topics, resolved, 'variedmc-edit-rejected', socket.uid);
	}
	return resolved;
};

async function approveTopicRequest(reviewRequests, request, resolution, uid, action, eventType) {
	const topics = require.main.require('./src/topics');
	await topics.tools[action](request.tid, uid);
	const approved = await reviewRequests.resolve(request.id, resolution);
	await logResolutionEvent(topics, approved, eventType, uid);
	return await reviewRequests.markExecuted(approved.id);
}

async function approveEditRequest(reviewRequests, request, resolution, uid) {
	const topics = require.main.require('./src/topics');
	const posts = require.main.require('./src/posts');
	const topicData = await topics.getTopicFields(request.tid, ['mainPid']);
	await posts.edit({
		pid: topicData.mainPid,
		uid,
		title: request.proposedTitle,
		content: request.proposedContent,
		sourceContent: request.proposedContent,
	});
	const approved = await reviewRequests.resolve(request.id, resolution);
	await logResolutionEvent(topics, approved, 'variedmc-edit-approved', uid);
	return await reviewRequests.markExecuted(approved.id);
}

async function logResolutionEvent(topics, request, eventType, uid) {
	await topics.events.log(request.tid, {
		type: eventType,
		uid,
		reason: request.reason,
		resolutionNote: request.resolutionNote,
	});
}

Sockets.applyGovernanceAction = async function (socket, data) {
	if (!socket.uid) {
		throw new Error('[[error:not-logged-in]]');
	}
	const topics = require.main.require('./src/topics');
	const privileges = require.main.require('./src/privileges');
	const topicData = await topics.getTopicFields(data && data.tid, ['tid', 'cid', 'uid', 'slug']);
	if (!topicData || !await privileges.categories.isAdminOrMod(topicData.cid, socket.uid)) {
		throw new Error('[[error:no-privileges]]');
	}
	const evidenceUrl = `/topic/${topicData.slug || topicData.tid}`;
	const rawDelta = data && data.delta;
	const hasDelta = rawDelta !== undefined && rawDelta !== null && String(rawDelta).trim() !== '';
	const delta = hasDelta ? Number(rawDelta) : 0;
	const shouldMarkUntrusted = !!(data && data.markUntrusted);
	if (hasDelta && (!Number.isFinite(delta) || Math.floor(delta) >= 0)) {
		throw new Error('[[error:invalid-data]]');
	}
	if (!hasDelta && !shouldMarkUntrusted) {
		throw new Error('[[error:invalid-data]]');
	}
	let reputationAction = null;
	if (hasDelta) {
		reputationAction = await require('./domain/reputation-action-service').recordDeduction({
			targetUid: topicData.uid,
			actorUid: socket.uid,
			tid: topicData.tid,
			delta,
			reason: data.reason,
			evidenceUrl,
		});
	}
	let trustMark = null;
	if (shouldMarkUntrusted) {
		trustMark = await require('./domain/trust-mark-service').markUntrusted({
			uid: topicData.uid,
			reason: data.reason,
			evidenceUrl,
			sourceTid: topicData.tid,
			createdBy: socket.uid,
			publicVisible: data.publicVisible !== false,
		});
	}
	return { reputationAction, trustMark };
};

async function ensureAdmin(socket) {
	const privileges = require.main.require('./src/privileges');
	const allowed = await privileges.admin.can('admin:settings', socket.uid);
	if (!allowed) {
		throw new Error('[[error:no-privileges]]');
	}
}
