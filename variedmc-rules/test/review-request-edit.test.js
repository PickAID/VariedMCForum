'use strict';

const assert = require('assert');
const path = require('path');

describe('VariedMC Rules edit review requests', () => {
	let originalMainRequire;

	afterEach(() => {
		if (originalMainRequire) {
			require.main.require = originalMainRequire;
			originalMainRequire = null;
		}
		delete require.cache[require.resolve('../lib/domain/review-request-service')];
		delete require.cache[require.resolve('../lib/settings')];
		delete require.cache[require.resolve('../lib/sockets')];
	});

	it('stores proposed title and content for edit requests', async () => {
		const { db, service } = loadService();

		const request = await service.createEditTopicRequest({
			tid: 55,
			cid: 5,
			requesterUid: 10,
			targetUid: 10,
			reason: '补充信息',
			proposedTitle: '新标题',
			proposedContent: '新内容',
			now: 1000,
		});

		assert.strictEqual(request.type, 'edit-topic');
		assert.strictEqual(request.id, 'edit-topic:1000:55:10');
		assert.strictEqual(request.proposedTitle, '新标题');
		assert.strictEqual(request.proposedContent, '新内容');
		assert.strictEqual(await db.isSortedSetMember('variedmc:review-requests:byType:edit-topic', request.id), true);
	});

	it('allows multiple open edit requests and returns the latest draft', async () => {
		const { service } = loadService();

		const first = await service.createEditTopicRequest({
			tid: 55,
			cid: 5,
			requesterUid: 10,
			targetUid: 10,
			proposedTitle: '第一次',
			proposedContent: '第一次内容',
			now: 1000,
		});
		const second = await service.createEditTopicRequest({
			tid: 55,
			cid: 5,
			requesterUid: 10,
			targetUid: 10,
			proposedTitle: '第二次',
			proposedContent: '第二次内容',
			now: 2000,
		});

		const open = await service.listByState('open');
		const latest = await service.findLatestOpenEditTopicRequest(55, 10);

		assert.deepStrictEqual(open.map(request => request.id), [second.id, first.id]);
		assert.strictEqual(latest.id, second.id);
		assert.strictEqual(latest.proposedContent, '第二次内容');
	});

	function loadService() {
		const db = createMemoryDb();
		originalMainRequire = require.main.require;
		require.main.require = (requestPath) => {
			if (requestPath === './src/database') {
				return db;
			}
			return originalMainRequire.call(require.main, requestPath);
		};
		const filename = path.join(__dirname, '../lib/domain/review-request-service.js');
		delete require.cache[require.resolve(filename)];
		const serviceModule = require(filename);
		return { db, service: serviceModule.withDatabase(db) };
	}
});

describe('VariedMC Rules edit review sockets', () => {
	let originalMainRequire;

	afterEach(() => {
		if (originalMainRequire) {
			require.main.require = originalMainRequire;
			originalMainRequire = null;
		}
		delete require.cache[require.resolve('../lib/domain/review-request-service')];
		delete require.cache[require.resolve('../lib/settings')];
		delete require.cache[require.resolve('../lib/sockets')];
	});

	it('creates and approves edit requests without direct author edits', async () => {
		const { sockets, reviewRequests, topics, posts } = loadSockets();

		await assert.rejects(() => sockets.requestEditTopic({ uid: 'other' }, { tid: 55, content: 'x' }), /error:no-privileges/);
		const request = await sockets.requestEditTopic({ uid: 'author' }, {
			tid: 55,
			title: '新标题',
			content: '新内容',
			reason: '补充',
		});

		assert.strictEqual(request.type, 'edit-topic');
		assert.strictEqual(reviewRequests.created[0].proposedTitle, '新标题');
		assert.deepStrictEqual(topics.logged[0], {
			tid: 55,
			event: { type: 'variedmc-edit-requested', uid: 'author', reason: '补充' },
		});

		const resolved = await sockets.resolveRequest({ uid: 'mod' }, {
			id: 'edit-req',
			state: 'approved',
			resolutionNote: '同意',
		});

		assert.strictEqual(resolved.state, 'executed');
		assert.deepStrictEqual(posts.edited[0], {
			pid: 'main-pid',
			uid: 'mod',
			title: '新标题',
			content: '新内容',
			sourceContent: '新内容',
		});
		assert.strictEqual(topics.logged[1].event.type, 'variedmc-edit-approved');
		assert.deepStrictEqual(reviewRequests.executed, ['edit-req']);
	});

	it('returns the latest open edit request for the topic author', async () => {
		const { sockets } = loadSockets();

		await assert.rejects(() => sockets.getLatestEditTopicRequest({ uid: 'other' }, { tid: 55 }), /error:no-privileges/);
		const draft = await sockets.getLatestEditTopicRequest({ uid: 'author' }, { tid: 55 });

		assert.deepStrictEqual(draft, {
			title: '新标题',
			content: '新内容',
			reason: '补充',
		});
	});

	it('approves the exact selected edit request when multiple requests exist', async () => {
		const { sockets, posts } = loadSockets();

		await sockets.resolveRequest({ uid: 'mod' }, {
			id: 'edit-old',
			state: 'approved',
			resolutionNote: '批准旧稿',
		});

		assert.deepStrictEqual(posts.edited[0], {
			pid: 'main-pid',
			uid: 'mod',
			title: '旧标题',
			content: '旧内容',
			sourceContent: '旧内容',
		});
	});


	function loadSockets() {
		const review = {
			id: 'edit-req',
			cid: 5,
			tid: 55,
			type: 'edit-topic',
			state: 'open',
			reason: '补充',
			proposedTitle: '新标题',
			proposedContent: '新内容',
		};
		const oldReview = {
			...review,
			id: 'edit-old',
			proposedTitle: '旧标题',
			proposedContent: '旧内容',
		};
		const reviews = {
			[review.id]: review,
			[oldReview.id]: oldReview,
		};
		const reviewRequests = {
			created: [],
			executed: [],
			createEditTopicRequest: async (input) => {
				reviewRequests.created.push(input);
				return { ...review, ...input };
			},
			get: async id => reviews[id] || null,
			findLatestOpenEditTopicRequest: async () => review,
			resolve: async (id, input) => ({ ...reviews[id], ...input, id }),
			markExecuted: async (id) => {
				reviewRequests.executed.push(id);
				return { ...reviews[id], id, state: 'executed' };
			},
		};
		const topics = {
			logged: [],
			getTopicFields: async () => ({ tid: 55, cid: 5, uid: 'author', mainPid: 'main-pid', deleted: 0 }),
			events: { log: async (tid, event) => topics.logged.push({ tid, event }) },
		};
		const posts = {
			edited: [],
			edit: async data => posts.edited.push(data),
		};
		const settings = {
			getSettings: async () => ({}),
			resolveRule: () => ({ enabled: true, deletePolicy: 'request-only' }),
		};
		originalMainRequire = require.main.require;
		require.main.require = (requestPath) => {
			if (requestPath === './src/topics') {
				return topics;
			}
			if (requestPath === './src/posts') {
				return posts;
			}
			if (requestPath === './src/privileges') {
				return {
					categories: { isAdminOrMod: async (_cid, uid) => uid === 'mod' },
					admin: { can: async () => false },
				};
			}
			return originalMainRequire.call(require.main, requestPath);
		};
		require.cache[require.resolve('../lib/domain/review-request-service')] = cacheEntry(reviewRequests);
		require.cache[require.resolve('../lib/settings')] = cacheEntry(settings);
		const sockets = require('../lib/sockets');
		return { sockets, reviewRequests, topics, posts };
	}
});

function createMemoryDb() {
	const store = new Map();
	const zsets = new Map();
	return {
		setObject: async (key, value) => store.set(key, { ...value }),
		getObject: async key => store.get(key) || null,
		sortedSetAdd: async (key, score, value) => {
			const set = zsets.get(key) || new Map();
			set.set(String(value), score);
			zsets.set(key, set);
		},
		sortedSetRemove: async (key, value) => {
			const set = zsets.get(key);
			if (set) {
				set.delete(String(value));
			}
		},
		isSortedSetMember: async (key, value) => !!(zsets.get(key) && zsets.get(key).has(String(value))),
		getSortedSetRevRange: async (key, start, stop) => {
			const entries = [...(zsets.get(key) || new Map()).entries()].sort((a, b) => b[1] - a[1]).map(([value]) => value);
			return entries.slice(start, stop === -1 ? undefined : stop + 1);
		},
	};
}

function cacheEntry(exports) {
	return { id: 'stub', filename: 'stub', loaded: true, exports };
}
