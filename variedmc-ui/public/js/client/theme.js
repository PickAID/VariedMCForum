(function () {
	'use strict';

	function init() {
		document.addEventListener('click', (event) => {
			if (event.target.closest('[component="skinSwitcher"] li, #toggle-dark-mode')) {
				window.setTimeout(sync, 50);
			}
		});
		if (window.MutationObserver) {
			new MutationObserver(sync).observe(document.documentElement, {
				attributes: true,
				attributeFilter: ['data-bs-theme'],
			});
		}
		window.addEventListener('storage', (event) => {
			if (event.key === 'data-bs-theme') {
				sync();
			}
		});
		sync();
	}

	function sync() {
		document.body.classList.toggle('dark-theme-fix', isDarkTheme());
	}

	function isDarkTheme() {
		const bootstrapTheme = String(document.documentElement.getAttribute('data-bs-theme') ||
			getStoredTheme()).toLowerCase();
		if (bootstrapTheme === 'dark') {
			return true;
		}

		const root = document.querySelector('[component="skinSwitcher"]');
		if (!root) {
			return false;
		}

		const darkHeader = Array.from(root.querySelectorAll('.dropdown-header'))
			.find(node => node.textContent.trim().toLowerCase() === 'dark');
		if (!darkHeader || !darkHeader.parentElement) {
			return false;
		}

		const darkGroup = darkHeader.parentElement;
		const checkedCount = darkGroup.querySelectorAll('.fa-check').length;
		const hiddenCount = darkGroup.querySelectorAll('.invisible').length;
		return checkedCount > hiddenCount;
	}

	function getStoredTheme() {
		try {
			return window.localStorage ? window.localStorage.getItem('data-bs-theme') || '' : '';
		} catch (err) {
			return '';
		}
	}

	window.VariedMCUiTheme = { init, sync };
}());
