'use strict';

const privileges = require.main.require('./src/privileges');

const settings = require('./settings');

const Sockets = module.exports;

Sockets.load = async function (socket) {
	await ensureAdmin(socket);
	return await settings.getAdminState();
};

Sockets.save = async function (socket, data) {
	await ensureAdmin(socket);
	await settings.save(data || {});
	return await settings.getAdminState();
};

async function ensureAdmin(socket) {
	const allowed = await privileges.admin.can('admin:settings', socket.uid);
	if (!allowed) {
		throw new Error('[[error:no-privileges]]');
	}
}
