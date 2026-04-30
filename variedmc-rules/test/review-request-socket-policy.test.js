'use strict';

const assert = require('assert');

describe('VariedMC Rules delete request socket policy', () => {
	let originalMainRequire;

	beforeEach(() => {
		originalMainRequire = require.main.require;
	});

	afterEach(() => {
		require.main.require = originalMainRequire;
		delete require.cache[require.resolve('../lib/sockets')];
		delete require.cache[require.resolve('../lib/settings')];
		delete require.cache[require.resolve('../lib/domain/review-request-service')];
	});

	it('rejects delete requests while the topic can still be directly deleted', async () => {
		const created = [];
		const settings = {
			getSettings: async () => ({}),
			resolveRule: () => ({
				enabled: true,
				deletePolicy: 'request-only',
				deleteGraceHours: 1,
			}),
		};
		const reviewRequests = {
			createDeleteTopicRequest: async (input) => {
				created.push(input);
				return input;
			},
		};
		const topics = {
			getTopicFields: async () => ({
				tid: 55,
				cid: 5,
				uid: 'author',
				title: 'Topic',
				deleted: 0,
				mainPid: 'main',
				timestamp: Date.now(),
			}),
			events: {
				log: async () => {},
			},
		};

		require.main.require = (requestPath) => {
			if (requestPath === './src/topics') {
				return topics;
			}
			if (requestPath === './src/database') {
				return { getSortedSetRange: async () => ['main'] };
			}
			if (requestPath === './src/posts') {
				return { getPostsFields: async () => [] };
			}
			if (requestPath === './src/privileges') {
				return { categories: { isAdminOrMod: async () => false } };
			}
			return originalMainRequire.call(require.main, requestPath);
		};
		require.cache[require.resolve('../lib/settings')] = cacheEntry(settings);
		require.cache[require.resolve('../lib/domain/review-request-service')] = cacheEntry(reviewRequests);
		const sockets = require('../lib/sockets');

		await assert.rejects(
			() => sockets.requestDeleteTopic({ uid: 'author' }, { tid: 55, reason: '误点' }),
			/error:variedmc-rules-delete-request-not-required/
		);
		assert.deepStrictEqual(created, []);
	});
});

function cacheEntry(exports) {
	return {
		loaded: true,
		exports,
	};
}
