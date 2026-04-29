'use strict';

const assert = require('assert');
const path = require('path');

describe('VariedMC core category pinned hook', () => {
	let originalRequire;

	afterEach(() => {
		require.main.require = originalRequire;
		delete require.cache[require.resolve('../library')];
		delete require.cache[require.resolve('../lib/settings')];
	});

	it('returns inherited parent pinned topics before child pinned topics', async () => {
		const plugin = loadPluginWithStubs({
			categories: {
				17: { cid: 17, parentCid: 5 },
				5: { cid: 5, parentCid: 0 },
			},
			pinnedByCid: {
				5: ['25'],
				17: ['31'],
			},
		});

		const result = await plugin.filterCategoryPinnedTids({
			pinnedTids: [],
			data: { cid: 17, uid: 0, start: 0, stop: -1 },
		});

		assert.deepStrictEqual(result.pinnedTids, ['25', '31']);
	});

	it('keeps original category pinned topics when inheritance is disabled', async () => {
		const plugin = loadPluginWithStubs({
			categories: {
				17: { cid: 17, parentCid: 5 },
				5: { cid: 5, parentCid: 0 },
			},
			pinnedByCid: {
				5: ['25'],
				17: ['31'],
			},
			settings: {
				inheritPinnedTopics: false,
			},
		});

		const result = await plugin.filterCategoryPinnedTids({
			pinnedTids: ['31'],
			data: { cid: 17, uid: 0, start: 0, stop: -1 },
		});

		assert.deepStrictEqual(result.pinnedTids, ['31']);
	});

	function loadPluginWithStubs({ categories, pinnedByCid, settings }) {
		originalRequire = require.main.require;
		require.main.require = (request) => {
			if (request === './src/database') {
				return {
					getSortedSetRevRange: async (key) => {
						const cid = key.match(/^cid:(\d+):tids:pinned$/)?.[1];
						return pinnedByCid[cid] || [];
					},
					sortedSetScores: async (_key, tids) => tids.map(() => null),
				};
			}
			if (request === './src/categories') {
				return {
					getCategoryFields: async cid => categories[String(cid)] || null,
				};
			}
			if (request === './src/privileges') {
				return { categories: { can: async () => false } };
			}
			if (request === './src/topics') {
				return { tools: { checkPinExpiry: async tids => tids } };
			}
			if (request === './src/meta') {
				return {
					settings: {
						setOnEmpty: async () => {},
						get: async () => settings || {},
						set: async () => {},
					},
				};
			}
			throw new Error(`Unexpected require: ${request}`);
		};

		return require(path.join('..', 'library'));
	}
});
