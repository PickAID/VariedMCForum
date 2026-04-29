'use strict';

const meta = require.main.require('./src/meta');

const SETTINGS_KEY = 'variedmc-core';
const defaultSettings = Object.freeze({
	inheritPinnedTopics: true,
});

const Settings = module.exports;

Settings.get = async function () {
	await meta.settings.setOnEmpty(SETTINGS_KEY, defaultSettings);
	const stored = await meta.settings.get(SETTINGS_KEY);
	return normalizeSettings(stored);
};

Settings.save = async function (input) {
	const settings = normalizeSettings(input);
	await meta.settings.set(SETTINGS_KEY, settings, true);
	return settings;
};

Settings.isPinnedInheritanceEnabled = async function () {
	return (await Settings.get()).inheritPinnedTopics;
};

function normalizeSettings(input = {}) {
	return {
		inheritPinnedTopics: normalizeBoolean(input.inheritPinnedTopics, defaultSettings.inheritPinnedTopics),
	};
}

function normalizeBoolean(value, fallback) {
	if (typeof value === 'boolean') {
		return value;
	}
	if (typeof value === 'number') {
		return value !== 0;
	}
	if (typeof value === 'string') {
		const normalized = value.trim().toLowerCase();
		if (['1', 'true', 'on', 'yes'].includes(normalized)) {
			return true;
		}
		if (['0', 'false', 'off', 'no'].includes(normalized)) {
			return false;
		}
	}
	return fallback;
}
