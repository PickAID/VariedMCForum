'use strict';

const assert = require('assert');
const path = require('path');

describe('Tag Controller tag policy', () => {
	let originalRequire;

	afterEach(() => {
		require.main.require = originalRequire;
		delete require.cache[require.resolve('../lib/tag-policy')];
	});

	it('rejects submitted topic tags that do not already exist', async () => {
		const policy = loadPolicyWithTags(['kubejs']);

		await assert.rejects(
			() => policy.assertExistingTags(['KubeJS', 'new-tag']),
			/error:tag-not-allowed.*new-tag/
		);
	});

	it('normalizes and deduplicates existing submitted tags', async () => {
		const policy = loadPolicyWithTags(['kubejs']);

		const tags = await policy.assertExistingTags(['KubeJS', 'kubejs']);

		assert.deepStrictEqual(tags, ['kubejs']);
	});

	it('filters unknown tags from low-level tag filter paths', async () => {
		const policy = loadPolicyWithTags(['kubejs', 'datapack']);

		const tags = await policy.filterExistingTags(['kubejs', 'ghost', 'DataPack']);

		assert.deepStrictEqual(tags, ['kubejs', 'datapack']);
	});

	it('registers server-side hooks for create, edit, and low-level filtering', () => {
		const pluginJson = require('../plugin.json');
		const hooks = new Map(pluginJson.hooks.map(hook => [hook.hook, hook.method]));

		assert.strictEqual(hooks.get('filter:topic.post'), 'filterTopicPost');
		assert.strictEqual(hooks.get('filter:topic.edit'), 'filterTopicEdit');
		assert.strictEqual(hooks.get('filter:tags.filter'), 'filterTags');
	});

	function loadPolicyWithTags(existingTags) {
		const existing = new Set(existingTags);
		const filename = path.join(__dirname, '../lib/tag-policy.js');
		delete require.cache[require.resolve(filename)];
		originalRequire = require.main.require;
		require.main.require = (request) => {
			if (request === './src/database') {
				return {
					isSortedSetMembers: async (_key, tags) => tags.map(tag => existing.has(tag)),
				};
			}
			if (request === './src/meta') {
				return { config: { maximumTagLength: 15 } };
			}
			if (request === './src/utils') {
				return {
					cleanUpTag: value => String(value || '')
						.trim()
						.toLowerCase()
						.replace(/[,/#!$^*;:{}=_`<>'"~()?|]/g, '')
						.slice(0, 15)
						.trim(),
				};
			}
			throw new Error(`Unexpected require: ${request}`);
		};

		return require(filename);
	}
});
