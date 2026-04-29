'use strict';

const { DELETE_POLICIES, RULE_SCOPES, DEFAULT_RULE, defaultSettings } = require('./defaults');
const KeyNormalizer = require('./key-normalizer');

class RuleNormalizer {
	static normalize(input = {}) {
		const settings = {
			...defaultSettings,
			...input,
			globalRule: RuleNormalizer.rule({
				...defaultSettings.globalRule,
				...(input.globalRule || {}),
			}),
			categoryRules: RuleNormalizer.categoryRules(input.categoryRules || {}),
			categoryHierarchy: RuleNormalizer.categoryHierarchy(input.categoryHierarchy || {}),
			reputationPresets: RuleNormalizer.reputationPresets(input.reputationPresets),
		};
		settings.enabled = Object.prototype.hasOwnProperty.call(input, 'enabled') ? KeyNormalizer.bool(input.enabled) : true;
		settings.allowCategoryModeratorsTrustTools = KeyNormalizer.bool(settings.allowCategoryModeratorsTrustTools);
		settings.notifyTrustChanges = Object.prototype.hasOwnProperty.call(input, 'notifyTrustChanges') ?
			KeyNormalizer.bool(input.notifyTrustChanges) : true;
		return settings;
	}

	static categoryRules(input) {
		return Object.fromEntries(Object.entries(input || {}).map(([cid, rule]) => [
			String(KeyNormalizer.cid(cid)),
			RuleNormalizer.scopedRule(rule),
		]).filter(([cid]) => cid !== '0'));
	}

	static categoryHierarchy(input) {
		return Object.fromEntries(Object.entries(input || {}).map(([cid, parentCid]) => [
			String(KeyNormalizer.cid(cid)),
			KeyNormalizer.cid(parentCid),
		]).filter(([cid]) => cid !== '0'));
	}

	static scopedRule(input = {}) {
		const scope = RULE_SCOPES.has(input.scope) ? input.scope : 'inherit';
		const normalized = RuleNormalizer.rule(input);
		return {
			scope,
			...Object.fromEntries(Object.keys(normalized).filter(field => (
				Object.prototype.hasOwnProperty.call(input, field)
			)).map(field => [field, normalized[field]])),
		};
	}

	static rule(input = {}) {
		const deletePolicy = DELETE_POLICIES.has(input.deletePolicy) ? input.deletePolicy : DEFAULT_RULE.deletePolicy;
		return {
			enabled: Object.prototype.hasOwnProperty.call(input, 'enabled') ? KeyNormalizer.bool(input.enabled) : true,
			traceRequired: KeyNormalizer.bool(input.traceRequired),
			deletePolicy,
			deleteGraceHours: Math.max(0, KeyNormalizer.number(input.deleteGraceHours, DEFAULT_RULE.deleteGraceHours)),
			minimumTopicContentLength: Math.max(0, Math.floor(KeyNormalizer.number(input.minimumTopicContentLength, 0))),
			minimumReplyContentLength: Math.max(0, Math.floor(KeyNormalizer.number(input.minimumReplyContentLength, 0))),
			moderatorLengthBypass: KeyNormalizer.bool(input.moderatorLengthBypass),
			trustBadgeVisible: Object.prototype.hasOwnProperty.call(input, 'trustBadgeVisible') ?
				KeyNormalizer.bool(input.trustBadgeVisible) : true,
			rulesText: KeyNormalizer.text(input.rulesText),
		};
	}

	static reputationPresets(input) {
		const values = Array.isArray(input) ? input : defaultSettings.reputationPresets;
		return values.map(value => Math.floor(KeyNormalizer.number(value, 0))).filter(value => value < 0);
	}
}

module.exports = RuleNormalizer;
