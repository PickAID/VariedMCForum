'use strict';

const realDb = require.main.require('./src/database');

const VALID_RESOLUTION_STATES = new Set(['approved', 'rejected', 'cancelled']);

class ReviewRequestService {
	constructor(db) {
		this.db = db;
	}

	static withDatabase(db) {
		return new ReviewRequestService(db);
	}

	async createDeleteTopicRequest(input) {
		const existing = await this.findOpenDeleteRequest(input.tid, input.requesterUid);
		if (existing) {
			throw new Error('[[error:variedmc-rules-duplicate-delete-request]]');
		}
		const now = Number(input.now) || Date.now();
		const request = {
			id: `delete-topic:${now}:${input.tid}:${input.requesterUid}`,
			type: 'delete-topic',
			state: 'open',
			tid: Number(input.tid),
			cid: Number(input.cid),
			requesterUid: Number(input.requesterUid),
			targetUid: Number(input.targetUid),
			reason: String(input.reason || '').trim(),
			resolverUid: 0,
			resolutionNote: '',
			createdAt: now,
			resolvedAt: 0,
		};
		await this.save(request);
		return request;
	}

	async findOpenDeleteRequest(tid, requesterUid) {
		const ids = await this.db.getSortedSetRevRange('variedmc:review-requests:byState:open', 0, -1);
		const requests = await Promise.all(ids.map(id => this.get(id)));
		return requests.find(request => request &&
			request.type === 'delete-topic' &&
			String(request.tid) === String(tid) &&
			String(request.requesterUid) === String(requesterUid));
	}

	async get(id) {
		return await this.db.getObject(`variedmc:review-request:${id}`);
	}

	async listByState(state, start = 0, stop = 49) {
		const ids = await this.db.getSortedSetRevRange(`variedmc:review-requests:byState:${state}`, start, stop);
		return (await Promise.all(ids.map(id => this.get(id)))).filter(Boolean);
	}

	async resolve(id, input) {
		if (!VALID_RESOLUTION_STATES.has(input.state)) {
			throw new Error('[[error:invalid-data]]');
		}
		const request = await this.get(id);
		if (!request || request.state !== 'open') {
			throw new Error('[[error:invalid-data]]');
		}
		const next = {
			...request,
			state: input.state,
			resolverUid: Number(input.resolverUid) || 0,
			resolutionNote: String(input.resolutionNote || '').trim(),
			resolvedAt: Number(input.now) || Date.now(),
		};
		await this.transition(request, next);
		return next;
	}

	async save(request) {
		await this.db.setObject(`variedmc:review-request:${request.id}`, request);
		await this.index(request);
	}

	async transition(previous, next) {
		await this.db.sortedSetRemove(`variedmc:review-requests:byState:${previous.state}`, previous.id);
		await this.save(next);
	}

	async index(request) {
		await Promise.all([
			this.db.sortedSetAdd('variedmc:review-requests', request.createdAt, request.id),
			this.db.sortedSetAdd(`variedmc:review-requests:byState:${request.state}`, request.createdAt, request.id),
			this.db.sortedSetAdd(`variedmc:review-requests:byType:${request.type}`, request.createdAt, request.id),
			this.db.sortedSetAdd(`variedmc:review-requests:byCid:${request.cid}`, request.createdAt, request.id),
			this.db.sortedSetAdd(`variedmc:review-requests:byRequester:${request.requesterUid}`, request.createdAt, request.id),
		]);
	}
}

module.exports = ReviewRequestService.withDatabase(realDb);
module.exports.ReviewRequestService = ReviewRequestService;
module.exports.withDatabase = db => new ReviewRequestService(db);
