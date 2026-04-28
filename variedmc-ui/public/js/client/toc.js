(function () {
	'use strict';

	let scheduled = false;

	function init() {
		window.addEventListener('scroll', scheduleSync, { passive: true });
		window.addEventListener('resize', scheduleSync, { passive: true });
		sync();
	}

	function scheduleSync() {
		if (scheduled) {
			return;
		}
		scheduled = true;
		window.requestAnimationFrame(() => {
			scheduled = false;
			sync();
		});
	}

	function sync() {
		const toc = document.querySelector('.markdown-toc');
		if (!toc || !document.body.classList.contains('page-topic')) {
			return;
		}

		const topOffset = Math.min(0, 60 - toc.clientHeight);
		toc.style.setProperty('--vui-toc-top', `${topOffset}px`);
		toc.classList.toggle('better-toc', isStickyActive(toc));
	}

	function isStickyActive(element) {
		const rect = element.getBoundingClientRect();
		const computedStyle = window.getComputedStyle(element);
		const stickyThreshold = parseFloat(computedStyle.top) || 0;
		const parent = element.parentElement;
		if (!parent) {
			return false;
		}
		const parentRect = parent.getBoundingClientRect();
		return rect.top <= stickyThreshold && parentRect.bottom > 0 && parentRect.top < window.innerHeight;
	}

	window.VariedMCUiToc = { init, sync };
}());
