'use strict';

const realDb = require.main.require('./src/database');

const TRUST_BADGE = Object.freeze({
	name: 'variedmc:untrusted',
	slug: 'variedmc-untrusted',
	labelColor: '#7F1D1D',
	textColor: '#FFFFFF',
	icon: 'fa-triangle-exclamation',
	userTitle: '失信用户',
	forced: true,
});

class TrustMarkService {
	constructor(db) {
		this.db = db;
	}

	static withDatabase(db) {
		return new TrustMarkService(db);
	}

	async markUntrusted(input) {
		const now = Number(input.now) || Date.now();
		const mark = {
			uid: Number(input.uid),
			level: 'untrusted',
			label: '失信用户',
			reason: String(input.reason || '').trim(),
			evidenceUrl: String(input.evidenceUrl || '').trim(),
			sourceTid: Number(input.sourceTid) || 0,
			createdBy: Number(input.createdBy) || 0,
			createdAt: now,
			expiresAt: Number(input.expiresAt) || 0,
			publicVisible: input.publicVisible !== false,
		};
		await this.db.setObject(`variedmc:trust:user:${mark.uid}`, mark);
		await this.db.sortedSetAdd('variedmc:trust:users', now, mark.uid);
		return mark;
	}

	async clear(uid) {
		await this.db.delete(`variedmc:trust:user:${Number(uid)}`);
		await this.db.sortedSetRemove('variedmc:trust:users', Number(uid));
	}

	async get(uid) {
		return await this.db.getObject(`variedmc:trust:user:${Number(uid)}`);
	}

	async injectBadge(userData) {
		if (!userData || !userData.uid) {
			return userData;
		}
		const mark = await this.get(userData.uid);
		if (!mark || mark.level !== 'untrusted' || mark.publicVisible === false) {
			return userData;
		}
		const selectedGroups = Array.isArray(userData.selectedGroups) ? userData.selectedGroups : [];
		userData.selectedGroups = [
			{ ...TRUST_BADGE },
			...selectedGroups.filter(group => group && group.slug !== TRUST_BADGE.slug),
		];
		return userData;
	}
}

module.exports = TrustMarkService.withDatabase(realDb);
module.exports.TrustMarkService = TrustMarkService;
module.exports.withDatabase = db => new TrustMarkService(db);
