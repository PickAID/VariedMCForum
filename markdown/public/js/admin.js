'use strict';

import { save, load } from 'settings';

export function init() {
	handleSettingsForm();
}

function handleSettingsForm() {
	load('markdown', $('.markdown-settings'));

	$('#save').on('click', () => {
		save('markdown', $('.markdown-settings'));
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
}
