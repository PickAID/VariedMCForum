'use strict';

define('admin/plugins/variedmc-topic-meta', [
	'alerts',
	'admin/plugins/variedmc-topic-meta/utils',
	'admin/plugins/variedmc-topic-meta/list-editor',
	'admin/plugins/variedmc-topic-meta/category-rules',
], function (alerts, Utils, ListEditor, CategoryRules) {
	const ACP = {};
	const categories = new CategoryRules();
	let adminState = null;

	ACP.init = function () {
		bindEvents();
		loadSettings();
	};

	function bindEvents() {
		const page = '.variedmc-topic-meta-page';
		$(document)
			.off('.variedmcTopicMeta')
			.on('click.variedmcTopicMeta', `${page} [id="save"], ${page} [data-action="save-topic-meta"]`, saveSettings)
			.on('click.variedmcTopicMeta', '#variedmc-topic-meta-add-list', function () {
				const container = $('#variedmc-topic-meta-lists');
				container.append(ListEditor.markup(ListEditor.defaultList(container)));
			})
			.on('click.variedmcTopicMeta', `${page} [data-action="add-category-list"]`, function () {
				const card = $(this).closest('[data-cid]');
				if (!makeCategoryEditable(card)) {
					return;
				}
				const container = card.find('[data-category-meta-lists]').first();
				const alias = Utils.normalizeKey(card.find('[data-category-field="alias"]').val());
				container.append(ListEditor.markup(ListEditor.defaultList(container, card), { categoryAlias: alias }));
				categories.updateSummary(card);
			})
			.on('click.variedmcTopicMeta', `${page} [data-action="remove-list"]`, function () {
				const card = $(this).closest('[data-cid]');
				$(this).closest('[data-meta-list]').remove();
				if (card.length) {
					categories.updateSummary(card);
				}
			})
			.on('click.variedmcTopicMeta', `${page} [data-action="toggle-category"]`, function () {
				const card = $(this).closest('[data-cid]');
				categories.setExpanded(card, card.hasClass('is-collapsed'));
			})
			.on('click.variedmcTopicMeta', '#variedmc-topic-meta-expand-all', () => categories.setAllExpanded(true))
			.on('click.variedmcTopicMeta', '#variedmc-topic-meta-collapse-all', () => categories.setAllExpanded(false))
			.on('input.variedmcTopicMeta', '#variedmc-topic-meta-search', function () {
				categories.updateSearch($(this).val());
			})
			.on('input change.variedmcTopicMeta', `${page} [data-cid] :input`, function () {
				const card = $(this).closest('[data-cid]');
				if (card.length) {
					categories.applyCardState(card);
					categories.updateSummary(card);
				}
			});
	}

	function loadSettings() {
		socket.emit('plugins.variedmcTopicMeta.load', null, function (err, state) {
			if (err) {
				alerts.error(Utils.getMessage(err));
				return;
			}
			adminState = state || {};
			render();
		});
	}

	function render() {
		const settings = adminState.settings || {};
		fillGlobalFields(settings);
		categories.render(adminState.categories || [], settings);
	}

	function saveSettings(event) {
		if (event) {
			event.preventDefault();
		}
		const payload = collectForm();
		socket.emit('plugins.variedmcTopicMeta.save', payload, function (err, state) {
			if (err) {
				alerts.error(Utils.getMessage(err));
				return;
			}
			adminState = state || adminState;
			render();
			alerts.alert({ type: 'success', alert_id: 'variedmc-topic-meta-saved', title: 'Saved' });
		});
	}

	function fillGlobalFields(settings) {
		const builtIn = settings.builtInFields || {};
		$('[data-field="defaultTitleTemplate"]').val(String(settings.defaultTitleTemplate || ''));
		$('[data-field="versionsCatalog"]').val(Utils.toListValue(settings.versionsCatalog));
		$('[data-field="loadersCatalog"]').val(Utils.toListValue(settings.loadersCatalog));
		$('[data-field="versionEnabled"]').prop('checked', !(builtIn.version && builtIn.version.enabled === false));
		$('[data-field="loaderEnabled"]').prop('checked', !(builtIn.loader && builtIn.loader.enabled === false));
		renderGlobalLists(settings);
	}

	function renderGlobalLists(settings) {
		const container = $('#variedmc-topic-meta-lists');
		container.empty();
		ListEditor.fromSettings(settings).forEach((list) => {
			container.append(ListEditor.markup(list));
		});
	}

	function collectForm() {
		const versionsCatalog = Utils.parseList($('[data-field="versionsCatalog"]').val());
		const loadersCatalog = Utils.parseList($('[data-field="loadersCatalog"]').val());
		const lists = ListEditor.collect($('#variedmc-topic-meta-lists'));
		const categoryPayload = categories.collect(adminState && adminState.settings || {});

		return {
			defaultTitleTemplate: String($('[data-field="defaultTitleTemplate"]').val() || '').trim(),
			versionsCatalog,
			loadersCatalog,
			themesCatalog: getThemesCatalog(lists),
			builtInFields: {
				version: {
					enabled: $('[data-field="versionEnabled"]').prop('checked'),
					label: '版本',
					options: versionsCatalog,
					titleVisible: true,
					searchVisible: true,
					filterable: true,
				},
				loader: {
					enabled: $('[data-field="loaderEnabled"]').prop('checked'),
					label: '运行环境',
					options: loadersCatalog,
					titleVisible: true,
					searchVisible: true,
					filterable: true,
				},
			},
			lists,
			modules: ListEditor.toModules(lists),
			categoryAliases: categoryPayload.categoryAliases,
			categoryRules: categoryPayload.categoryRules,
		};
	}

	function getThemesCatalog(lists) {
		const topic = (Array.isArray(lists) ? lists : []).find(list => (
			list.selectionKey === 'themes' || list.id === 'topic'
		));
		return topic ? topic.options : [];
	}

	function makeCategoryEditable(card) {
		const scopeSelect = card.find('[data-rule-field="scope"]').first();
		const scope = String(scopeSelect.val() || 'inherit');
		if (scope === 'hidden') {
			return false;
		}
		if (scope === 'inherit') {
			scopeSelect.val('extend');
		}
		categories.applyCardState(card);
		return true;
	}

	return ACP;
});
