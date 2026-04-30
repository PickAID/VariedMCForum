'use strict';

const assert = require('assert');
const path = require('path');

describe('VariedMC core category pinned hook', () => {
	let originalRequire;

	afterEach(() => {
		require.main.require = originalRequire;
		delete require.cache[require.resolve('../library')];
		delete require.cache[require.resolve('../lib/settings')];
		delete require.cache[require.resolve('../lib/topic-timeline')];
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

	it('registers NodeBB-style timeline event renderers through core', async () => {
		const plugin = loadPluginWithStubs({ categories: {}, pinnedByCid: {} });
		const timeline = require('../lib/topic-timeline');
		timeline.register([{
			type: 'variedmc-test-event',
			icon: 'fa-check',
			action: '记录了测试事件',
			details: [{ field: 'reason', label: '原因' }],
		}]);
		const payload = { types: {} };

		await plugin.filterTopicEventsInit(payload);
		const text = await payload.types['variedmc-test-event'].translation({
			timestampISO: '2026-04-29T00:00:00.000Z',
			reason: '需要留痕',
			user: { displayname: 'Mafuyu', username: 'mafuyu', userslug: 'mafuyu' },
		});

		assert.strictEqual(payload.types['variedmc-test-event'].icon, 'fa-check');
		assert.match(text, /avatar/);
		assert.match(text, /记录了测试事件/);
		assert.match(text, /原因：需要留痕/);
		assert.match(text, /timeago timeline-text/);
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
			if (request === 'nconf') {
				return { get: () => '' };
			}
			if (request === './src/helpers') {
				return {
					buildAvatar: user => `<span class="avatar">${user.displayname}</span>`,
				};
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
