'use strict';

const SETTINGS_KEY = 'variedmc-topic-meta';

const EMPTY_META = Object.freeze({
	versions: [],
	loaders: [],
	themes: [],
	modules: {},
	fields: {},
	baseTitle: '',
	prefix: '',
});

const defaultSettings = Object.freeze({
	defaultTitleTemplate: '{blocks} {title}',
	versionsCatalog: [
		'1.20.1',
		'1.21.1',
	],
	loadersCatalog: [
		'Forge',
		'NeoForge',
		'Fabric',
	],
	themesCatalog: [
		'KubeJS',
		'CraftTweaker',
		'数据包',
		'模组开发',
	],
	builtInFields: {},
	lists: [],
	modules: [],
	categoryAliases: {},
	categoryRules: {},
	categoryHierarchy: {},
});

module.exports = {
	SETTINGS_KEY,
	EMPTY_META,
	defaultSettings,
};
