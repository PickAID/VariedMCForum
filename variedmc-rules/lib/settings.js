'use strict';

const meta = require.main.require('./src/meta');

const SETTINGS_KEY = 'variedmc-rules';

const Settings = module.exports;

Settings.getSettings = async function () {
	await meta.settings.setOnEmpty(SETTINGS_KEY, {});
	return await meta.settings.get(SETTINGS_KEY);
};

Settings.getPublicConfig = async function () {
	const settings = await Settings.getSettings();
	return {
		enabled: !!settings.enabled,
	};
};
