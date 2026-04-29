'use strict';

const assert = require('assert');

describe('VariedMC Rules library hooks', () => {
	let originalMainRequire;
	let settingsStub;
	let settingsPath;
	let libraryPath;
	let getSettingsCalls;
	let mainPostIds;
	let postTids;
	let topicCids;

	function loadPlugin(rule = {}) {
		getSettingsCalls = 0;
		mainPostIds = new Set(['main-pid']);
		postTids = {
			'main-pid': 'topic-id',
			'reply-pid': 'topic-id',
		};
		topicCids = {
			'topic-id': 5,
		};
		settingsStub = {
			getSettings: async () => {
				getSettingsCalls += 1;
				return {};
			},
			resolveRule: () => ({
				enabled: true,
				minimumTopicContentLength: 10,
				moderatorLengthBypass: true,
				...rule,
			}),
		};
		require.cache[settingsPath] = {
			id: settingsPath,
			filename: settingsPath,
			loaded: true,
			exports: settingsStub,
		};
		delete require.cache[libraryPath];
		return require('../library');
	}

	beforeEach(() => {
		settingsPath = require.resolve('../lib/settings');
		libraryPath = require.resolve('../library');
		originalMainRequire = require.main.require;
		require.main.require = (path) => {
			if (path === './src/routes/helpers') {
				return {};
			}
			if (path === './src/socket.io/plugins') {
				return {};
			}
			if (path === './src/privileges') {
				return {
					users: {
						isAdministrator: async uid => uid === 'admin',
					},
					categories: {
						isAdminOrMod: async (cid, uid) => uid === 'mod',
					},
				};
			}
			if (path === './src/posts') {
				return {
					isMain: async pid => mainPostIds.has(pid),
					getPostFields: async pid => ({
						tid: postTids[pid],
					}),
				};
			}
			if (path === './src/topics') {
				return {
					getTopicFields: async tid => ({
						cid: topicCids[tid],
					}),
				};
			}
			return originalMainRequire.call(require.main, path);
		};
	});

	afterEach(() => {
		require.main.require = originalMainRequire;
		delete require.cache[libraryPath];
		delete require.cache[settingsPath];
	});

	it('skips topic content length checks for queue payloads', async () => {
		const plugin = loadPlugin();

		const payload = { cid: 5, uid: 'user', fromQueue: true, content: '' };
		const result = await plugin.filterTopicPost(payload);

		assert.strictEqual(result, payload);
		assert.strictEqual(getSettingsCalls, 0);
	});

	it('allows admins and bypass-enabled moderators to create short topics', async () => {
		const plugin = loadPlugin();

		await assert.doesNotReject(plugin.filterTopicPost({ cid: 5, uid: 'admin', content: '' }));
		await assert.doesNotReject(plugin.filterTopicPost({ cid: 5, uid: 'mod', content: '' }));
	});

	it('rejects short topic creation for users without a bypass', async () => {
		const plugin = loadPlugin();

		await assert.rejects(
			plugin.filterTopicPost({ cid: 5, uid: 'user', content: '' }),
			/error:variedmc-rules-content-too-short/
		);
	});

	it('rejects short main-post edits for users without a bypass', async () => {
		const plugin = loadPlugin();

		await assert.rejects(
			plugin.filterPostEdit({
				uid: 'user',
				data: { pid: 'main-pid', content: '' },
			}),
			/error:variedmc-rules-content-too-short/
		);
	});

	it('skips content length checks for non-main post edits', async () => {
		const plugin = loadPlugin();
		mainPostIds = new Set();
		const payload = {
			uid: 'user',
			data: { pid: 'reply-pid', content: '' },
		};

		const result = await plugin.filterPostEdit(payload);

		assert.strictEqual(result, payload);
		assert.strictEqual(getSettingsCalls, 0);
	});

	it('allows admins and bypass-enabled moderators to edit main posts short', async () => {
		const plugin = loadPlugin();

		await assert.doesNotReject(plugin.filterPostEdit({
			uid: 'admin',
			data: { pid: 'main-pid', content: '' },
		}));
		await assert.doesNotReject(plugin.filterPostEdit({
			uid: 'mod',
			data: { pid: 'main-pid', content: '' },
		}));
	});
});
