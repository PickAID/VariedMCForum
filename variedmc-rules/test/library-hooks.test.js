'use strict';

const assert = require('assert');

describe('VariedMC Rules library hooks', () => {
	let originalMainRequire;
	let settingsStub;
	let settingsPath;
	let libraryPath;
	let getSettingsCalls;
	let dbGetSortedSetRangeCalls;
	let postsGetPostsFieldsCalls;
	let userAdminChecks;
	let userModeratorChecks;
	let mainPostIds;
	let postTids;
	let topicCids;
	let topicPostIds;
	let postUids;

	function loadPlugin(rule = {}) {
		getSettingsCalls = 0;
		dbGetSortedSetRangeCalls = 0;
		postsGetPostsFieldsCalls = 0;
		userAdminChecks = 0;
		userModeratorChecks = 0;
		mainPostIds = new Set(['main-pid']);
		postTids = {
			'main-pid': 'topic-id',
			'reply-pid': 'topic-id',
		};
		topicCids = {
			'topic-id': 5,
		};
		topicPostIds = {
			55: ['topic-main-pid'],
		};
		postUids = {
			'topic-main-pid': 'author',
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
			if (path === './src/database') {
				return {
					getSortedSetRange: async (key) => {
						dbGetSortedSetRangeCalls += 1;
						const tid = key.match(/^tid:(.+):posts$/)[1];
						return topicPostIds[tid] || [];
					},
				};
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
					getPostsFields: async (pids) => {
						postsGetPostsFieldsCalls += 1;
						return pids.map(pid => ({
							pid,
							uid: postUids[pid],
						}));
					},
				};
			}
			if (path === './src/topics') {
				return {
					getTopicFields: async tid => ({
						cid: topicCids[tid],
					}),
				};
			}
			if (path === './src/user') {
				return {
					isAdministrator: async (uid) => {
						userAdminChecks += 1;
						return uid === 'admin';
					},
					isModerator: async (uid) => {
						userModeratorChecks += 1;
						return uid === 'mod';
					},
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

	it('skips delete policy checks for disabled rules', async () => {
		const plugin = loadPlugin({
			enabled: false,
			traceRequired: true,
			deletePolicy: 'request-only',
		});
		const payload = {
			isDelete: true,
			uid: 'author',
			topicData: { tid: 55, cid: 5, uid: 'author', mainPid: 'topic-main-pid', timestamp: 1000 },
		};

		const result = await plugin.filterTopicDelete(payload);

		assert.strictEqual(result, payload);
		assert.strictEqual(dbGetSortedSetRangeCalls, 0);
		assert.strictEqual(userAdminChecks, 0);
		assert.strictEqual(userModeratorChecks, 0);
	});

	it('allows admins and moderators to bypass delete request policy without scanning replies', async () => {
		const plugin = loadPlugin({
			traceRequired: true,
			deletePolicy: 'request-only',
		});
		topicPostIds[55] = ['topic-main-pid', 'other-reply-pid'];
		postUids['other-reply-pid'] = 'other-user';

		await assert.doesNotReject(plugin.filterTopicDelete({
			isDelete: true,
			uid: 'admin',
			topicData: { tid: 55, cid: 5, uid: 'author', mainPid: 'topic-main-pid', timestamp: 1000 },
		}));
		await assert.doesNotReject(plugin.filterTopicDelete({
			isDelete: true,
			uid: 'mod',
			topicData: { tid: 55, cid: 5, uid: 'author', mainPid: 'topic-main-pid', timestamp: 1000 },
		}));
		assert.strictEqual(dbGetSortedSetRangeCalls, 0);
		assert.strictEqual(postsGetPostsFieldsCalls, 0);
	});

	it('rejects request-only and locked author deletes without scanning replies', async () => {
		for (const deletePolicy of ['request-only', 'locked']) {
			const plugin = loadPlugin({
				traceRequired: true,
				deletePolicy,
			});

			await assert.rejects(
				plugin.filterTopicDelete({
					isDelete: true,
					uid: 'author',
					topicData: { tid: 55, cid: 5, uid: 'author', mainPid: 'topic-main-pid', timestamp: 1000 },
				}),
				/error:variedmc-rules-delete-request-required/
			);
		}
		assert.strictEqual(dbGetSortedSetRangeCalls, 0);
		assert.strictEqual(postsGetPostsFieldsCalls, 0);
	});

	it('rejects author delete after non-author replies require a request', async () => {
		const plugin = loadPlugin({
			traceRequired: true,
			deletePolicy: 'request-after-grace',
			deleteGraceHours: 0.5,
		});
		topicPostIds[55] = ['topic-main-pid', 'other-reply-pid'];
		postUids['other-reply-pid'] = 'other-user';

		await assert.rejects(
			plugin.filterTopicDelete({
				isDelete: true,
				uid: 'author',
				topicData: { tid: 55, cid: 5, uid: 'author', mainPid: 'topic-main-pid', timestamp: Date.now() },
			}),
			/error:variedmc-rules-delete-request-required/
		);
	});

	it('allows author delete inside grace with only own posts', async () => {
		const plugin = loadPlugin({
			traceRequired: true,
			deletePolicy: 'request-after-grace',
			deleteGraceHours: 0.5,
		});
		topicPostIds[55] = ['topic-main-pid', 'own-reply-pid'];
		postUids['own-reply-pid'] = 'author';
		const payload = {
			isDelete: true,
			uid: 'author',
			topicData: { tid: 55, cid: 5, uid: 'author', mainPid: 'topic-main-pid', timestamp: Date.now() },
		};

		const result = await plugin.filterTopicDelete(payload);

		assert.strictEqual(result, payload);
		assert.strictEqual(payload.canDelete, undefined);
	});

	it('ignores mainPid and missing uid data when counting non-author replies', async () => {
		const plugin = loadPlugin({
			traceRequired: true,
			deletePolicy: 'request-after-grace',
			deleteGraceHours: 0.5,
		});
		topicPostIds[55] = ['topic-main-pid', 'missing-reply-pid', 'own-reply-pid'];
		postUids['topic-main-pid'] = 'stale-other-user';
		postUids['own-reply-pid'] = 'author';
		const payload = {
			isDelete: true,
			uid: 'author',
			topicData: { tid: 55, cid: 5, uid: 'author', mainPid: 'topic-main-pid', timestamp: Date.now() },
		};

		const result = await plugin.filterTopicDelete(payload);

		assert.strictEqual(result, payload);
		assert.strictEqual(postsGetPostsFieldsCalls, 1);
	});

	it('adds author delete request thread tool for trace-required categories', async () => {
		const plugin = loadPlugin({ traceRequired: true });
		const payload = {
			uid: 'author',
			topic: { tid: 55, cid: 5, uid: 'author' },
			tools: [],
		};

		const result = await plugin.filterThreadTools(payload);

		assert.strictEqual(result, payload);
		assert.deepStrictEqual(payload.tools.map(tool => tool.action), ['variedmc-request-delete']);
	});

	it('adds governance thread tool for admins and moderators', async () => {
		const plugin = loadPlugin({ traceRequired: true });
		const adminPayload = {
			uid: 'admin',
			topic: { tid: 55, cid: 5, uid: 'author' },
			tools: [],
		};
		const modPayload = {
			uid: 'mod',
			topic: { tid: 55, cid: 5, uid: 'author' },
			tools: [],
		};

		await plugin.filterThreadTools(adminPayload);
		await plugin.filterThreadTools(modPayload);

		assert.deepStrictEqual(adminPayload.tools.map(tool => tool.action), ['variedmc-governance']);
		assert.deepStrictEqual(modPayload.tools.map(tool => tool.action), ['variedmc-governance']);
	});

	it('does not add thread tools for disabled rules', async () => {
		const plugin = loadPlugin({ enabled: false, traceRequired: true });
		const payload = {
			uid: 'author',
			topic: { tid: 55, cid: 5, uid: 'author' },
			tools: [],
		};

		const result = await plugin.filterThreadTools(payload);

		assert.strictEqual(result, payload);
		assert.deepStrictEqual(payload.tools, []);
	});

	it('normalizes missing thread tools before adding plugin tools', async () => {
		const plugin = loadPlugin({ traceRequired: true });
		const payload = {
			uid: 'author',
			topic: { tid: 55, cid: 5, uid: 'author' },
		};

		const result = await plugin.filterThreadTools(payload);

		assert.strictEqual(result, payload);
		assert.deepStrictEqual(payload.tools.map(tool => tool.action), ['variedmc-request-delete']);
	});
});
