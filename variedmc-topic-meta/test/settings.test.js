'use strict';

const assert = require('assert');
const path = require('path');

describe('VariedMC topic meta settings', () => {
	it('does not inherit global custom lists when a category overrides its meta rule', () => {
		const Settings = loadSettingsModule();
		const rule = Settings.resolveCategoryRule({
			defaultTitleTemplate: '{blocks} {title}',
			versionsCatalog: ['1.20.1'],
			loadersCatalog: ['NeoForge'],
			themesCatalog: ['KubeJS'],
			builtInFields: {
				version: { enabled: true },
				loader: { enabled: true },
			},
			modules: [
				{
					key: 'topic',
					label: '技能',
					fields: [{
						key: 'primary',
						selectionKey: 'themes',
						label: '技能',
						enabled: true,
						options: ['KubeJS'],
					}],
				},
				{
					key: 'content',
					label: '内容类型',
					fields: [{
						key: 'kind',
						selectionKey: 'content.kind',
						label: '内容类型',
						enabled: true,
						options: ['教程'],
					}],
				},
			],
			categoryHierarchy: {
				5: 0,
				6: 5,
			},
			categoryRules: {
				5: {
					scope: 'extend',
					modules: [{
						key: 'parent-kind',
						label: '父级分类',
						fields: [{
							key: 'primary',
							selectionKey: 'parent-kind.primary',
							label: '父级分类',
							enabled: true,
							options: ['父级项'],
						}],
					}],
				},
				6: {
					scope: 'override',
					modules: [{
						key: 'child-kind',
						label: '子级分类',
						fields: [{
							key: 'primary',
							selectionKey: 'child-kind.primary',
							label: '子级分类',
							enabled: true,
							options: ['子级项'],
						}],
					}],
				},
			},
		}, 6);
		const selectionKeys = rule.metaFields.map(field => field.selectionKey);

		assert.deepStrictEqual(selectionKeys, ['versions', 'loaders', 'child-kind.primary']);
	});

	it('preserves empty category-local meta lists while saving settings', async () => {
		let savedSettings = null;
		const Settings = loadSettingsModule({
			meta: {
				settings: {
					setOnEmpty: async () => {},
					get: async () => ({}),
					set: async (key, value) => {
						savedSettings = value;
					},
				},
			},
		});

		const normalized = await Settings.save({
			defaultTitleTemplate: '{blocks} {title}',
			versionsCatalog: ['1.20.1'],
			loadersCatalog: ['NeoForge'],
			modules: [],
			categoryRules: {
				5: {
					scope: 'extend',
					modules: [{
						key: 'category-kind',
						label: '板块分类',
						fields: [{
							key: 'primary',
							selectionKey: 'category-kind.primary',
							label: '板块分类',
							enabled: true,
							options: [],
						}],
					}],
				},
			},
		});

		assert(savedSettings, 'settings should be written');
		assert.strictEqual(normalized.categoryRules['5'].modules.length, 1);
		assert.strictEqual(normalized.categoryRules['5'].modules[0].key, 'category-kind');
		assert.strictEqual(normalized.categoryRules['5'].modules[0].fields[0].selectionKey, 'category-kind.primary');
		assert.deepStrictEqual(normalized.categoryRules['5'].modules[0].fields[0].options, []);
	});

	it('renders field-specific title template placeholders', () => {
		const Settings = loadSettingsModule();
		const title = Settings.buildGeneratedTitle(
			'标题',
			{
				versions: ['1.18.2', '1.20.1', '1.21.1', '26.1'],
				loaders: ['NeoForge'],
				modules: {
					topic: {
						primary: ['KubeJS'],
					},
				},
			},
			'{block:versions}{value:loaders}{block:topic.primary}{label:topic.primary} {title}',
			{
				versionCatalog: ['1.18.2', '1.19.2', '1.20.1', '1.21.1', '26.1'],
				metaFields: [
					{
						key: 'versions',
						selectionKey: 'versions',
						fieldKey: 'version',
						label: '版本',
						mode: 'multi',
						enabled: true,
						options: ['1.18.2', '1.19.2', '1.20.1', '1.21.1', '26.1'],
					},
					{
						key: 'loaders',
						selectionKey: 'loaders',
						fieldKey: 'loader',
						label: '运行环境',
						mode: 'multi',
						enabled: true,
						options: ['NeoForge'],
					},
					{
						key: 'primary',
						selectionKey: 'themes',
						moduleKey: 'topic',
						fieldKey: 'primary',
						label: '技能',
						mode: 'multi',
						enabled: true,
						options: ['KubeJS'],
					},
				],
			}
		);

		assert.strictEqual(title, '[1.18.2,1.20.1-26.1]NeoForge[KubeJS]技能 标题');
	});

	it('renders category-alias scoped title template placeholders', () => {
		const Settings = loadSettingsModule();
		const title = Settings.buildGeneratedTitle(
			'标题',
			{
				modules: {
					'category-5-custom-1': {
						primary: ['教程'],
					},
				},
			},
			'{block:tools.custom-1.primary}{value:tools.custom-1.primary}{label:tools.custom-1.primary} {title}',
			{
				categoryAlias: 'tools',
				categoryCid: 5,
				metaFields: [
					{
						key: 'primary',
						selectionKey: 'category-5-custom-1.primary',
						moduleKey: 'category-5-custom-1',
						fieldKey: 'primary',
						label: '内容类型',
						mode: 'multi',
						enabled: true,
						options: ['教程'],
					},
				],
			}
		);

		assert.strictEqual(title, '[教程]教程内容类型 标题');
	});
});

function loadSettingsModule(stubs = {}) {
	const filename = path.join(__dirname, '../lib/settings.js');
	delete require.cache[require.resolve(filename)];
	const originalRequire = require.main.require;
	require.main.require = function (modulePath) {
		if (modulePath === './src/categories') {
			return stubs.categories || {
				buildForSelectAll: async () => [],
			};
		}
		if (modulePath === './src/meta') {
			return stubs.meta || {
				settings: {
					setOnEmpty: async () => {},
					get: async () => ({}),
					set: async () => {},
				},
			};
		}
		return originalRequire.call(require.main, modulePath);
	};

	try {
		return require(filename);
	} finally {
		require.main.require = originalRequire;
	}
}
