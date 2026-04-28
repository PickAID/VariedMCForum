(function () {
	'use strict';

	let bootstrapped = false;

	function bootstrap() {
		if (!bootstrapped) {
			bootstrapped = true;
			window.VariedMCUiModal.init();
			window.VariedMCUiNavigation.init();
			window.VariedMCUiTheme.init();
			window.VariedMCUiToc.init();
			if (window.jQuery) {
				window.jQuery(window).on('action:ajaxify.end', function () {
					window.setTimeout(runPageEnhancements, 0);
				});
			}
		}

		runPageEnhancements();
	}

	function runPageEnhancements() {
		window.VariedMCUiNavigation.run();
		window.VariedMCUiTheme.sync();
		window.VariedMCUiHomepage.run();
		window.VariedMCUiPinnedTopics.run();
		window.VariedMCUiToc.sync();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', bootstrap);
	} else {
		bootstrap();
	}
}());
