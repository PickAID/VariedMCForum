'use strict';

class DeletePolicy {
	static requiresRequest(rule, topicData, context) {
		if (!rule || rule.deletePolicy === 'normal') {
			return false;
		}
		if (context.isAdminOrMod) {
			return false;
		}
		if (!DeletePolicy.isAuthor(topicData, context.uid)) {
			return false;
		}
		if (!DeletePolicy.requiresProtection(rule)) {
			return false;
		}
		return !DeletePolicy.canDirectDeleteInsideGrace(rule, topicData, context);
	}

	static requiresProtection(rule) {
		return rule && ['request-after-grace', 'request-only', 'locked'].includes(rule.deletePolicy);
	}

	static canDirectDeleteInsideGrace(rule, topicData, context) {
		return DeletePolicy.insideGrace(rule, topicData, context.now) &&
			Number(context.nonAuthorReplyCount) === 0;
	}

	static isAuthor(topicData, uid) {
		return String(topicData && topicData.uid) === String(uid);
	}

	static insideGrace(rule, topicData, now) {
		const hours = Math.max(0, Number(rule.deleteGraceHours) || 0);
		const timestamp = Number(topicData && topicData.timestamp) || 0;
		return timestamp > 0 && Number(now) - timestamp <= hours * 60 * 60 * 1000;
	}
}

module.exports = DeletePolicy;
