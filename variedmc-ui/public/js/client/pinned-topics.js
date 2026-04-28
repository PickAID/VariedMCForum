(function () {
	'use strict';

	function run() {
		document.querySelectorAll('.page-category [data-widget-area="header"] .recent-cards-plugin')
			.forEach(enhancePinnedRail);
	}

	function enhancePinnedRail(rail) {
		rail.classList.add('variedmc-pinned-rail');

		rail.querySelectorAll('.topic-title a')
			.forEach((link) => {
				if (link.dataset.variedmcPinnedTitleCleaned === '1') {
					return;
				}

				const original = link.textContent || '';
				const cleaned = original.replace(/【[^】]*】/g, '').trim();
				if (cleaned) {
					link.textContent = cleaned;
					link.setAttribute('title', cleaned);
				}
				link.dataset.variedmcPinnedTitleCleaned = '1';
			});
	}

	window.VariedMCUiPinnedTopics = { run };
}());
