'use strict';

const categories = require.main.require('./src/categories');
const meta = require.main.require('./src/meta');

const { SETTINGS_KEY, defaultSettings } = require('./domain/defaults');
const KeyNormalizer = require('./domain/key-normalizer');
const RuleNormalizer = require('./domain/rule-normalizer');
const RuleResolver = require('./domain/rule-resolver');

const Settings = module.exports;

Settings.getSettings = async function () {
	await meta.settings.setOnEmpty(SETTINGS_KEY, defaultSettings);
	const stored = await meta.settings.get(SETTINGS_KEY);
	return RuleNormalizer.normalize({
		...stored,
		categoryHierarchy: await Settings.buildCategoryHierarchy(),
	});
};

Settings.getPublicConfig = async function () {
	const settings = await Settings.getSettings();
	return {
		enabled: settings.enabled,
	};
};

Settings.getAdminState = async function () {
	const [settings, categoryOptions] = await Promise.all([
		Settings.getSettings(),
		categories.buildForSelectAll(['depth', 'parentCid']),
	]);
	return {
		settings,
		categories: (categoryOptions || []).map(category => ({
			cid: KeyNormalizer.cid(category && category.cid),
			name: KeyNormalizer.text(category && category.name),
			depth: Number(category && category.depth) || 0,
			parentCid: KeyNormalizer.cid(category && category.parentCid),
		})).filter(category => category.cid > 0),
	};
};

Settings.save = async function (input) {
	const settings = RuleNormalizer.normalize(input || {});
	await meta.settings.set(SETTINGS_KEY, settings, true);
	return settings;
};

Settings.resolveRule = function (settings, cid) {
	return RuleResolver.resolve(settings, cid);
};

Settings.buildCategoryHierarchy = async function () {
	const categoryOptions = await categories.buildForSelectAll(['parentCid']);
	return Object.fromEntries((categoryOptions || []).map(category => [
		String(KeyNormalizer.cid(category && category.cid)),
		KeyNormalizer.cid(category && category.parentCid),
	]).filter(([cid]) => cid !== '0'));
};
