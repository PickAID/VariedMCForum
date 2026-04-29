'use strict';

const SETTINGS_KEY = 'variedmc-rules';

const DELETE_POLICIES = new Set(['normal', 'request-after-grace', 'request-only', 'locked']);
const RULE_SCOPES = new Set(['inherit', 'extend', 'override', 'disabled']);

const DEFAULT_RULE = Object.freeze({
	enabled: false,
	traceRequired: false,
	deletePolicy: 'normal',
	deleteGraceHours: 0.5,
	minimumTopicContentLength: 0,
	minimumReplyContentLength: 0,
	moderatorLengthBypass: false,
	trustBadgeVisible: true,
	rulesText: '',
});

const defaultSettings = Object.freeze({
	enabled: true,
	globalRule: DEFAULT_RULE,
	categoryRules: {},
	categoryHierarchy: {},
	reputationPresets: [-5, -10, -20],
	allowCategoryModeratorsTrustTools: false,
	notifyTrustChanges: true,
});

module.exports = {
	SETTINGS_KEY,
	DELETE_POLICIES,
	RULE_SCOPES,
	DEFAULT_RULE,
	defaultSettings,
};
