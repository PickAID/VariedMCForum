(function () {
	'use strict';

	function init() {
		document.addEventListener('click', (event) => {
			if (event.target.closest('[component="skinSwitcher"] li')) {
				window.setTimeout(sync, 50);
			}
		});
		sync();
	}

	function sync() {
		const root = document.querySelector('[component="skinSwitcher"]');
		if (!root) {
			return;
		}

		const darkHeader = Array.from(root.querySelectorAll('.dropdown-header'))
			.find(node => node.textContent.trim().toLowerCase() === 'dark');
		if (!darkHeader || !darkHeader.parentElement) {
			return;
		}

		const darkGroup = darkHeader.parentElement;
		const checkedCount = darkGroup.querySelectorAll('.fa-check').length;
		const hiddenCount = darkGroup.querySelectorAll('.invisible').length;
		document.body.classList.toggle('dark-theme-fix', checkedCount > hiddenCount);
	}

	window.VariedMCUiTheme = { init, sync };
}());
