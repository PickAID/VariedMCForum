(function (root, factory) {
	'use strict';

	const api = factory();
	if (typeof module === 'object' && module.exports) {
		module.exports = api;
	}
	root.VariedMCRulesPolicy = api;
}(typeof window !== 'undefined' ? window : globalThis, function () {
	'use strict';

	function canBypassLength(user, pageData, rule) {
		if (user && user.isAdmin) {
			return true;
		}
		return !!(
			rule &&
			rule.moderatorLengthBypass &&
			pageData &&
			pageData.privileges &&
			pageData.privileges.isAdminOrMod
		);
	}

	function shouldRequestReviewForDeleteAction(options) {
		const pageData = options && options.pageData || {};
		const rule = options && options.rule;
		const user = options && options.user;
		const targetComponent = options && options.targetComponent;
		if (!options || !options.isTopicPage || !user || !user.uid) {
			return false;
		}
		if (!rule || !rule.enabled || !requiresDeleteProtection(rule)) {
			return false;
		}
		if (pageData.privileges && pageData.privileges.isAdminOrMod) {
			return false;
		}
		if (String(pageData.uid) !== String(user.uid)) {
			return false;
		}
		if (targetComponent === 'topic/restore') {
			return !!Number(pageData.deleted);
		}
		if (Number(pageData.deleted)) {
			return false;
		}
		if (targetComponent === 'post/delete' && !options.isMainPostDelete) {
			return false;
		}
		return !insideDeleteGrace(rule, options.topicTimestamp, options.now) ||
			hasNonAuthorReply(options.postNodes, pageData.uid);
	}

	function requiresDeleteProtection(rule) {
		return rule && ['request-after-grace', 'request-only', 'locked'].includes(rule.deletePolicy);
	}

	function insideDeleteGrace(rule, timestamp, now) {
		const hours = Math.max(0, Number(rule && rule.deleteGraceHours) || 0);
		const base = Number(timestamp) || 0;
		return hours > 0 && base > 0 && Number(now || Date.now()) - base <= hours * 60 * 60 * 1000;
	}

	function hasNonAuthorReply(postNodes, authorUid) {
		if (authorUid == null) {
			return false;
		}
		return toArray(postNodes).some(function (post) {
			const index = attr(post, 'data-index');
			const uid = attr(post, 'data-uid');
			if (index == null || index === '' || uid == null || uid === '') {
				return false;
			}
			return String(index) !== '0' && String(uid) !== String(authorUid);
		});
	}

	function toArray(value) {
		if (!value) {
			return [];
		}
		return Array.isArray(value) ? value : Array.prototype.slice.call(value);
	}

	function attr(node, name) {
		if (!node) {
			return null;
		}
		if (typeof node.getAttribute === 'function') {
			return node.getAttribute(name);
		}
		return node[name] == null ? null : node[name];
	}

	return {
		canBypassLength,
		hasNonAuthorReply,
		insideDeleteGrace,
		requiresDeleteProtection,
		shouldRequestReviewForDeleteAction,
	};
}));
