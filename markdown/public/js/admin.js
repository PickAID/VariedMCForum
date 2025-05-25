'use strict';

define('admin/plugins/markdown', ['settings'], function (Settings) {
	var Markdown = {};

	Markdown.init = function () {
		Settings.load('markdown', $('.markdown-settings'), function (err, settings) {
			if (err) {
				settings = {};
			}

			var defaults = {
				html: false,
				langPrefix: 'language-',
				highlight: true,
				highlightTheme: 'github-light',
				highlightDarkTheme: 'github-dark',
				useShiki: true,
				xhtmlOut: true,
				breaks: true,
				linkify: true,
				typographer: false,
				externalBlank: false,
				nofollow: true,
				allowRTLO: false,
				checkboxes: true,
				multimdTables: true,
			};

			for (const setting of Object.keys(defaults)) {
				if (!settings.hasOwnProperty(setting)) {
					if (typeof defaults[setting] === 'boolean') {
						$('#' + setting).prop('checked', defaults[setting]);
					} else {
						$('#' + setting).val(defaults[setting]);
					}
				}
			}
		});

		$('#save').on('click', function () {
			Settings.save('markdown', $('.markdown-settings'));
		});

		$('#useShiki').on('change', function() {
			const isEnabled = $(this).is(':checked');
			$('#highlightTheme, #highlightDarkTheme').closest('.mb-3').toggle(isEnabled);
			$('.alert-info').toggle(isEnabled);
		});

		$('#highlight').on('change', function() {
			const isEnabled = $(this).is(':checked');
			$('#useShiki').closest('.mb-3').toggle(isEnabled);
			if (!isEnabled) {
				$('#useShiki').prop('checked', false).trigger('change');
			}
		});

		$(document).ready(function() {
			$('#highlight').trigger('change');
			$('#useShiki').trigger('change');
		});
	};

	return Markdown;
});
