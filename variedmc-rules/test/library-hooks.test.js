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
		mainPostIds = new Set(['main-pid', 'topic-main-pid']);
		postTids = {
			'main-pid': 'topic-id',
			'reply-pid': 'topic-id',
		};
		topicCids = {
			'topic-id': 5,
			55: 5,
		};
		topicPostIds = {
			55: ['topic-main-pid'],
		};
		postUids = {
			'main-pid': 'author',
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
			if (path === 'nconf') {
				return {
					get: key => (key === 'relative_path' ? '' : null),
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
						uid: postUids[pid],
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
						tid,
						cid: topicCids[tid],
						uid: 'author',
						mainPid: 'topic-main-pid',
						timestamp: 1000,
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
			if (path === './src/helpers') {
				return {
					buildAvatar: user => `<span class="avatar">${user.displayname}</span>`,
				};
			}
			return originalMainRequire.call(require.main, path);
		};
	});

	afterEach(() => {
		require.main.require = originalMainRequire;
		delete require.cache[libraryPath];
		delete require.cache[settingsPath];
		delete require.cache[require.resolve('../../variedmc-core/lib/topic-timeline')];
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
			/error:content-too-short/
		);
	});

	it('rejects short main-post edits for users without a bypass', async () => {
		const plugin = loadPlugin();
		await assert.rejects(
			plugin.filterPostEdit({
				uid: 'user',
				data: { pid: 'main-pid', content: '' },
			}),
			/error:content-too-short/
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

	it('requires author edit requests for protected main posts', async () => {
		const plugin = loadPlugin({ deletePolicy: 'request-only' });
		await assert.rejects(
			plugin.filterPostEdit({
				uid: 'author',
				data: { pid: 'main-pid', content: 'long enough content' },
			}),
			/error:variedmc-rules-edit-request-required/
		);
		await assert.doesNotReject(plugin.filterPostEdit({
			uid: 'admin',
			data: { pid: 'main-pid', content: 'long enough content' },
		}));
		await assert.doesNotReject(plugin.filterPostEdit({
			uid: 'mod',
			data: { pid: 'main-pid', content: 'long enough content' },
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

	it('rejects request-only and locked author deletes after grace', async () => {
		for (const deletePolicy of ['request-only', 'locked']) {
			const plugin = loadPlugin({
				traceRequired: true,
				deletePolicy,
				deleteGraceHours: 0.5,
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
		assert.ok(dbGetSortedSetRangeCalls > 0);
		assert.strictEqual(postsGetPostsFieldsCalls, 0);
	});

	it('allows request-only author delete inside grace with no non-author replies', async () => {
		const plugin = loadPlugin({
			deletePolicy: 'request-only',
			deleteGraceHours: 0.5,
		});
		const payload = {
			isDelete: true,
			uid: 'author',
			topicData: { tid: 55, cid: 5, uid: 'author', mainPid: 'topic-main-pid', timestamp: Date.now() },
		};
		const result = await plugin.filterTopicDelete(payload);
		assert.strictEqual(result, payload);
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

	it('rejects main post deletes before the post is soft-deleted', async () => {
		const plugin = loadPlugin({
			traceRequired: true,
			deletePolicy: 'request-only',
		});

		await assert.rejects(
			plugin.filterPostDelete({
				isDelete: true,
				uid: 'author',
				postData: { pid: 'topic-main-pid', tid: 55, uid: 'author' },
				canDelete: { flag: true },
			}),
			/error:variedmc-rules-delete-request-required/
		);
	});

	it('does not apply topic delete request policy to reply deletes', async () => {
		const plugin = loadPlugin({
			traceRequired: true,
			deletePolicy: 'request-only',
		});
		mainPostIds = new Set();
		const payload = {
			isDelete: true,
			uid: 'author',
			postData: { pid: 'reply-pid', tid: 55, uid: 'author' },
			canDelete: { flag: true },
		};

		const result = await plugin.filterPostDelete(payload);

		assert.strictEqual(result, payload);
		assert.deepStrictEqual(payload.canDelete, { flag: true });
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
});
