'use strict';

const assert = require('assert');
const path = require('path');

describe('VariedMC Rules trust mark service', () => {
	it('stores and indexes untrusted marks', async () => {
		const { service, db } = loadService();

		const mark = await service.markUntrusted({
			uid: 10,
			reason: '纠纷',
			evidenceUrl: 'https://example.com/evidence',
			sourceTid: 55,
			createdBy: 1,
			expiresAt: 5000,
			now: 1000,
		});

		assert.deepStrictEqual(mark, {
			uid: 10,
			level: 'untrusted',
			label: '失信用户',
			reason: '纠纷',
			evidenceUrl: 'https://example.com/evidence',
			sourceTid: 55,
			createdBy: 1,
			createdAt: 1000,
			expiresAt: 5000,
			publicVisible: true,
		});
		assert.deepStrictEqual(await service.get(10), mark);
		assert.strictEqual(await db.isSortedSetMember('variedmc:trust:users', 10), true);
	});

	it('clears trust marks and trust user index entries', async () => {
		const { service, db } = loadService();
		await service.markUntrusted({ uid: 10, reason: '纠纷', createdBy: 1, now: 1000 });

		await service.clear(10);

		assert.strictEqual(await service.get(10), null);
		assert.strictEqual(await db.isSortedSetMember('variedmc:trust:users', 10), false);
	});

	it('injects forced untrusted badge at the first selectedGroups slot', async () => {
		const { service } = loadService();
		await service.markUntrusted({
			uid: 10,
			reason: '纠纷',
			createdBy: 1,
			now: 1000,
			publicVisible: true,
		});

		const userData = await service.injectBadge({
			uid: 10,
			selectedGroups: [{ slug: 'member', userTitle: '成员' }],
		});

		assert.strictEqual(userData.selectedGroups[0].slug, 'variedmc-untrusted');
		assert.strictEqual(userData.selectedGroups[0].userTitle, '失信用户');
		assert.strictEqual(userData.selectedGroups[0].forced, true);
		assert.strictEqual(userData.selectedGroups[1].slug, 'member');
	});

	it('does not inject duplicate forced badges', async () => {
		const { service } = loadService();
		await service.markUntrusted({ uid: 10, reason: '纠纷', createdBy: 1, now: 1000 });

		const userData = await service.injectBadge({
			uid: 10,
			selectedGroups: [
				{ slug: 'variedmc-untrusted', userTitle: '旧失信用户' },
				{ slug: 'member', userTitle: '成员' },
			],
		});

		assert.deepStrictEqual(userData.selectedGroups.map(group => group.slug), ['variedmc-untrusted', 'member']);
		assert.strictEqual(userData.selectedGroups[0].userTitle, '失信用户');
	});

	it('does not inject private marks into public selectedGroups', async () => {
		const { service } = loadService();
		await service.markUntrusted({
			uid: 10,
			reason: '内部备注',
			createdBy: 1,
			now: 1000,
			publicVisible: false,
		});

		const userData = await service.injectBadge({ uid: 10, selectedGroups: [] });

		assert.deepStrictEqual(userData.selectedGroups, []);
	});
});

function loadService() {
	const store = new Map();
	const zsets = new Map();
	const db = {
		setObject: async (key, value) => store.set(key, { ...value }),
		getObject: async key => store.get(key) || null,
		delete: async key => store.delete(key),
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
	};
	const originalRequire = require.main.require;
	require.main.require = (requestPath) => {
		if (requestPath === './src/database') {
			return db;
		}
		return originalRequire.call(require.main, requestPath);
	};
	const filename = path.join(__dirname, '../lib/domain/trust-mark-service.js');
	delete require.cache[require.resolve(filename)];
	const serviceModule = require(filename);
	require.main.require = originalRequire;
	return {
		db,
		service: serviceModule.withDatabase(db),
	};
}
