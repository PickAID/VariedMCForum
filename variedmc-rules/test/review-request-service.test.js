'use strict';

const assert = require('assert');
const path = require('path');

let restoreMainRequire;

afterEach(() => {
	if (restoreMainRequire) {
		require.main.require = restoreMainRequire;
		restoreMainRequire = null;
	}
	for (const filename of [
		'../lib/domain/review-request-service',
		'../lib/settings',
		'../lib/sockets',
		'../lib/controllers',
	]) {
		try {
			delete require.cache[require.resolve(filename)];
		} catch (err) {
			// Module may not exist yet during the red phase.
		}
	}
});

describe('VariedMC Rules review request service', () => {
	it('creates one open delete request per topic and requester', async () => {
		const { service, db } = loadService();
		const first = await service.createDeleteTopicRequest({
			tid: 55,
			cid: 5,
			requesterUid: 10,
			targetUid: 10,
			reason: '误发',
			now: 1000,
		});

		await assert.rejects(() => service.createDeleteTopicRequest({
			tid: 55,
			cid: 5,
			requesterUid: 10,
			targetUid: 10,
			reason: '重复',
			now: 1001,
		}), /error:variedmc-rules-duplicate-delete-request/);

		assert.strictEqual(first.state, 'open');
		assert.strictEqual(await db.isSortedSetMember('variedmc:review-requests:byState:open', first.id), true);
		assert.strictEqual(await db.isSortedSetMember('variedmc:review-requests:byType:delete-topic', first.id), true);
		assert.strictEqual(await db.isSortedSetMember('variedmc:review-requests:byCid:5', first.id), true);
		assert.strictEqual(await db.isSortedSetMember('variedmc:review-requests:byRequester:10', first.id), true);
	});

	it('creates restore requests independently from delete requests', async () => {
		const { service, db } = loadService();
		const request = await service.createRestoreTopicRequest({
			tid: 55,
			cid: 5,
			requesterUid: 10,
			targetUid: 10,
			reason: '误删',
			now: 1000,
		});

		assert.strictEqual(request.type, 'restore-topic');
		assert.strictEqual(request.id, 'restore-topic:1000:55:10');
		assert.strictEqual(await db.isSortedSetMember('variedmc:review-requests:byType:restore-topic', request.id), true);
	});

	it('lists by state and resolves open requests', async () => {
		const { service, db } = loadService();
		const request = await service.createDeleteTopicRequest({
			tid: 55,
			cid: 5,
			requesterUid: 10,
			targetUid: 10,
			reason: '误发',
			now: 1000,
		});

		assert.deepStrictEqual((await service.listByState('open')).map(item => item.id), [request.id]);

		const approved = await service.resolve(request.id, {
			state: 'approved',
			resolverUid: 1,
			resolutionNote: '同意',
			now: 2000,
		});

		assert.strictEqual(approved.state, 'approved');
		assert.strictEqual(approved.resolverUid, 1);
		assert.strictEqual(approved.resolutionNote, '同意');
		assert.strictEqual(await db.isSortedSetMember('variedmc:review-requests:byState:open', request.id), false);
		assert.strictEqual(await db.isSortedSetMember('variedmc:review-requests:byState:approved', request.id), true);
		assert.deepStrictEqual((await service.listByState('approved')).map(item => item.id), [request.id]);
	});

	it('supports rejected and cancelled resolutions only from open state', async () => {
		for (const state of ['rejected', 'cancelled']) {
			const { service } = loadService();
			const request = await service.createDeleteTopicRequest({
				tid: 55,
				cid: 5,
				requesterUid: 10,
				targetUid: 10,
				now: 1000,
			});

			const resolved = await service.resolve(request.id, { state, resolverUid: 2, now: 2000 });
			assert.strictEqual(resolved.state, state);
			await assert.rejects(() => service.resolve(request.id, { state: 'approved', resolverUid: 2 }), /error:invalid-data/);
		}
	});

	it('marks approved requests executed and reindexes state', async () => {
		const { service, db } = loadService();
		const request = await service.createDeleteTopicRequest({
			tid: 55,
			cid: 5,
			requesterUid: 10,
			targetUid: 10,
			now: 1000,
		});
		const approved = await service.resolve(request.id, { state: 'approved', resolverUid: 2, now: 2000 });

		const executed = await service.markExecuted(approved.id, { now: 3000 });

		assert.strictEqual(executed.state, 'executed');
		assert.strictEqual(executed.executedAt, 3000);
		assert.strictEqual(await db.isSortedSetMember('variedmc:review-requests:byState:approved', request.id), false);
		assert.strictEqual(await db.isSortedSetMember('variedmc:review-requests:byState:executed', request.id), true);
		await assert.rejects(() => service.markExecuted(request.id), /error:invalid-data/);
	});
});

describe('VariedMC Rules review request sockets', () => {
	it('keeps ACP load and save admin-only', async () => {
		const { sockets, settings } = loadSockets();

		await assert.rejects(() => sockets.load({ uid: 'user' }), /error:no-privileges/);
		assert.deepStrictEqual(await sockets.load({ uid: 'admin' }), { admin: true });
		assert.deepStrictEqual(await sockets.save({ uid: 'admin' }, { enabled: true }), { admin: true });
		assert.deepStrictEqual(settings.saved, { enabled: true });
	});

	it('allows only the topic author to request topic deletion', async () => {
		const { sockets, reviewRequests, topics } = loadSockets();

		await assert.rejects(() => sockets.requestDeleteTopic({ uid: 'other' }, { tid: 55 }), /error:no-privileges/);

		const request = await sockets.requestDeleteTopic({ uid: 'author' }, { tid: 55, reason: '误发' });

		assert.strictEqual(request.tid, 55);
		assert.strictEqual(request.requesterUid, 'author');
		assert.strictEqual(reviewRequests.created.length, 1);
		assert.deepStrictEqual(topics.logged, [
			{ tid: 55, event: { type: 'variedmc-delete-requested', uid: 'author', reason: '误发' } },
		]);
	});

	it('allows only the deleted topic author to request topic restoration', async () => {
		const { sockets, reviewRequests, topics } = loadSockets({ topicDeleted: 1 });

		await assert.rejects(() => sockets.requestRestoreTopic({ uid: 'other' }, { tid: 55 }), /error:no-privileges/);

		const request = await sockets.requestRestoreTopic({ uid: 'author' }, { tid: 55, reason: '误删' });

		assert.strictEqual(request.tid, 55);
		assert.strictEqual(request.requesterUid, 'author');
		assert.strictEqual(reviewRequests.created.length, 1);
		assert.deepStrictEqual(topics.logged, [
			{ tid: 55, event: { type: 'variedmc-restore-requested', uid: 'author', reason: '误删' } },
		]);
	});

	it('allows only category admins or moderators to resolve requests', async () => {
		const { sockets, reviewRequests } = loadSockets();

		await assert.rejects(() => sockets.resolveRequest({ uid: 'user' }, { id: 'req-1', state: 'approved' }), /error:no-privileges/);

		const resolved = await sockets.resolveRequest({ uid: 'mod' }, {
			id: 'req-1',
			state: 'rejected',
			resolutionNote: '不符合',
		});

		assert.strictEqual(resolved.state, 'rejected');
		assert.strictEqual(resolved.resolverUid, 'mod');
		assert.strictEqual(reviewRequests.resolved.length, 1);
	});

	it('executes approved delete-topic requests and writes public timeline events', async () => {
		const { sockets, reviewRequests, topics } = loadSockets();

		const resolved = await sockets.resolveRequest({ uid: 'mod' }, {
			id: 'req-1',
			state: 'approved',
			resolutionNote: '同意',
		});

		assert.strictEqual(resolved.state, 'executed');
		assert.deepStrictEqual(topics.deleted, [{ tid: 55, uid: 'mod' }]);
		assert.deepStrictEqual(topics.logged, [
			{ tid: 55, event: { type: 'variedmc-delete-approved', uid: 'mod', reason: '误发', resolutionNote: '同意' } },
		]);
		assert.deepStrictEqual(reviewRequests.executed, ['req-1']);
	});

	it('executes approved restore-topic requests and writes public timeline events', async () => {
		const { sockets, reviewRequests, topics } = loadSockets({ requestType: 'restore-topic' });

		const resolved = await sockets.resolveRequest({ uid: 'mod' }, {
			id: 'req-1',
			state: 'approved',
			resolutionNote: '同意恢复',
		});

		assert.strictEqual(resolved.state, 'executed');
		assert.deepStrictEqual(topics.restored, [{ tid: 55, uid: 'mod' }]);
		assert.deepStrictEqual(topics.logged, [
			{ tid: 55, event: { type: 'variedmc-restore-approved', uid: 'mod', reason: '误发', resolutionNote: '同意恢复' } },
		]);
		assert.deepStrictEqual(reviewRequests.executed, ['req-1']);
	});

	it('does not approve delete-topic requests when soft delete execution fails', async () => {
		const { sockets, reviewRequests, topics } = loadSockets({ deleteError: new Error('delete failed') });

		await assert.rejects(() => sockets.resolveRequest({ uid: 'mod' }, {
			id: 'req-1',
			state: 'approved',
			resolutionNote: '同意',
		}), /delete failed/);

		assert.deepStrictEqual(reviewRequests.resolved, []);
		assert.deepStrictEqual(reviewRequests.executed, []);
		assert.deepStrictEqual(topics.logged, []);
	});

	it('rejects delete-topic requests without deleting topics and writes public timeline events', async () => {
		const { sockets, topics } = loadSockets();

		const resolved = await sockets.resolveRequest({ uid: 'mod' }, {
			id: 'req-1',
			state: 'rejected',
			resolutionNote: '不同意',
		});

		assert.strictEqual(resolved.state, 'rejected');
		assert.deepStrictEqual(topics.deleted, []);
		assert.deepStrictEqual(topics.logged, [
			{ tid: 55, event: { type: 'variedmc-delete-rejected', uid: 'mod', reason: '误发', resolutionNote: '不同意' } },
		]);
	});
});

function loadService() {
	const db = createMemoryDb();
	const originalRequire = require.main.require;
	require.main.require = (requestPath) => {
		if (requestPath === './src/database') {
			return db;
		}
		return originalRequire.call(require.main, requestPath);
	};
	const filename = path.join(__dirname, '../lib/domain/review-request-service.js');
	delete require.cache[require.resolve(filename)];
	const serviceModule = require(filename);
	require.main.require = originalRequire;
	return {
		db,
		service: serviceModule.withDatabase(db),
	};
}

function loadSockets(options = {}) {
	const requestType = options.requestType || 'delete-topic';
	const reviewRequests = {
		created: [],
		resolved: [],
		executed: [],
		get: async id => (id === 'req-1' ? { id, cid: 5, tid: 55, type: requestType, state: 'open', reason: '误发' } : null),
		createDeleteTopicRequest: async (input) => {
			reviewRequests.created.push(input);
			return { id: 'new-req', state: 'open', ...input };
		},
		createRestoreTopicRequest: async (input) => {
			reviewRequests.created.push(input);
			return { id: 'new-req', state: 'open', ...input };
		},
		resolve: async (id, input) => {
			reviewRequests.resolved.push({ id, input });
			return { id, cid: 5, tid: 55, type: requestType, reason: '误发', ...input };
		},
		markExecuted: async (id) => {
			reviewRequests.executed.push(id);
			return { id, cid: 5, tid: 55, type: requestType, state: 'executed' };
		},
	};
	const topics = {
		deleted: [],
		restored: [],
		logged: [],
		getTopicFields: async tid => (Number(tid) === 55 ? { tid: 55, cid: 5, uid: 'author', title: 'Topic', deleted: options.topicDeleted || 0 } : null),
		tools: {
			delete: async (tid, uid) => {
				if (options.deleteError) {
					throw options.deleteError;
				}
				topics.deleted.push({ tid, uid });
			},
			restore: async (tid, uid) => {
				topics.restored.push({ tid, uid });
			},
		},
		events: {
			log: async (tid, event) => topics.logged.push({ tid, event }),
		},
	};
	const settings = {
		saved: null,
		getAdminState: async () => ({ admin: true }),
		getSettings: async () => ({}),
		resolveRule: () => ({ enabled: true, deletePolicy: 'request-only', deleteGraceHours: 0 }),
		save: async (data) => {
			settings.saved = data;
		},
	};
	const originalRequire = require.main.require;
	require.main.require = (requestPath) => {
		if (requestPath === './src/topics') {
			return topics;
		}
		if (requestPath === './src/privileges') {
			return {
				admin: {
					can: async (privilege, uid) => privilege === 'admin:settings' && uid === 'admin',
				},
				categories: {
					isAdminOrMod: async (cid, uid) => Number(cid) === 5 && uid === 'mod',
				},
			};
		}
		if (requestPath === './src/database') {
			return { getSortedSetRange: async () => ['main'] };
		}
		if (requestPath === './src/posts') {
			return { getPostsFields: async () => [] };
		}
		return originalRequire.call(require.main, requestPath);
	};
	const servicePath = require.resolve('../lib/domain/review-request-service');
	const settingsPath = require.resolve('../lib/settings');
	const socketsPath = require.resolve('../lib/sockets');
	restoreMainRequire = originalRequire;
	require.cache[servicePath] = cacheEntry(servicePath, reviewRequests);
	require.cache[settingsPath] = cacheEntry(settingsPath, settings);
	delete require.cache[socketsPath];
	const sockets = require('../lib/sockets');
	return { sockets, reviewRequests, settings, topics };
}

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

function cacheEntry(filename, exports) {
	return {
		id: filename,
		filename,
		loaded: true,
		exports,
	};
}
