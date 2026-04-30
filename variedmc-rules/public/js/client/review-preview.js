(function (root, factory) {
	'use strict';

	const api = factory();
	if (typeof module === 'object' && module.exports) {
		module.exports = api;
	}
	root.VariedMCRulesReviewPreview = api;
}(typeof window !== 'undefined' ? window : globalThis, function () {
	'use strict';

	function buildEditComposerPayload(pid, draft) {
		const payload = { pid };
		if (draft && draft.content) {
			payload.body = draft.content;
		}
		if (draft && draft.title) {
			payload.title = draft.title;
		}
		return payload;
	}

	function readCardDraft(card) {
		const read = selector => {
			const el = card && card.querySelector(selector);
			return el ? el.value || el.textContent || '' : '';
		};
		return {
			pid: card && card.getAttribute('data-main-pid'),
			title: card && card.getAttribute('data-proposed-title') || '',
			proposedContent: read('[data-role="proposed-content"]'),
		};
	}

	return {
		buildEditComposerPayload,
		readCardDraft,
	};
}));
