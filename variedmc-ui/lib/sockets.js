'use strict';

const privileges = require.main.require('./src/privileges');

const settings = require('./settings');

const Sockets = module.exports;

Sockets.load = async function (socket) {
	await ensureAdmin(socket);
	return await settings.get();
};

Sockets.save = async function (socket, data) {
	await ensureAdmin(socket);
	return await settings.save(data);
};

async function ensureAdmin(socket) {
	const allowed = await privileges.admin.can('admin:settings', socket.uid);
	if (!allowed) {
		throw new Error('[[error:no-privileges]]');
	}
}
