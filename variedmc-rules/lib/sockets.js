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
	const resolved = await reviewRequests.resolve(request.id, {
		state: data.state,
		resolverUid: socket.uid,
		resolutionNote: data.resolutionNote,
	});
	if (resolved.state === 'approved' && resolved.type === 'delete-topic') {
		await topics.tools.delete(resolved.tid, socket.uid);
		await topics.events.log(resolved.tid, { type: 'variedmc-delete-approved', uid: socket.uid });
		return await reviewRequests.markExecuted(resolved.id);
	}
	if (resolved.state === 'rejected' && resolved.type === 'delete-topic') {
		await topics.events.log(resolved.tid, { type: 'variedmc-delete-rejected', uid: socket.uid });
	}
	return resolved;
};

async function ensureAdmin(socket) {
	const privileges = require.main.require('./src/privileges');
	const allowed = await privileges.admin.can('admin:settings', socket.uid);
	if (!allowed) {
		throw new Error('[[error:no-privileges]]');
	}
}
