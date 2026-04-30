'use strict';

const assert = require('assert');
const DeletePolicy = require('../lib/domain/delete-policy');

describe('VariedMC Rules delete policy', () => {
	const topic = { tid: 55, uid: 10, timestamp: 1000, deleted: 0 };

	it('allows normal policy', () => {
		assert.strictEqual(DeletePolicy.requiresRequest({ deletePolicy: 'normal' }, topic, {
			uid: 10,
			now: 100000,
			nonAuthorReplyCount: 20,
			isAdminOrMod: false,
		}), false);
	});

	it('allows author direct delete inside grace with no non-author replies', () => {
		assert.strictEqual(DeletePolicy.requiresRequest({
			traceRequired: true,
			deletePolicy: 'request-after-grace',
			deleteGraceHours: 0.5,
		}, topic, {
			uid: 10,
			now: 1000 + 30 * 60 * 1000,
			nonAuthorReplyCount: 0,
			isAdminOrMod: false,
		}), false);
	});

	it('requires request after grace expires', () => {
		assert.strictEqual(DeletePolicy.requiresRequest({
			traceRequired: true,
			deletePolicy: 'request-after-grace',
			deleteGraceHours: 0.5,
		}, topic, {
			uid: 10,
			now: 1000 + 31 * 60 * 1000,
			nonAuthorReplyCount: 0,
			isAdminOrMod: false,
		}), true);
	});

	it('requires request after non-author replies', () => {
		assert.strictEqual(DeletePolicy.requiresRequest({
			traceRequired: true,
			deletePolicy: 'request-after-grace',
			deleteGraceHours: 0.5,
		}, topic, {
			uid: 10,
			now: 1000 + 5 * 60 * 1000,
			nonAuthorReplyCount: 1,
			isAdminOrMod: false,
		}), true);
	});

	it('still honors grace for request-only policies', () => {
		assert.strictEqual(DeletePolicy.requiresRequest({
			deletePolicy: 'request-only',
			deleteGraceHours: 0.5,
		}, topic, {
			uid: 10,
			now: 1000 + 5 * 60 * 1000,
			nonAuthorReplyCount: 0,
			isAdminOrMod: false,
		}), false);
	});

	it('requires request-only deletes after grace', () => {
		assert.strictEqual(DeletePolicy.requiresRequest({
			deletePolicy: 'request-only',
			deleteGraceHours: 0.5,
		}, topic, {
			uid: 10,
			now: 1000 + 31 * 60 * 1000,
			nonAuthorReplyCount: 0,
			isAdminOrMod: false,
		}), true);
	});

	it('does not block moderators', () => {
		assert.strictEqual(DeletePolicy.requiresRequest({
			traceRequired: true,
			deletePolicy: 'request-only',
		}, topic, {
			uid: 2,
			now: 100000,
			nonAuthorReplyCount: 3,
			isAdminOrMod: true,
		}), false);
	});
});
