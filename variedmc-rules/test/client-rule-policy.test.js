'use strict';

const assert = require('assert');

describe('VariedMC Rules client rule policy', () => {
	let policy;

	beforeEach(() => {
		delete require.cache[require.resolve('../public/js/client/rule-policy')];
		policy = require('../public/js/client/rule-policy');
	});

	it('lets administrators bypass custom composer length checks', () => {
		assert.strictEqual(policy.canBypassLength({ isAdmin: true }, {}, {
			minimumTopicContentLength: 100,
		}), true);
	});

	it('only lets moderators bypass when the rule allows it', () => {
		const pageData = { privileges: { isAdminOrMod: true } };

		assert.strictEqual(policy.canBypassLength({}, pageData, { moderatorLengthBypass: true }), true);
		assert.strictEqual(policy.canBypassLength({}, pageData, { moderatorLengthBypass: false }), false);
	});

	it('does not bypass normal users', () => {
		assert.strictEqual(policy.canBypassLength({ isAdmin: false }, {}, {
			moderatorLengthBypass: true,
		}), false);
	});

	it('ignores malformed post nodes when detecting non-author replies', () => {
		const posts = [
			node({}),
			node({ 'data-index': '0', 'data-uid': 'author' }),
			node({ 'data-index': '1' }),
			node({ 'data-uid': 'other' }),
		];

		assert.strictEqual(policy.hasNonAuthorReply(posts, 'author'), false);
	});

	it('detects visible non-author replies with explicit index and uid', () => {
		const posts = [
			node({ 'data-index': '0', 'data-uid': 'author' }),
			node({ 'data-index': '1', 'data-uid': 'other' }),
		];

		assert.strictEqual(policy.hasNonAuthorReply(posts, 'author'), true);
	});

	it('keeps direct delete inside grace when only the author post is visible', () => {
		const now = Date.now();
		const result = policy.shouldRequestReviewForDeleteAction({
			isTopicPage: true,
			user: { uid: 'author' },
			pageData: { uid: 'author', deleted: 0 },
			rule: { enabled: true, traceRequired: true, deletePolicy: 'request-after-grace', deleteGraceHours: 0.5 },
			targetComponent: 'post/delete',
			isMainPostDelete: true,
			topicTimestamp: now,
			postNodes: [node({ 'data-index': '0', 'data-uid': 'author' }), node({})],
			now,
		});

		assert.strictEqual(result, false);
	});

	it('keeps direct delete inside grace for request-only policy', () => {
		const now = Date.now();
		const result = policy.shouldRequestReviewForDeleteAction({
			isTopicPage: true,
			user: { uid: 'author' },
			pageData: { uid: 'author', deleted: 0 },
			rule: { enabled: true, deletePolicy: 'request-only', deleteGraceHours: 0.5 },
			targetComponent: 'topic/delete',
			topicTimestamp: now,
			postNodes: [node({ 'data-index': '0', 'data-uid': 'author' })],
			now,
		});

		assert.strictEqual(result, false);
	});

	it('requests review inside grace after a non-author reply is visible', () => {
		const now = Date.now();
		const result = policy.shouldRequestReviewForDeleteAction({
			isTopicPage: true,
			user: { uid: 'author' },
			pageData: { uid: 'author', deleted: 0 },
			rule: { enabled: true, traceRequired: true, deletePolicy: 'request-after-grace', deleteGraceHours: 0.5 },
			targetComponent: 'topic/delete',
			topicTimestamp: now,
			postNodes: [node({ 'data-index': '0', 'data-uid': 'author' }), node({ 'data-index': '1', 'data-uid': 'other' })],
			now,
		});

		assert.strictEqual(result, true);
	});

	it('does not intercept reply deletes', () => {
		const result = policy.shouldRequestReviewForDeleteAction({
			isTopicPage: true,
			user: { uid: 'author' },
			pageData: { uid: 'author', deleted: 0 },
			rule: { enabled: true, traceRequired: true, deletePolicy: 'request-only' },
			targetComponent: 'post/delete',
			isMainPostDelete: false,
			postNodes: [],
		});

		assert.strictEqual(result, false);
	});

	function node(attrs) {
		return {
			getAttribute(name) {
				return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null;
			},
		};
	}
});
