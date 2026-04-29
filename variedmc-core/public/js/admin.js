'use strict';

define('admin/plugins/variedmc-core', ['alerts'], function (alerts) {
	const ACP = {};

	ACP.init = function () {
		bindEvents();
		loadSettings();
	};

	function bindEvents() {
		$(document)
			.off('.variedmcCore')
			.on('click.variedmcCore', '.variedmc-core-page [id="save"], .variedmc-core-page [data-action="save-core"]', saveSettings);
	}

	function loadSettings() {
		socket.emit('plugins.variedmcCore.load', null, function (err, settings) {
			if (err) {
				alerts.error(getMessage(err));
				return;
			}
			render(settings || {});
		});
	}

	function render(settings) {
		$('[data-field="inheritPinnedTopics"]').prop('checked', settings.inheritPinnedTopics !== false);
	}

	function saveSettings(event) {
		if (event) {
			event.preventDefault();
		}
		socket.emit('plugins.variedmcCore.save', {
			inheritPinnedTopics: $('[data-field="inheritPinnedTopics"]').prop('checked'),
		}, function (err, settings) {
			if (err) {
				alerts.error(getMessage(err));
				return;
			}
			render(settings || {});
			alerts.alert({ type: 'success', alert_id: 'variedmc-core-saved', title: 'Saved' });
		});
	}

	function getMessage(err) {
		return err && (err.message || err) || '[[error:invalid-data]]';
	}

	return ACP;
});
