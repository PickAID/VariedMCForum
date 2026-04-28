(function () {
	'use strict';

	function run() {
		mergeLoggedInMenu();
		syncMobileClass();
		enforceFullnameLimit();
	}

	function init() {
		document.addEventListener('focusin', (event) => {
			if (event.target && event.target.id === 'fullname') {
				applyFullnameLimit(event.target);
			}
		});
		window.addEventListener('resize', syncMobileClass, { passive: true });
		run();
	}

	function mergeLoggedInMenu() {
		const loggedInMenu = document.querySelector('#logged-in-menu');
		const mainNav = document.querySelector('#main-nav');
		if (!loggedInMenu || !mainNav) {
			return;
		}

		while (loggedInMenu.firstElementChild) {
			const item = loggedInMenu.firstElementChild;
			if (item.id === 'user_label') {
				mainNav.prepend(item);
			} else {
				mainNav.append(item);
			}
		}
	}

	function syncMobileClass() {
		document.body.classList.toggle('mobile-bb', window.matchMedia('(max-width: 991px)').matches || isMobileUserAgent());
	}

	function enforceFullnameLimit() {
		const fullname = document.getElementById('fullname');
		if (fullname) {
			applyFullnameLimit(fullname);
		}
	}

	function applyFullnameLimit(input) {
		input.maxLength = 11;
		const trimValue = function () {
			input.value = String(input.value || '').slice(0, 11);
		};

		trimValue();
		input.removeEventListener('input', input._variedmcTrimHandler);
		input.removeEventListener('change', input._variedmcTrimHandler);
		input._variedmcTrimHandler = trimValue;
		input.addEventListener('input', input._variedmcTrimHandler);
		input.addEventListener('change', input._variedmcTrimHandler);
	}

	function isMobileUserAgent() {
		return /Android|iPad|iPhone|iPod|Symbian/i.test(navigator.userAgent || '');
	}

	window.VariedMCUiNavigation = { init, run };
}());
