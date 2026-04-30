'use strict';

const nconf = require.main.require('nconf');
const helpers = require.main.require('./src/helpers');

const registered = new Map();
const relativePath = nconf.get('relative_path') || '';

function register(definitions) {
	for (const definition of definitions || []) {
		if (definition && definition.type) {
			registered.set(definition.type, normalizeDefinition(definition));
		}
	}
}

function applyTo(types) {
	for (const [type, definition] of registered.entries()) {
		types[type] = {
			icon: definition.icon,
			translation: async event => renderEvent(event, definition),
		};
	}
	return types;
}

function renderEvent(event, definition) {
	return [
		renderUser(event),
		` ${escapeHTML(definition.action)} `,
		renderDetails(event, definition.details),
		renderTimeago(event),
	].filter(Boolean).join('').replace(/\s+/g, ' ').trim();
}

function renderUser(event) {
	if (!event || !event.user || event.user.system) {
		return '[[global:system-user]]';
	}
	const displayname = escapeHTML(String(event.user.displayname || event.user.username || ''));
	const safeUser = { ...event.user, displayname };
	return `${helpers.buildAvatar(safeUser, '16px', true)} <a href="${relativePath}/user/${event.user.userslug}">${displayname}</a>`;
}

function renderDetails(event, details) {
	const rendered = (details || [])
		.map(detail => renderDetail(event, detail))
		.filter(Boolean);
	return rendered.length ? `${rendered.join(' ') } ` : '';
}

function renderDetail(event, detail) {
	const value = String(event && event[detail.field] || '').trim();
	if (!value) {
		return '';
	}
	return `<span class="text-muted">${escapeHTML(detail.label)}：${escapeHTML(value)}</span>`;
}

function renderTimeago(event) {
	return `<span class="timeago timeline-text" title="${event.timestampISO}"></span>`;
}

function normalizeDefinition(definition) {
	return {
		type: definition.type,
		icon: definition.icon || 'fa-circle',
		action: definition.action || definition.type,
		details: Array.isArray(definition.details) ? definition.details : [],
	};
}

function escapeHTML(value) {
	return String(value).replace(/[&<>"']/g, char => ({
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#39;',
	})[char]);
}

module.exports = {
	applyTo,
	register,
};
