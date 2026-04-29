'use strict';

const { DEFAULT_RULE } = require('./defaults');
const KeyNormalizer = require('./key-normalizer');

const MERGE_FIELDS = [
	'enabled',
	'traceRequired',
	'deletePolicy',
	'deleteGraceHours',
	'minimumTopicContentLength',
	'minimumReplyContentLength',
	'moderatorLengthBypass',
	'trustBadgeVisible',
	'rulesText',
];

class RuleResolver {
	static resolve(settings, cid) {
		const targetCid = KeyNormalizer.cid(cid);
		const chain = RuleResolver.chain(settings.categoryHierarchy || {}, targetCid);
		let resolved = { ...DEFAULT_RULE, ...(settings.globalRule || {}) };
		let sources = Object.fromEntries(MERGE_FIELDS.map(field => [field, { cid: 0, scope: 'global' }]));

		for (const chainCid of chain) {
			const local = settings.categoryRules && settings.categoryRules[String(chainCid)];
			if (!local || local.scope === 'inherit') {
				continue;
			}
			if (local.scope === 'disabled') {
				return {
					...DEFAULT_RULE,
					cid: targetCid,
					enabled: false,
					sources: { disabled: { cid: chainCid, scope: 'disabled' } },
				};
			}
			if (local.scope === 'override') {
				resolved = { ...DEFAULT_RULE, enabled: true, ...RuleResolver.localFields(local) };
				sources = RuleResolver.sourcesFor(local, chainCid);
				continue;
			}
			resolved = { ...resolved, ...RuleResolver.localFields(local) };
			sources = {
				...sources,
				...RuleResolver.sourcesFor(local, chainCid),
			};
		}

		return {
			...resolved,
			cid: targetCid,
			enabled: !!settings.enabled && resolved.enabled !== false,
			sources,
		};
	}

	static chain(hierarchy, cid) {
		const chain = [];
		const seen = new Set();
		let current = cid;
		while (current > 0 && !seen.has(current)) {
			seen.add(current);
			chain.unshift(current);
			current = KeyNormalizer.cid(hierarchy[String(current)]);
		}
		return chain;
	}

	static localFields(rule) {
		return Object.fromEntries(MERGE_FIELDS.filter(field => Object.prototype.hasOwnProperty.call(rule, field)).map(field => [
			field,
			rule[field],
		]));
	}

	static sourcesFor(rule, cid) {
		return Object.fromEntries(Object.keys(RuleResolver.localFields(rule)).map(field => [
			field,
			{ cid, scope: rule.scope },
		]));
	}
}

module.exports = RuleResolver;
