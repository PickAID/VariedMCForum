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
		'../lib/domain/reputation-action-service',
		'../lib/domain/trust-mark-service',
		'../lib/settings',
		'../lib/sockets',
	]) {
		try {
			delete require.cache[require.resolve(filename)];
		} catch (err) {
			// Module may not exist yet during the red phase.
		}
	}
});

describe('VariedMC Rules reputation action service', () => {
	it('rejects non-negative reputation deltas', async () => {
		const { service } = loadService();

		await assert.rejects(() => service.recordDeduction({
			targetUid: 10,
			actorUid: 1,
			delta: 0,
			reason: 'bad input',
		}), /error:invalid-data/);
		await assert.rejects(() => service.recordDeduction({
			targetUid: 10,
			actorUid: 1,
			delta: 5,
			reason: 'bad input',
		}), /error:invalid-data/);
	});

	it('records and indexes a negative reputation delta action', async () => {
		const { service, calls, db } = loadService();
		const action = await service.recordDeduction({
			targetUid: 10,
			actorUid: 1,
			tid: 55,
			delta: -10,
			reason: '纠纷',
			evidenceUrl: '/topic/test-topic',
			now: 1000,
		});

		assert.strictEqual(action.delta, -10);
		assert.strictEqual(action.type, 'reputation-deduction');
		assert.strictEqual(action.evidenceUrl, '/topic/test-topic');
		assert.deepStrictEqual(calls.reputation, [{ uid: 10, delta: -10 }]);
		assert.deepStrictEqual(calls.objects.map(item => item.key), [`variedmc:trust:action:${action.id}`]);
		assert.strictEqual(await db.isSortedSetMember('variedmc:trust:actions', action.id), true);
		assert.strictEqual(await db.isSortedSetMember('variedmc:trust:actions:byUid:10', action.id), true);
		assert.strictEqual(await db.isSortedSetMember('variedmc:trust:actions:byTid:55', action.id), true);
	});
});

describe('VariedMC Rules governance action socket', () => {
	it('allows only category admins or moderators to apply governance actions', async () => {
		const { sockets } = loadSockets();

		await assert.rejects(() => sockets.applyGovernanceAction({ uid: 'user' }, {
			tid: 55,
			delta: -10,
			reason: '纠纷',
		}), /error:no-privileges/);
	});

	it('deducts reputation, marks untrusted users, and logs topic events', async () => {
		const { sockets, reputationActions, trustMarks, topics } = loadSockets();

		const result = await sockets.applyGovernanceAction({ uid: 'mod' }, {
			tid: 55,
			delta: -10,
			markUntrusted: true,
			reason: '纠纷',
		});

		assert.deepStrictEqual(reputationActions.deductions, [{
			targetUid: 'author',
			actorUid: 'mod',
			tid: 55,
			delta: -10,
			reason: '纠纷',
			evidenceUrl: '/topic/test-topic',
		}]);
		assert.deepStrictEqual(trustMarks.marks, [{
			uid: 'author',
			reason: '纠纷',
			evidenceUrl: '/topic/test-topic',
			sourceTid: 55,
			createdBy: 'mod',
			publicVisible: true,
		}]);
		assert.strictEqual(result.reputationAction.id, 'rep-action');
		assert.strictEqual(result.trustMark.uid, 'author');
		assert.deepStrictEqual(topics.logged, [
			{ tid: 55, event: { type: 'variedmc-governance-action', uid: 'mod' } },
		]);
	});

	it('supports private trust marks and mark-only actions', async () => {
		const { sockets, reputationActions, trustMarks } = loadSockets();

		const result = await sockets.applyGovernanceAction({ uid: 'mod' }, {
			tid: 55,
			delta: '',
			markUntrusted: true,
			publicVisible: false,
			reason: '内部备注',
		});

		assert.strictEqual(result.reputationAction, null);
		assert.deepStrictEqual(reputationActions.deductions, []);
		assert.strictEqual(trustMarks.marks[0].publicVisible, false);
	});

	it('rejects invalid or empty governance actions without side effects', async () => {
		for (const payload of [
			{ tid: 55, delta: 0, reason: 'zero' },
			{ tid: 55, delta: 5, reason: 'positive' },
			{ tid: 55, reason: 'empty' },
		]) {
			const { sockets, reputationActions, trustMarks, topics } = loadSockets();

			await assert.rejects(() => sockets.applyGovernanceAction({ uid: 'mod' }, payload), /error:invalid-data/);

			assert.deepStrictEqual(reputationActions.deductions, []);
			assert.deepStrictEqual(trustMarks.marks, []);
			assert.deepStrictEqual(topics.logged, []);
		}
	});
});

function loadService() {
	const calls = { reputation: [], objects: [] };
	const zsets = new Map();
	const db = {
		setObject: async (key, value) => calls.objects.push({ key, value }),
		sortedSetAdd: async (key, score, value) => {
			const set = zsets.get(key) || new Map();
			set.set(String(value), score);
			zsets.set(key, set);
		},
		isSortedSetMember: async (key, value) => !!(zsets.get(key) && zsets.get(key).has(String(value))),
	};
	const user = {
		incrementUserReputationBy: async (uid, delta) => calls.reputation.push({ uid, delta }),
	};
	const originalRequire = require.main.require;
	require.main.require = (requestPath) => {
		if (requestPath === './src/database') {
			return db;
		}
		if (requestPath === './src/user') {
			return user;
		}
		return originalRequire.call(require.main, requestPath);
	};
	const filename = path.join(__dirname, '../lib/domain/reputation-action-service.js');
	delete require.cache[require.resolve(filename)];
	const serviceModule = require(filename);
	require.main.require = originalRequire;
	return {
		calls,
		db,
		service: serviceModule.withDependencies({ db, user }),
	};
}

function loadSockets() {
	const topics = {
		logged: [],
		getTopicFields: async tid => (Number(tid) === 55 ? {
			tid: 55,
			cid: 5,
			uid: 'author',
			slug: 'test-topic',
		} : null),
		events: {
			log: async (tid, event) => topics.logged.push({ tid, event }),
		},
	};
	const privileges = {
		admin: {
			can: async () => false,
		},
		categories: {
			isAdminOrMod: async (cid, uid) => Number(cid) === 5 && uid === 'mod',
		},
	};
	const reputationActions = {
		deductions: [],
		recordDeduction: async (input) => {
			reputationActions.deductions.push(input);
			return { id: 'rep-action', ...input };
		},
	};
	const trustMarks = {
		marks: [],
		markUntrusted: async (input) => {
			trustMarks.marks.push(input);
			return { level: 'untrusted', ...input };
		},
	};
	const originalRequire = require.main.require;
	require.main.require = (requestPath) => {
		if (requestPath === './src/topics') {
			return topics;
		}
		if (requestPath === './src/privileges') {
			return privileges;
		}
		return originalRequire.call(require.main, requestPath);
	};
	const reputationPath = require.resolve('../lib/domain/reputation-action-service');
	const trustMarkPath = require.resolve('../lib/domain/trust-mark-service');
	const settingsPath = require.resolve('../lib/settings');
	const socketsPath = require.resolve('../lib/sockets');
	restoreMainRequire = originalRequire;
	require.cache[reputationPath] = cacheEntry(reputationPath, reputationActions);
	require.cache[trustMarkPath] = cacheEntry(trustMarkPath, trustMarks);
	require.cache[settingsPath] = cacheEntry(settingsPath, {
		getAdminState: async () => ({}),
		save: async () => {},
	});
	delete require.cache[socketsPath];
	const sockets = require('../lib/sockets');
	return { sockets, reputationActions, trustMarks, topics };
}

function cacheEntry(filename, exports) {
	return {
		id: filename,
		filename,
		loaded: true,
		exports,
	};
}
