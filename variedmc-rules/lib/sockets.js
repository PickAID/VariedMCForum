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
	if (!socket.uid) {
		throw new Error('[[error:not-logged-in]]');
	}
	const topics = require.main.require('./src/topics');
	const topicData = await topics.getTopicFields(data && data.tid, ['tid', 'cid', 'uid', 'title']);
	if (!topicData || !topicData.tid || String(topicData.uid) !== String(socket.uid)) {
		throw new Error('[[error:no-privileges]]');
	}
	const request = await require('./domain/review-request-service').createDeleteTopicRequest({
		tid: topicData.tid,
		cid: topicData.cid,
		requesterUid: socket.uid,
		targetUid: topicData.uid,
		reason: data && data.reason,
	});
	await topics.events.log(topicData.tid, { type: 'variedmc-delete-requested', uid: socket.uid });
	return request;
};

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
	if (request.type === 'delete-topic' && data.state === 'approved') {
		await topics.tools.delete(request.tid, socket.uid);
		await topics.events.log(request.tid, { type: 'variedmc-delete-approved', uid: socket.uid });
		const approved = await reviewRequests.resolve(request.id, resolution);
		return await reviewRequests.markExecuted(approved.id);
	}
	const resolved = await reviewRequests.resolve(request.id, resolution);
	if (resolved.state === 'rejected' && resolved.type === 'delete-topic') {
		await topics.events.log(resolved.tid, { type: 'variedmc-delete-rejected', uid: socket.uid });
	}
	return resolved;
};

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
	let reputationAction = null;
	if (Number(data.delta) < 0) {
		reputationAction = await require('./domain/reputation-action-service').recordDeduction({
			targetUid: topicData.uid,
			actorUid: socket.uid,
			tid: topicData.tid,
			delta: data.delta,
			reason: data.reason,
			evidenceUrl,
		});
	}
	let trustMark = null;
	if (data.markUntrusted) {
		trustMark = await require('./domain/trust-mark-service').markUntrusted({
			uid: topicData.uid,
			reason: data.reason,
			evidenceUrl,
			sourceTid: topicData.tid,
			createdBy: socket.uid,
			publicVisible: data.publicVisible !== false,
		});
	}
	await topics.events.log(topicData.tid, { type: 'variedmc-governance-action', uid: socket.uid });
	return { reputationAction, trustMark };
};

async function ensureAdmin(socket) {
	const privileges = require.main.require('./src/privileges');
	const allowed = await privileges.admin.can('admin:settings', socket.uid);
	if (!allowed) {
		throw new Error('[[error:no-privileges]]');
	}
}
