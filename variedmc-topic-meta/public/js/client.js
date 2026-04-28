(function () {
	'use strict';

	const states = new Map();
	let hooksBound = false;
	const domain = window.VariedMCTopicMetaDomain;
	const title = window.VariedMCTopicMetaTitle;
	const ui = window.VariedMCTopicMetaComposerUI;

	bootstrap();

	function bootstrap() {
		window.VariedMCTopicMetaStyles.ensure();
		if (window.jQuery) {
			const $window = window.jQuery(window);
			$window.on('action:composer.loaded', (event, data) => {
				if (data && data.postContainer) {
					enhance(data.postContainer, data.composerData || {});
				}
			});
			$window.on('action:composer.changeCategory', (event, data) => {
				if (data && data.postContainer) {
					refresh(data.postContainer, data.postData || {});
				}
			});
		}
		bindSubmitHook();
	}

	function bindSubmitHook() {
		if (hooksBound || typeof require !== 'function') {
			return;
		}
		require(['hooks'], (hooks) => {
			if (hooksBound) {
				return;
			}
			hooks.on('filter:composer.submit', async (hookData) => {
				try {
					return submit(hookData);
				} catch (err) {
					restoreSubmit(hookData && hookData.composerEl);
					showError(err);
					throw err;
				}
			});
			hooksBound = true;
		});
	}

	function enhance(postContainer, composerData) {
		const container = window.jQuery(postContainer);
		if (!isSupported(composerData) || !container.length) {
			return;
		}
		const state = getState(container, composerData);
		ui.render(container, state);
	}

	function refresh(postContainer, postData) {
		const container = window.jQuery(postContainer);
		const uuid = String(container.attr('data-uuid') || '');
		if (!uuid || !states.has(uuid)) {
			return;
		}
		const state = states.get(uuid);
		state.cid = resolveCid(container, postData);
		state.rule = domain.resolveCategoryRule(state.cid);
		state.selected = ui.constrain(state.selected, state.rule);
		ui.render(container, state);
	}

	function getState(container, composerData) {
		const uuid = String(container.attr('data-uuid') || '');
		const storedMeta = normalizeStoredMeta(composerData.variedmcTopicMeta);
		let state = states.get(uuid);
		if (!state) {
			state = { uuid, selected: ui.initialSelection(storedMeta), cid: 0, rule: null, initialized: false };
			states.set(uuid, state);
		}
		state.cid = resolveCid(container, composerData);
		state.rule = domain.resolveCategoryRule(state.cid);
		state.selected = ui.constrain(state.selected, state.rule);
		if (!state.initialized) {
			initializeTitle(container, storedMeta, state);
			state.initialized = true;
		}
		return state;
	}

	function initializeTitle(container, storedMeta, state) {
		const titleInput = ui.titleInput(container);
		const prefix = title.prefix(storedMeta, ui.context(state.rule));
		titleInput.val(storedMeta.baseTitle || title.stripPrefix(titleInput.val(), prefix));
		titleInput.off('.variedmcTopicMeta').on('input.variedmcTopicMeta', () => {
			ui.updatePreview(container, state);
		});
	}

	function submit(hookData) {
		if (!hookData || !hookData.composerEl) {
			return hookData;
		}
		const composerEl = window.jQuery(hookData.composerEl);
		const uuid = String(composerEl.attr('data-uuid') || '');
		if (!uuid || !states.has(uuid)) {
			return hookData;
		}
		const state = states.get(uuid);
		if (!state.rule || !state.rule.enabled) {
			return hookData;
		}
		const baseTitle = String(ui.titleInput(composerEl).val() || '').trim();
		ui.validate(state.rule, state.selected);
		hookData.composerData.variedmcTopicMeta = {
			versions: (state.selected.versions || []).slice(),
			loaders: (state.selected.loaders || []).slice(),
			themes: (state.selected.themes || state.selected.topic || []).slice(),
			modules: ui.selectedModules(state.rule, state.selected),
			fields: state.selected,
			baseTitle,
			categoryAlias: state.rule.categoryAlias,
			categoryCid: state.rule.cid,
		};
		return hookData;
	}

	function normalizeStoredMeta(input) {
		const raw = input && typeof input === 'object' ? input : {};
		return {
			versions: domain.list(raw.versions),
			loaders: domain.list(raw.loaders),
			themes: domain.list(raw.themes),
			modules: raw.modules && typeof raw.modules === 'object' ? raw.modules : {},
			fields: raw.fields && typeof raw.fields === 'object' ? raw.fields : {},
			baseTitle: String(raw.baseTitle || '').trim(),
			prefix: String(raw.prefix || '').trim(),
		};
	}

	function resolveCid(container, data) {
		return domain.cid(data && data.cid) ||
			domain.cid(window.ajaxify && window.ajaxify.data && window.ajaxify.data.cid) ||
			domain.cid(container.find('[component="category-selector-selected"]').attr('data-cid'));
	}

	function isSupported(composerData) {
		return composerData && (
			composerData.action === 'topics.post' ||
			(composerData.action === 'posts.edit' && composerData.isMain)
		);
	}

	function restoreSubmit(composerEl) {
		const composer = composerEl ? window.jQuery(composerEl) : null;
		if (composer && composer.length) {
			composer.find('.composer-submit').removeAttr('disabled');
		}
	}

	function showError(err) {
		const message = err && err.message ? err.message : String(err || '[[error:invalid-data]]');
		if (window.app && window.app.alertError) {
			window.app.alertError(message);
			return;
		}
		if (window.alert) {
			window.alert(message);
		}
	}
}());
