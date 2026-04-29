'use strict';

class DeletePolicy {
	static requiresRequest(rule, topicData, context) {
		if (!rule || !rule.traceRequired || rule.deletePolicy === 'normal') {
			return false;
		}
		if (context.isAdminOrMod) {
			return false;
		}
		if (!DeletePolicy.isAuthor(topicData, context.uid)) {
			return false;
		}
		if (rule.deletePolicy === 'request-only' || rule.deletePolicy === 'locked') {
			return true;
		}
		if (rule.deletePolicy !== 'request-after-grace') {
			return false;
		}
		return !DeletePolicy.insideGrace(rule, topicData, context.now) || context.nonAuthorReplyCount > 0;
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
