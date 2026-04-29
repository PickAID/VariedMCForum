'use strict';

const assert = require('assert');

describe('VariedMC Rules settings facade', () => {
	let Settings;
	let storedSettings;

	beforeEach(() => {
		storedSettings = null;
		const meta = {
			settings: {
				set: async (key, settings, sortedList) => {
					storedSettings = { key, settings, sortedList };
				},
			},
		};
		const categories = {
			buildForSelectAll: async () => [],
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
		});

		assert.deepStrictEqual(settings.reputationPresets, [-5, -10, -21]);
		assert.strictEqual(storedSettings.key, 'variedmc-rules');
		assert.strictEqual(storedSettings.sortedList, true);
		assert.strictEqual(Object.prototype.hasOwnProperty.call(storedSettings.settings, 'categoryHierarchy'), false);
		assert.deepStrictEqual(storedSettings.settings.reputationPresets, ['-5', '-10', '-21']);
	});
});
