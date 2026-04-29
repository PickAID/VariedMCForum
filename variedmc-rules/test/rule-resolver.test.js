'use strict';

const assert = require('assert');

const RuleNormalizer = require('../lib/domain/rule-normalizer');
const RuleResolver = require('../lib/domain/rule-resolver');

describe('VariedMC Rules resolver', () => {
	it('normalizes ACP string booleans for settings and rules', () => {
		const settings = RuleNormalizer.normalize({
			enabled: 'false',
			notifyTrustChanges: 'false',
			globalRule: {
				enabled: 'false',
				trustBadgeVisible: 'false',
				traceRequired: 'true',
			},
		});

		assert.strictEqual(settings.enabled, false);
		assert.strictEqual(settings.notifyTrustChanges, false);
		assert.strictEqual(settings.globalRule.enabled, false);
		assert.strictEqual(settings.globalRule.trustBadgeVisible, false);
		assert.strictEqual(settings.globalRule.traceRequired, true);
	});

	it('preserves boolean defaults when omitted', () => {
		const settings = RuleNormalizer.normalize();

		assert.strictEqual(settings.enabled, true);
		assert.strictEqual(settings.notifyTrustChanges, true);
		assert.strictEqual(settings.globalRule.enabled, false);
		assert.strictEqual(settings.globalRule.trustBadgeVisible, true);
	});

	it('resolves global, parent extend, and child extend in order', () => {
		const settings = RuleNormalizer.normalize({
			globalRule: {
				enabled: true,
				traceRequired: true,
				deletePolicy: 'request-after-grace',
				deleteGraceHours: 0.5,
				minimumTopicContentLength: 100,
				rulesText: 'global',
			},
			categoryHierarchy: { 5: 0, 6: 5 },
			categoryRules: {
				5: {
					scope: 'extend',
					minimumTopicContentLength: 200,
					rulesText: 'parent',
				},
				6: {
					scope: 'extend',
					deleteGraceHours: 1,
				},
			},
		});

		const rule = RuleResolver.resolve(settings, 6);

		assert.strictEqual(rule.cid, 6);
		assert.strictEqual(rule.enabled, true);
		assert.strictEqual(rule.traceRequired, true);
		assert.strictEqual(rule.deletePolicy, 'request-after-grace');
		assert.strictEqual(rule.deleteGraceHours, 1);
		assert.strictEqual(rule.minimumTopicContentLength, 200);
		assert.strictEqual(rule.rulesText, 'parent');
		assert.deepStrictEqual(rule.sources.minimumTopicContentLength, { cid: 5, scope: 'extend' });
	});

	it('does not inherit parent settings when child overrides', () => {
		const settings = RuleNormalizer.normalize({
			globalRule: {
				enabled: true,
				traceRequired: true,
				deletePolicy: 'request-after-grace',
				minimumTopicContentLength: 100,
			},
			categoryHierarchy: { 5: 0, 6: 5 },
			categoryRules: {
				5: { scope: 'extend', minimumTopicContentLength: 200 },
				6: { scope: 'override', traceRequired: false, deletePolicy: 'normal' },
			},
		});

		const rule = RuleResolver.resolve(settings, 6);

		assert.strictEqual(rule.enabled, true);
		assert.strictEqual(rule.traceRequired, false);
		assert.strictEqual(rule.deletePolicy, 'normal');
		assert.strictEqual(rule.minimumTopicContentLength, 0);
	});

	it('disables rules when category scope is disabled', () => {
		const settings = RuleNormalizer.normalize({
			globalRule: { enabled: true, traceRequired: true },
			categoryHierarchy: { 5: 0 },
			categoryRules: { 5: { scope: 'disabled' } },
		});

		const rule = RuleResolver.resolve(settings, 5);

		assert.strictEqual(rule.enabled, false);
		assert.strictEqual(rule.traceRequired, false);
	});
});
