'use strict';

const assert = require('assert');

describe('VariedMC Rules topic tools and timeline registration', () => {
	let originalMainRequire;
	let settingsPath;
	let libraryPath;
	let topicPostIds;
	let postFields;
	let topicFields;

	beforeEach(() => {
		settingsPath = require.resolve('../lib/settings');
		libraryPath = require.resolve('../library');
		topicPostIds = [];
		postFields = [];
		topicFields = { tid: 55, cid: 5, uid: 'author', mainPid: 'topic-main-pid', timestamp: 1000 };
		originalMainRequire = require.main.require;
		require.main.require = stubMainRequire;
	});

	afterEach(() => {
		require.main.require = originalMainRequire;
		delete require.cache[libraryPath];
		delete require.cache[settingsPath];
		delete require.cache[require.resolve('../../variedmc-core/lib/topic-timeline')];
	});

	it('adds author delete and restore request tools based on topic state', async () => {
		const plugin = loadPlugin({ traceRequired: true, deletePolicy: 'request-only' });
		const active = { uid: 'author', topic: { tid: 55, cid: 5, uid: 'author', deleted: 0 }, tools: [] };
		const deleted = { uid: 'author', topic: { tid: 55, cid: 5, uid: 'author', deleted: 1 }, tools: [] };

		await plugin.filterThreadTools(active);
		await plugin.filterThreadTools(deleted);

		assert.deepStrictEqual(active.tools.map(tool => tool.action), ['variedmc-request-delete']);
		assert.deepStrictEqual(deleted.tools.map(tool => tool.action), ['variedmc-request-restore']);
	});

	it('does not show delete request tool inside delete grace without non-author replies', async () => {
		const plugin = loadPlugin({
			traceRequired: true,
			deletePolicy: 'request-after-grace',
			deleteGraceHours: 0.5,
		});
		const payload = {
			uid: 'author',
			topic: { tid: 55, cid: 5, uid: 'author', deleted: 0, mainPid: 'topic-main-pid', timestamp: Date.now() },
			tools: [],
		};

		await plugin.filterThreadTools(payload);

		assert.deepStrictEqual(payload.tools, []);
	});

	it('shows delete request tool inside delete grace after non-author replies', async () => {
		const plugin = loadPlugin({
			traceRequired: true,
			deletePolicy: 'request-after-grace',
			deleteGraceHours: 0.5,
		});
		topicPostIds = ['topic-main-pid', 'other-reply-pid'];
		postFields = [{ pid: 'other-reply-pid', uid: 'other-user' }];
		const payload = {
			uid: 'author',
			topic: { tid: 55, cid: 5, uid: 'author', deleted: 0, mainPid: 'topic-main-pid', timestamp: Date.now() },
			tools: [],
		};

		await plugin.filterThreadTools(payload);

		assert.deepStrictEqual(payload.tools.map(tool => tool.action), ['variedmc-request-delete']);
	});

	it('shows delete request tool after delete grace expires', async () => {
		const plugin = loadPlugin({
			traceRequired: true,
			deletePolicy: 'request-after-grace',
			deleteGraceHours: 0.5,
		});
		const payload = {
			uid: 'author',
			topic: { tid: 55, cid: 5, uid: 'author', deleted: 0, mainPid: 'topic-main-pid', timestamp: Date.now() - 31 * 60 * 1000 },
			tools: [],
		};

		await plugin.filterThreadTools(payload);

		assert.deepStrictEqual(payload.tools.map(tool => tool.action), ['variedmc-request-delete']);
	});

	it('does not show request-only delete tool inside grace without non-author replies', async () => {
		const plugin = loadPlugin({
			deletePolicy: 'request-only',
			deleteGraceHours: 0.5,
		});
		const payload = {
			uid: 'author',
			topic: { tid: 55, cid: 5, uid: 'author', deleted: 0, mainPid: 'topic-main-pid', timestamp: Date.now() },
			tools: [],
		};

		await plugin.filterThreadTools(payload);

		assert.deepStrictEqual(payload.tools, []);
	});

	it('hydrates topic tool data before applying delete grace', async () => {
		const plugin = loadPlugin({
			deletePolicy: 'request-only',
			deleteGraceHours: 0.5,
		});
		topicFields = { tid: 55, cid: 5, uid: 'author', mainPid: 'topic-main-pid', timestamp: Date.now(), deleted: 0 };
		const payload = {
			uid: 'author',
			topic: { tid: 55, cid: 5, uid: 'author', deleted: 0 },
			tools: [],
		};

		await plugin.filterThreadTools(payload);

		assert.deepStrictEqual(payload.tools, []);
	});

	it('keeps review queue and governance out of topic thread tools', async () => {
		const plugin = loadPlugin({ traceRequired: true });
		const adminPayload = { uid: 'admin', topic: { tid: 55, cid: 5, uid: 'author' }, tools: [] };
		const modPayload = { uid: 'mod', topic: { tid: 55, cid: 5, uid: 'author' }, tools: [] };

		await plugin.filterThreadTools(adminPayload);
		await plugin.filterThreadTools(modPayload);

		assert.deepStrictEqual(adminPayload.tools, []);
		assert.deepStrictEqual(modPayload.tools, []);
	});

	it('adds review queue and governance tools to category moderator tools', async () => {
		const plugin = loadPlugin();
		const modPayload = { uid: 'mod', category: { cid: 5, thread_tools: [] } };
		const userPayload = { uid: 'author', category: { cid: 5, thread_tools: [] } };

		await plugin.filterCategoryGet(modPayload);
		await plugin.filterCategoryGet(userPayload);

		assert.deepStrictEqual(modPayload.category.thread_tools.map(tool => tool.action), [
			'variedmc-review-queue',
			'variedmc-governance',
		]);
		assert.strictEqual(modPayload.category.thread_tools[0].href, '/review-queue');
		assert.deepStrictEqual(userPayload.category.thread_tools, []);
	});

	it('registers public rules timeline events through VariedMC core', async () => {
		loadPlugin();
		const topicTimeline = require('../../variedmc-core/lib/topic-timeline');
		const payload = { types: {} };

		topicTimeline.applyTo(payload.types);

		assert.deepStrictEqual(Object.keys(payload.types).sort(), [
			'variedmc-delete-approved',
			'variedmc-delete-rejected',
			'variedmc-delete-requested',
			'variedmc-edit-approved',
			'variedmc-edit-rejected',
			'variedmc-edit-requested',
			'variedmc-restore-approved',
			'variedmc-restore-rejected',
			'variedmc-restore-requested',
		]);
		const text = await payload.types['variedmc-delete-requested'].translation({
			timestampISO: '2026-04-29T00:00:00.000Z',
			reason: '误发',
			user: { displayname: 'Mafuyu', username: 'mafuyu', userslug: 'mafuyu' },
		});
		assert.match(text, /提交了删除申请/);
		assert.match(text, /原因：误发/);
		assert.match(text, /avatar/);
	});

	it('rejects author restores while allowing admin and moderator bypass', async () => {
		const plugin = loadPlugin({ traceRequired: true, deletePolicy: 'request-only' });
		const topicData = { tid: 55, cid: 5, uid: 'author', mainPid: 'topic-main-pid', timestamp: 1000 };

		await assert.rejects(
			plugin.filterTopicRestore({ isDelete: false, uid: 'author', topicData, canRestore: { flag: true } }),
			/error:variedmc-rules-restore-request-required/
		);
		await assert.doesNotReject(plugin.filterTopicRestore({ isDelete: false, uid: 'admin', topicData }));
		await assert.doesNotReject(plugin.filterTopicRestore({ isDelete: false, uid: 'mod', topicData }));
	});

	it('hides native topic delete and restore buttons for request-only authors', async () => {
		const plugin = loadPlugin({ traceRequired: true, deletePolicy: 'request-only' });
		const payload = {
			tid: 55,
			uid: 'author',
			deletable: true,
			'topics:delete': true,
			'posts:delete': true,
			'posts:edit': true,
			view_thread_tools: true,
			isAdminOrMod: false,
		};

		const result = await plugin.filterPrivilegesTopicsGet(payload);

		assert.strictEqual(result, payload);
		assert.strictEqual(payload.deletable, false);
		assert.strictEqual(payload['topics:delete'], false);
		assert.strictEqual(payload['posts:delete'], false);
		assert.strictEqual(payload['posts:edit'], true);
		assert.strictEqual(payload.view_thread_tools, true);
	});

	it('keeps native topic delete and restore buttons for moderators', async () => {
		const plugin = loadPlugin({ traceRequired: true, deletePolicy: 'request-only' });
		const payload = {
			tid: 55,
			uid: 'mod',
			deletable: true,
			'topics:delete': true,
			'posts:delete': true,
			view_thread_tools: true,
			isAdminOrMod: true,
		};

		const result = await plugin.filterPrivilegesTopicsGet(payload);

		assert.strictEqual(result, payload);
		assert.strictEqual(payload.deletable, true);
		assert.strictEqual(payload['topics:delete'], true);
		assert.strictEqual(payload['posts:delete'], true);
	});

	it('keeps native delete privileges inside grace without non-author replies', async () => {
		const plugin = loadPlugin({
			traceRequired: true,
			deletePolicy: 'request-after-grace',
			deleteGraceHours: 0.5,
		});
		topicFields = { tid: 55, cid: 5, uid: 'author', mainPid: 'topic-main-pid', timestamp: Date.now() };
		const payload = {
			tid: 55,
			uid: 'author',
			deletable: true,
			'topics:delete': true,
			'posts:delete': true,
			view_thread_tools: false,
			isAdminOrMod: false,
		};

		const result = await plugin.filterPrivilegesTopicsGet(payload);

		assert.strictEqual(result, payload);
		assert.strictEqual(payload.deletable, true);
		assert.strictEqual(payload['topics:delete'], true);
		assert.strictEqual(payload['posts:delete'], true);
		assert.strictEqual(payload.view_thread_tools, false);
	});

	it('keeps native delete privileges inside grace for request-only policies', async () => {
		const plugin = loadPlugin({
			deletePolicy: 'request-only',
			deleteGraceHours: 0.5,
		});
		topicFields = { tid: 55, cid: 5, uid: 'author', mainPid: 'topic-main-pid', timestamp: Date.now() };
		const payload = {
			tid: 55,
			uid: 'author',
			deletable: true,
			'topics:delete': true,
			'posts:delete': true,
			view_thread_tools: false,
			isAdminOrMod: false,
		};

		await plugin.filterPrivilegesTopicsGet(payload);

		assert.strictEqual(payload.deletable, true);
		assert.strictEqual(payload['topics:delete'], true);
		assert.strictEqual(payload['posts:delete'], true);
	});

	it('hides native main-post delete and restore tools for request-only authors', async () => {
		const plugin = loadPlugin({ traceRequired: true, deletePolicy: 'request-only' });
		const payload = {
			pid: 'topic-main-pid',
			uid: 'author',
			post: {
				pid: 'topic-main-pid',
				uid: 'author',
				display_edit_tools: true,
				display_delete_tools: true,
				display_moderator_tools: true,
			},
			tools: [],
		};

		const result = await plugin.filterPostTools(payload);

		assert.strictEqual(result, payload);
		assert.strictEqual(payload.post.display_edit_tools, false);
		assert.strictEqual(payload.post.display_delete_tools, false);
		assert.strictEqual(payload.post.display_moderator_tools, false);
		assert.deepStrictEqual(payload.tools.map(tool => tool.action), ['variedmc/request-edit']);
	});

	it('keeps native main-post delete tools inside grace without non-author replies', async () => {
		const plugin = loadPlugin({
			traceRequired: true,
			deletePolicy: 'request-after-grace',
			deleteGraceHours: 0.5,
		});
		topicFields = { tid: 55, cid: 5, uid: 'author', mainPid: 'topic-main-pid', timestamp: Date.now() };
		const payload = {
			pid: 'topic-main-pid',
			uid: 'author',
			post: {
				pid: 'topic-main-pid',
				uid: 'author',
				display_edit_tools: true,
				display_delete_tools: true,
				display_moderator_tools: true,
			},
			tools: [],
		};

		const result = await plugin.filterPostTools(payload);

		assert.strictEqual(result, payload);
		assert.strictEqual(payload.post.display_delete_tools, true);
	});

	it('normalizes missing tools and skips author tools for disabled rules', async () => {
		const enabled = loadPlugin({ traceRequired: true, deletePolicy: 'request-only' });
		const payload = { uid: 'author', topic: { tid: 55, cid: 5, uid: 'author' } };
		await enabled.filterThreadTools(payload);
		assert.deepStrictEqual(payload.tools.map(tool => tool.action), ['variedmc-request-delete']);

		const disabled = loadPlugin({ enabled: false, traceRequired: true });
		const disabledPayload = { uid: 'author', topic: { tid: 55, cid: 5, uid: 'author' }, tools: [] };
		await disabled.filterThreadTools(disabledPayload);
		assert.deepStrictEqual(disabledPayload.tools, []);
	});

	function loadPlugin(rule = {}) {
		require.cache[settingsPath] = {
			id: settingsPath,
			filename: settingsPath,
			loaded: true,
			exports: {
				getSettings: async () => ({}),
				resolveRule: () => ({ enabled: true, moderatorLengthBypass: true, ...rule }),
			},
		};
		delete require.cache[libraryPath];
		return require('../library');
	}

	function stubMainRequire(path) {
		if (path === './src/routes/helpers' || path === './src/socket.io/plugins') {
			return {};
		}
		if (path === './src/database') {
			return { getSortedSetRange: async () => topicPostIds };
		}
		if (path === 'nconf') {
			return { get: () => '' };
		}
		if (path === './src/privileges') {
			return { users: { isAdministrator: async uid => uid === 'admin' }, categories: { isAdminOrMod: async (_cid, uid) => uid === 'mod' } };
		}
		if (path === './src/posts') {
			return { isMain: async () => true, getPostFields: async () => ({ tid: 55 }), getPostsFields: async () => postFields };
		}
		if (path === './src/topics') {
			return { getTopicFields: async () => topicFields };
		}
		if (path === './src/user') {
			return { isAdministrator: async uid => uid === 'admin', isModerator: async uid => uid === 'mod' };
		}
		if (path === './src/helpers') {
			return { buildAvatar: user => `<span class="avatar">${user.displayname}</span>` };
		}
		return originalMainRequire.call(require.main, path);
	}
});
