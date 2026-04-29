'use strict';

const assert = require('assert');

describe('VariedMC Rules settings facade', () => {
	let Settings;
	let storedSettings;
	let setOnEmptyPayload;
	let settingsStore;
	let categoryOptions;

	beforeEach(() => {
		storedSettings = null;
		setOnEmptyPayload = null;
		settingsStore = {};
		categoryOptions = [];
		const meta = {
			settings: {
				get: async () => settingsStore,
				set: async (key, settings, quiet) => {
					storedSettings = { key, settings, quiet };
				},
				setOnEmpty: async (key, settings) => {
					setOnEmptyPayload = { key, settings };
				},
			},
		};
		const categories = {
			buildForSelectAll: async () => categoryOptions,
		};
		const originalRequire = require.main.require;
		require.main.require = (path) => {
			if (path === './src/meta') {
				return meta;
			}
			if (path === './src/categories') {
				return categories;
			}
			return originalRequire.call(require.main, path);
		};
		delete require.cache[require.resolve('../lib/settings')];
		Settings = require('../lib/settings');
		require.main.require = originalRequire;
	});

	afterEach(() => {
		delete require.cache[require.resolve('../lib/settings')];
	});

	it('saves meta-safe settings without derived category hierarchy', async () => {
		const settings = await Settings.save({
			enabled: true,
			categoryHierarchy: { 6: 5 },
			reputationPresets: [-5, '-10', '-20.5'],
			globalRule: { enabled: true, traceRequired: 'on' },
			categoryRules: {
				6: { scope: 'override', deletePolicy: 'request-only' },
			},
		});

		assert.deepStrictEqual(settings.reputationPresets, [-5, -10, -21]);
		assert.strictEqual(storedSettings.key, 'variedmc-rules');
		assert.strictEqual(storedSettings.quiet, true);
		assert.strictEqual(Object.prototype.hasOwnProperty.call(storedSettings.settings, 'categoryHierarchy'), false);
		assert.strictEqual(typeof storedSettings.settings.globalRule, 'string');
		assert.strictEqual(typeof storedSettings.settings.categoryRules, 'string');
		assert.deepStrictEqual(JSON.parse(storedSettings.settings.globalRule), settings.globalRule);
		assert.deepStrictEqual(JSON.parse(storedSettings.settings.categoryRules), settings.categoryRules);
		assert.deepStrictEqual(storedSettings.settings.reputationPresets, ['-5', '-10', '-21']);
	});

	it('sets meta-safe defaults and reads persisted JSON settings into runtime shape', async () => {
		settingsStore = {
			enabled: true,
			globalRule: JSON.stringify({ enabled: true, traceRequired: 'on' }),
			categoryRules: JSON.stringify({
				6: { scope: 'override', deletePolicy: 'request-only', minimumTopicContentLength: '42' },
			}),
			categoryHierarchy: { 9: 8 },
			reputationPresets: ['-4', '-9'],
		};
		categoryOptions = [
			{ cid: 5, parentCid: 0 },
			{ cid: 6, parentCid: 5 },
		];

		const settings = await Settings.getSettings();

		assert.strictEqual(setOnEmptyPayload.key, 'variedmc-rules');
		assert.strictEqual(typeof setOnEmptyPayload.settings.globalRule, 'string');
		assert.strictEqual(typeof setOnEmptyPayload.settings.categoryRules, 'string');
		assert.strictEqual(Object.prototype.hasOwnProperty.call(setOnEmptyPayload.settings, 'categoryHierarchy'), false);
		assert.strictEqual(settings.globalRule.traceRequired, true);
		assert.strictEqual(settings.categoryRules['6'].scope, 'override');
		assert.strictEqual(settings.categoryRules['6'].deletePolicy, 'request-only');
		assert.strictEqual(settings.categoryRules['6'].minimumTopicContentLength, 42);
		assert.deepStrictEqual(settings.reputationPresets, [-4, -9]);
		assert.deepStrictEqual(settings.categoryHierarchy, { 5: 0, 6: 5 });
	});
});
