'use strict';

const realDb = require.main.require('./src/database');
const realUser = require.main.require('./src/user');

class ReputationActionService {
	constructor({ db, user }) {
		this.db = db;
		this.user = user;
	}

	static withDependencies(deps) {
		return new ReputationActionService(deps);
	}

	async recordDeduction(input) {
		const delta = Math.floor(Number(input.delta) || 0);
		if (delta >= 0) {
			throw new Error('[[error:invalid-data]]');
		}
		const now = Number(input.now) || Date.now();
		const action = {
			id: `reputation:${now}:${input.targetUid}:${input.actorUid}`,
			type: 'reputation-deduction',
			targetUid: Number(input.targetUid),
			actorUid: Number(input.actorUid),
			tid: Number(input.tid) || 0,
			pid: Number(input.pid) || 0,
			delta,
			reason: String(input.reason || '').trim(),
			evidenceUrl: String(input.evidenceUrl || '').trim(),
			createdAt: now,
		};
		await this.user.incrementUserReputationBy(action.targetUid, action.delta);
		await this.db.setObject(`variedmc:trust:action:${action.id}`, action);
		await Promise.all([
			this.db.sortedSetAdd('variedmc:trust:actions', action.createdAt, action.id),
			this.db.sortedSetAdd(`variedmc:trust:actions:byUid:${action.targetUid}`, action.createdAt, action.id),
			action.tid ? this.db.sortedSetAdd(`variedmc:trust:actions:byTid:${action.tid}`, action.createdAt, action.id) : null,
		]);
		return action;
	}
}

module.exports = ReputationActionService.withDependencies({ db: realDb, user: realUser });
module.exports.ReputationActionService = ReputationActionService;
module.exports.withDependencies = deps => new ReputationActionService(deps);
