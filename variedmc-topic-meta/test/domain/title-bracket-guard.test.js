'use strict';

const assert = require('assert');
const path = require('path');

const TitleBracketGuard = require('../../lib/domain/title-bracket-guard');

describe('VariedMC topic meta title bracket guard', () => {
	it('rejects manual bracket blocks in base titles', () => {
		assert.throws(() => TitleBracketGuard.assertNoManualBlocks('[KubeJS] 手写标题', {
			generatedPrefix: '',
		}), /error:variedmc-topic-meta-manual-brackets/);
	});

	it('allows generated prefix and checks the remaining base title', () => {
		assert.doesNotThrow(() => TitleBracketGuard.assertNoManualBlocks('[1.20.1][KubeJS] 正常标题', {
			generatedPrefix: '[1.20.1][KubeJS]',
		}));
	});

	it('rejects extra bracket blocks after a generated prefix', () => {
		assert.throws(() => TitleBracketGuard.assertNoManualBlocks('[1.20.1][KubeJS] [私货] 标题', {
			generatedPrefix: '[1.20.1][KubeJS]',
		}), /error:variedmc-topic-meta-manual-brackets/);
	});

	it('allows ordinary Chinese punctuation brackets', () => {
		assert.doesNotThrow(() => TitleBracketGuard.assertNoManualBlocks('【公告】标题', {
			generatedPrefix: '',
		}));
	});
});

describe('VariedMC topic meta title bracket hook guard', () => {
	afterEach(() => {
		delete require.cache[require.resolve('../../library')];
		delete require.cache[require.resolve('../../lib/domain/title-bracket-guard')];
	});

	it('rejects manual brackets when topic create has no meta payload', async () => {
		const plugin = loadLibrary();

		await assert.rejects(() => plugin.filterTopicPost({
			cid: 5,
			title: '[KubeJS] 手写标题',
		}), /error:variedmc-topic-meta-manual-brackets/);
	});

	it('allows generated create prefix but rejects extra manual blocks', async () => {
		const plugin = loadLibrary();

		const valid = await plugin.filterTopicPost({
			cid: 5,
			title: '[1.20.1][KubeJS] 正常标题',
			variedmcTopicMeta: {
				versions: ['1.20.1'],
				modules: {
					topic: {
						primary: ['KubeJS'],
					},
				},
				baseTitle: '正常标题',
			},
		});
		assert.strictEqual(valid.title, '[1.20.1][KubeJS] 正常标题');

		await assert.rejects(() => plugin.filterTopicPost({
			cid: 5,
			title: '[1.20.1][KubeJS] [私货] 标题',
			variedmcTopicMeta: {
				versions: ['1.20.1'],
				modules: {
					topic: {
						primary: ['KubeJS'],
					},
				},
				baseTitle: '[私货] 标题',
			},
		}), /error:variedmc-topic-meta-manual-brackets/);
	});

	it('rejects extra manual blocks while editing a generated title', async () => {
		const plugin = loadLibrary();

		await assert.rejects(() => plugin.filterPostEdit({
			data: {
				pid: 99,
				title: '[1.20.1][KubeJS] [私货] 标题',
				variedmcTopicMeta: {
					versions: ['1.20.1'],
					modules: {
						topic: {
							primary: ['KubeJS'],
						},
					},
					baseTitle: '[私货] 标题',
				},
			},
		}), /error:variedmc-topic-meta-manual-brackets/);
	});

	it('allows generated prefixes while editing a title', async () => {
		const plugin = loadLibrary();

		const payload = await plugin.filterPostEdit({
			data: {
				pid: 99,
				title: '[1.20.1][KubeJS] 正常标题',
				variedmcTopicMeta: {
					versions: ['1.20.1'],
					modules: {
						topic: {
							primary: ['KubeJS'],
						},
					},
					baseTitle: '正常标题',
				},
			},
		});

		assert.strictEqual(payload.data.title, '[1.20.1][KubeJS] 正常标题');
	});
});

function loadLibrary() {
	const filename = path.join(__dirname, '../../library.js');
	delete require.cache[require.resolve(filename)];
	const originalRequire = require.main.require;
	require.main.require = function (modulePath) {
		if (modulePath === './src/socket.io/plugins') {
			return {};
		}
		if (modulePath === './src/routes/helpers') {
			return { setupAdminPageRoute: () => {} };
		}
		if (modulePath === './src/posts') {
			return {
				getPostField: async () => 55,
				isMain: async () => true,
			};
		}
		if (modulePath === './src/slugify') {
			return value => String(value || '').toLowerCase();
		}
		if (modulePath === './src/topics') {
			return {
				getTopicFields: async () => ({
					cid: 5,
					title: '[1.20.1][KubeJS] 旧标题',
					variedmcMeta: 1,
					variedmcMetaVersions: JSON.stringify(['1.20.1']),
					variedmcMetaLoaders: JSON.stringify([]),
					variedmcMetaThemes: JSON.stringify(['KubeJS']),
					variedmcMetaBaseTitle: '旧标题',
					variedmcMetaPrefix: '[1.20.1][KubeJS]',
				}),
			};
		}
		if (modulePath === './src/privileges') {
			return {
				admin: {
					can: async () => false,
				},
			};
		}
		if (modulePath === './src/categories') {
			return {
				buildForSelectAll: async () => [],
			};
		}
		if (modulePath === './src/meta') {
			return {
				settings: {
					setOnEmpty: async () => {},
					get: async () => ({
						defaultTitleTemplate: '{blocks} {title}',
						versionsCatalog: ['1.20.1'],
						loadersCatalog: [],
						themesCatalog: ['KubeJS'],
						builtInFields: { version: { enabled: true } },
						modules: [{
							key: 'topic',
							label: '技能',
							fields: [{
								key: 'primary',
								selectionKey: 'themes',
								label: '技能',
								enabled: true,
								options: ['KubeJS'],
							}],
						}],
					}),
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
