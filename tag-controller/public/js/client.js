(function () {
	'use strict';

	let refreshTimer = 0;
	let tagsInputPatched = false;

	bootstrap();

	function bootstrap() {
		if (window.jQuery) {
			patchTagsInputPlugin(window.jQuery);
			const $window = window.jQuery(window);
			$window.on('action:ajaxify.end action:composer.loaded action:composer.changeCategory action:tag.added action:tag.toggleInput', scheduleRefresh);
			$window.on('action:tag.beforeAdd', onBeforeTagAdd);
			window.jQuery(document).on('autocompleteselect.tagController', '.bootstrap-tagsinput input', onAutocompleteSelect);
		}

		document.addEventListener('input', onDocumentInput, true);
		document.addEventListener('keypress', onDocumentKeyPress, true);
		scheduleRefresh();
	}

	function scheduleRefresh() {
		window.clearTimeout(refreshTimer);
		refreshTimer = window.setTimeout(applyRuntime, 0);
	}

	function applyRuntime() {
		const runtimeConfig = getRuntimeConfig();
		if (!runtimeConfig) {
			return;
		}
		if (window.jQuery) {
			patchTagsInputPlugin(window.jQuery);
		}

		injectStyle(runtimeConfig.cssText || '');
		enforceRestrictedTagInputs();
		annotateRenderedTags(runtimeConfig.definitions || []);
		annotateComposerTags(runtimeConfig.definitions || []);
	}

	function onBeforeTagAdd(ev, data) {
		if (!getRuntimeConfig()) {
			return;
		}

		if (!data || !data.event || !data.tagEl) {
			return;
		}

		if (data.event.options && data.event.options.skipTagControllerValidation) {
			return;
		}

		const normalized = normalizeTag(data.tag);
		if (!normalized) {
			return;
		}
		if (String(data.tag || '').trim() !== normalized) {
			return;
		}

		data.event.cancel = true;
		closeAutocomplete(data.inputAutocomplete);
		validateExistingTag(normalized, data.cid, function (err, allowed) {
			if (err) {
				showError(err.message || err);
				return;
			}

			if (!allowed) {
				showError('[[error:tag-not-allowed]]');
				return;
			}

			data.tagEl.tagsinput('add', normalized, {
				skipTagControllerValidation: true,
			});
		});
	}

	function onDocumentInput(event) {
		if (!event.target || !event.target.closest('.bootstrap-tagsinput')) {
			return;
		}

		scheduleRefresh();
	}

	function onDocumentKeyPress(event) {
		if (!isConfirmKey(event)) {
			return;
		}

		if (!window.jQuery) {
			return;
		}

		const input = window.jQuery(event.target);
		if (!input.is('.bootstrap-tagsinput input')) {
			return;
		}

		const tagField = getTagFieldForInput(input);
		if (!tagField.length || !isRestrictedTagField(tagField)) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		if (typeof event.stopImmediatePropagation === 'function') {
			event.stopImmediatePropagation();
		}
	}

	function enforceRestrictedTagInputs() {
		if (!window.jQuery) {
			return;
		}

		const $ = window.jQuery;
		$('input.tags').each(function () {
			const tagField = $(this);
			if (!isRestrictedTagField(tagField)) {
				return;
			}

			restrictTagField(tagField);
		});
	}

	function patchTagsInputPlugin($) {
		if (
			tagsInputPatched ||
			!$ ||
			!$.fn ||
			typeof $.fn.tagsinput !== 'function'
		) {
			return;
		}

		const original = $.fn.tagsinput;
		const wrapped = function () {
			const args = Array.prototype.slice.call(arguments);
			const isInitializationCall = !args.length || typeof args[0] !== 'string';

			if (isInitializationCall && this.toArray().some(element => isRestrictedTagField($(element)))) {
				args[0] = Object.assign({}, args[0] || {}, {
					freeInput: false,
					addOnBlur: false,
				});
			}

			const result = original.apply(this, args);

			if (isInitializationCall) {
				this.each(function () {
					const tagField = $(this);
					if (isRestrictedTagField(tagField)) {
						restrictTagField(tagField);
					}
				});
			}

			return result;
		};

		Object.assign(wrapped, original);
		$.fn.tagsinput = wrapped;
		tagsInputPatched = true;
	}

	function restrictTagField(tagField) {
		const tagsinput = tagField.data('tagsinput');
		if (!tagsinput || !tagsinput.$input || !tagsinput.$input.length) {
			return;
		}

		tagsinput.options.freeInput = false;
		tagsinput.options.addOnBlur = false;
		tagsinput.$input.data('tagControllerBoundField', tagField);
	}

	function onAutocompleteSelect(event, ui) {
		if (!window.jQuery) {
			return;
		}

		const $ = window.jQuery;
		const input = $(event.target);
		const tagField = getTagFieldForInput(input);
		if (!tagField.length || !isRestrictedTagField(tagField)) {
			return;
		}

		const normalized = normalizeTag(
			ui && ui.item && (ui.item.value || ui.item.label || ui.item)
		);
		if (!normalized) {
			return;
		}

		event.preventDefault();
		tagField.tagsinput('add', normalized, {
			skipTagControllerValidation: true,
		});
		window.setTimeout(function () {
			input.val('');
		}, 0);
	}

	function getTagFieldForInput(input) {
		const boundField = input.data('tagControllerBoundField');
		if (boundField && boundField.length) {
			return boundField;
		}

		const container = input.closest('.bootstrap-tagsinput');
		if (!container.length) {
			return window.jQuery();
		}

		const nextField = container.next('input.tags');
		if (nextField.length) {
			return nextField;
		}

		return container.siblings('input.tags').first();
	}

	function isRestrictedTagField(tagField) {
		if (!window.jQuery) {
			return false;
		}

		const $ = window.jQuery;
		const field = tagField instanceof $ ? tagField : $(tagField);
		if (!field.is('input.tags')) {
			return false;
		}

		if (field.closest('.composer').length) {
			return true;
		}

		const modal = field.closest('.tool-modal');
		return modal.length > 0 && modal.find('#tag-topic-commit').length > 0;
	}

	function isConfirmKey(event) {
		return event.key === 'Enter' || event.which === 13 || event.keyCode === 13 || event.key === ',' || event.which === 44 || event.keyCode === 44;
	}

	function annotateComposerTags(definitions) {
		const knownTags = new Set((definitions || []).map(definition => normalizeTag(definition.tag)));

		document.querySelectorAll('.bootstrap-tagsinput .tag').forEach((tagEl) => {
			const normalized = normalizeTag(extractTagText(tagEl));
			if (knownTags.has(normalized)) {
				tagEl.setAttribute('data-tag-controller-tag', normalized);
			} else {
				tagEl.removeAttribute('data-tag-controller-tag');
			}
		});
	}

	function annotateRenderedTags(definitions) {
		const knownTags = new Set((definitions || []).map(definition => normalizeTag(definition.tag)));

		document.querySelectorAll('.popular-tags > .d-flex.align-items-center.gap-2 a[href*="/tags/"]').forEach((linkEl) => {
			const normalized = normalizeTag(extractLinkedTagText(linkEl));
			if (!knownTags.has(normalized)) {
				linkEl.removeAttribute('data-tag-controller-rendered');
				if (linkEl.parentElement) {
					linkEl.parentElement.removeAttribute('data-tag-controller-rendered-wrapper');
					linkEl.parentElement.removeAttribute('data-tag-controller-bar-main');
				}

				const staleBarRow = linkEl.closest('.popular-tags > .d-flex.align-items-center.gap-2');
				if (staleBarRow) {
					staleBarRow.removeAttribute('data-tag-controller-bar-row');
					const staleCount = staleBarRow.querySelector('.tag-topic-count');
					if (staleCount) {
						staleCount.removeAttribute('data-tag-controller-bar-count');
					}
				}
				return;
			}

			linkEl.setAttribute('data-tag-controller-rendered', normalized);

			if (linkEl.parentElement && linkEl.parentElement.tagName === 'DIV') {
				linkEl.parentElement.setAttribute('data-tag-controller-rendered-wrapper', normalized);
			}

			const barRow = linkEl.closest('.popular-tags > .d-flex.align-items-center.gap-2');
			if (barRow) {
				barRow.setAttribute('data-tag-controller-bar-row', normalized);
				if (linkEl.parentElement) {
					linkEl.parentElement.setAttribute('data-tag-controller-bar-main', normalized);
				}

				const countEl = barRow.querySelector('.tag-topic-count');
				if (countEl) {
					countEl.setAttribute('data-tag-controller-bar-count', normalized);
				}
			}
		});
	}

	function extractTagText(tagEl) {
		const clone = tagEl.cloneNode(true);
		clone.querySelectorAll('[data-role="remove"]').forEach(node => node.remove());
		return clone.textContent || '';
	}

	function extractLinkedTagText(linkEl) {
		const explicitTag = linkEl.querySelector('.tag-item, [class*="tag-class-"]');
		if (explicitTag) {
			return explicitTag.textContent || '';
		}

		return linkEl.textContent || '';
	}

	function getRuntimeConfig() {
		return window.config && window.config.tagController;
	}

	function injectStyle(cssText) {
		let styleEl = document.getElementById('tag-controller-runtime-style');
		if (!styleEl) {
			styleEl = document.createElement('style');
			styleEl.id = 'tag-controller-runtime-style';
			document.head.appendChild(styleEl);
		}

		if (styleEl.textContent !== cssText) {
			styleEl.textContent = cssText;
		}
	}

	function normalizeTag(value) {
		if (window.utils && typeof window.utils.cleanUpTag === 'function') {
			return window.utils.cleanUpTag(String(value || ''), window.config && window.config.maximumTagLength);
		}

		return String(value || '')
			.trim()
			.toLowerCase()
			.replace(/[,/#!$^*;:{}=_`<>'"~()?|]/g, '')
			.slice(0, 15)
			.trim();
	}

	function validateExistingTag(tag, cid, callback) {
		if (!window.socket || typeof window.socket.emit !== 'function') {
			callback(null, true);
			return;
		}

		window.socket.emit('topics.isTagAllowed', {
			tag,
			cid: parseCid(cid),
		}, callback);
	}

	function parseCid(cid) {
		const parsed = parseInt(cid, 10);
		return Number.isFinite(parsed) ? parsed : 0;
	}

	function closeAutocomplete(input) {
		if (input && typeof input.autocomplete === 'function') {
			input.autocomplete('close');
		}
	}

	function showError(message) {
		if (window.alerts && typeof window.alerts.error === 'function') {
			window.alerts.error(message);
			return;
		}

		if (window.app && typeof window.app.alertError === 'function') {
			window.app.alertError(message);
		}
	}
}());
