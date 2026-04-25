'use strict';
/* globals $, socket, define */

define('admin/plugins/variedmc-topic-meta', ['alerts'], function (alerts) {
	const ACP = {};
	let adminState = null;
	let currentSearchQuery = '';
	const expandedCids = new Set();

	ACP.init = function () {
		bindEvents();
		loadSettings();
	};

	function bindEvents() {
		$('#save').on('click', saveSettings);
		$('#variedmc-topic-meta-search').on('input', function () {
			currentSearchQuery = normalizeSearchQuery($(this).val());
			updateCategorySearch();
		});
		$('#variedmc-topic-meta-expand-all').on('click', function () {
			setAllCategoriesExpanded(true);
		});
		$('#variedmc-topic-meta-collapse-all').on('click', function () {
			setAllCategoriesExpanded(false);
		});

		$('#variedmc-topic-meta-categories')
			.on('click', '[data-action="toggle-category"]', function () {
				const card = $(this).closest('[data-cid]');
				const shouldExpand = card.hasClass('is-collapsed');
				setCategoryExpanded(card, shouldExpand);
			})
			.on('change', '[data-rule-field="scope"]', function () {
				const card = $(this).closest('[data-cid]');
				applyCardState(card);
				updateCategorySummary(card);
			})
			.on('input change', 'input, textarea, select', function () {
				const card = $(this).closest('[data-cid]');
				if (card.length) {
					updateCategorySummary(card);
				}
			});
	}

	function loadSettings() {
		socket.emit('plugins.variedmcTopicMeta.load', null, function (err, state) {
			if (err) {
				renderCategoryLoadFailure(getMessage(err));
				return alerts.error(getMessage(err));
			}

			adminState = state || {};
			adminState.categoryIndex = buildCategoryIndex(adminState.categories || []);
			try {
				fillGlobalFields(adminState.settings || {});
				renderCategoryRules(adminState.categories || [], adminState.settings || {});
			} catch (renderErr) {
				renderCategoryLoadFailure(getMessage(renderErr));
				alerts.error(getMessage(renderErr));
			}
		});
	}

	function saveSettings() {
		socket.emit('plugins.variedmcTopicMeta.save', collectForm(), function (err, state) {
			if (err) {
				return alerts.error(getMessage(err));
			}

			adminState = state || {};
			adminState.categoryIndex = buildCategoryIndex(adminState.categories || []);
			fillGlobalFields(adminState.settings || {});
			renderCategoryRules(adminState.categories || [], adminState.settings || {});

			alerts.alert({
				type: 'success',
				alert_id: 'variedmc-topic-meta-saved',
				title: 'VariedMC Topic Meta Saved',
				message: 'Composer metadata rules have been updated.',
				timeout: 4000,
			});
		});
	}

	function renderCategoryLoadFailure(message) {
		const container = $('#variedmc-topic-meta-categories');
		container.empty();
		toggleEmptyState(true, message || '板块规则加载失败。');
		updateCategoryCounter(0, 0);
	}

	function fillGlobalFields(settings) {
		$('[data-field="defaultTitleTemplate"]').val(String(settings.defaultTitleTemplate || ''));
		$('[data-field="versionsCatalog"]').val(toListValue(settings.versionsCatalog));
		$('[data-field="loadersCatalog"]').val(toListValue(settings.loadersCatalog));
		$('[data-field="themesCatalog"]').val(toListValue(settings.themesCatalog));
	}

	function renderCategoryRules(categories, settings) {
		const container = $('#variedmc-topic-meta-categories');
		container.empty();

		if (!Array.isArray(categories) || !categories.length) {
			toggleEmptyState(true, '没有读取到任何板块。');
			updateCategoryCounter(0, 0);
			return;
		}

		categories.forEach((category) => {
			const cid = String(category.cid || '');
			const rule = normalizeRule((settings.categoryRules || {})[cid]);
			const card = $(buildCategoryRuleMarkup(category, rule, expandedCids.has(cid)));
			container.append(card);
			applyCardState(card);
			updateCategorySummary(card);
		});

		updateCategorySearch();
	}

	function collectForm() {
		const categoryRules = {};

		$('#variedmc-topic-meta-categories [data-cid]').each(function () {
			const card = $(this);
			const cid = card.attr('data-cid');
			const scope = String(card.find('[data-rule-field="scope"]').val() || 'inherit');
			if (scope === 'inherit') {
				return;
			}

			categoryRules[cid] = {
				scope,
				rulesText: card.find('[data-rule-field="rulesText"]').val(),
				titleTemplate: card.find('[data-rule-field="titleTemplate"]').val(),
				versionMode: card.find('[data-rule-field="versionMode"]').val(),
				requireVersions: card.find('[data-rule-field="requireVersions"]').prop('checked'),
				supportedVersions: parseList(card.find('[data-rule-field="supportedVersions"]').val()),
				loaderMode: card.find('[data-rule-field="loaderMode"]').val(),
				requireLoaders: card.find('[data-rule-field="requireLoaders"]').prop('checked'),
				supportedLoaders: parseList(card.find('[data-rule-field="supportedLoaders"]').val()),
				themeMode: card.find('[data-rule-field="themeMode"]').val(),
				requireThemes: card.find('[data-rule-field="requireThemes"]').prop('checked'),
				supportedThemes: parseList(card.find('[data-rule-field="supportedThemes"]').val()),
			};
		});

		return {
			defaultTitleTemplate: String($('[data-field="defaultTitleTemplate"]').val() || '').trim(),
			versionsCatalog: parseList($('[data-field="versionsCatalog"]').val()),
			loadersCatalog: parseList($('[data-field="loadersCatalog"]').val()),
			themesCatalog: parseList($('[data-field="themesCatalog"]').val()),
			categoryRules,
		};
	}

	function updateCategorySearch() {
		const cards = $('#variedmc-topic-meta-categories [data-cid]');
		const terms = currentSearchQuery.split(/\s+/).filter(Boolean);
		let visibleCount = 0;

		cards.each(function () {
			const card = $(this);
			const matches = !terms.length || terms.every(term => getSearchText(card).includes(term));
			card.toggleClass('hidden', !matches);

			if (!matches) {
				return;
			}

			visibleCount += 1;
			if (terms.length) {
				setCategoryExpanded(card, true, false);
			} else {
				setCategoryExpanded(card, expandedCids.has(String(card.attr('data-cid') || '')), false);
			}
		});

		toggleEmptyState(visibleCount === 0, terms.length ? '没有匹配到板块。' : '没有读取到任何板块。');
		updateCategoryCounter(visibleCount, cards.length);
	}

	function setAllCategoriesExpanded(expanded) {
		$('#variedmc-topic-meta-categories [data-cid]').each(function () {
			setCategoryExpanded($(this), expanded);
		});
	}

	function setCategoryExpanded(card, expanded, persist = true) {
		const cid = String(card.attr('data-cid') || '');
		card.toggleClass('is-expanded', !!expanded);
		card.toggleClass('is-collapsed', !expanded);
		card.find('[data-action="toggle-category"]').attr('aria-expanded', expanded ? 'true' : 'false');
		card.find('[data-role="toggle-label"]').text(expanded ? '收起' : '展开');

		if (!persist || !cid) {
			return;
		}

		if (expanded) {
			expandedCids.add(cid);
		} else {
			expandedCids.delete(cid);
		}
	}

	function toggleEmptyState(visible, message) {
		const emptyState = $('#variedmc-topic-meta-empty');
		emptyState.text(message || '没有匹配到板块。');
		emptyState.toggleClass('hidden', !visible);
	}

	function updateCategoryCounter(visibleCount, totalCount) {
		const total = Number(totalCount) || 0;
		const visible = Number(visibleCount) || 0;
		const counter = total > 0 ? `${visible} / ${total}` : '0';
		$('#variedmc-topic-meta-category-count').text(counter);
	}

	function buildCategoryRuleMarkup(category, rule, expanded) {
		const cid = escapeHtml(String(category.cid || ''));
		const name = escapeHtml(String(category.name || ''));
		const depth = Number.isFinite(Number(category.depth)) ? Number(category.depth) : 0;
		const scope = escapeHtml(rule.scope || 'inherit');
		const depthLabel = depth > 0 ? `子板块 · 深度 ${depth}` : '顶级板块';
		const inheritancePath = escapeHtml(buildInheritancePath(category));
		const searchText = escapeHtml([
			String(category.name || ''),
			String(category.cid || ''),
			String(depthLabel || ''),
			String(inheritancePath || ''),
			String(rule.rulesText || ''),
			String(rule.titleTemplate || ''),
			(rule.supportedVersions || []).join(' '),
			(rule.supportedLoaders || []).join(' '),
			(rule.supportedThemes || []).join(' '),
		].join(' ').toLowerCase());

		return `
			<article
				class="card variedmc-topic-meta-category ${expanded ? 'is-expanded' : 'is-collapsed'}"
				data-cid="${cid}"
				data-search-text="${searchText}"
				style="--variedmc-topic-meta-depth:${depth};"
			>
				<div class="card-header">
					<div class="variedmc-topic-meta-category-bar">
						<button
							type="button"
							class="btn btn-light btn-sm variedmc-topic-meta-category-toggle"
							data-action="toggle-category"
							aria-expanded="${expanded ? 'true' : 'false'}"
						>
							<span class="fa fa-chevron-right variedmc-topic-meta-category-toggle-icon"></span>
							<span data-role="toggle-label">${expanded ? '收起' : '展开'}</span>
						</button>

						<div class="variedmc-topic-meta-category-main">
							<div class="variedmc-topic-meta-category-name">${name}</div>
							<div class="text-muted small">${escapeHtml(depthLabel)} · CID ${cid}</div>
							<div class="text-muted small">继承链: ${inheritancePath}</div>
							<div class="variedmc-topic-meta-category-summary text-muted small" data-role="summary"></div>
						</div>

						<div class="variedmc-topic-meta-category-controls">
							<span class="badge text-bg-light border align-self-start" data-role="scope-badge">${escapeHtml(getScopeLabel(scope))}</span>
							<div class="variedmc-topic-meta-scope">
								<label class="form-label small mb-1">规则模式</label>
								<select class="form-select form-select-sm" data-rule-field="scope">
									<option value="inherit" ${scope === 'inherit' ? 'selected' : ''}>继承父级</option>
									<option value="extend" ${scope === 'extend' ? 'selected' : ''}>继承并追加</option>
									<option value="override" ${scope === 'override' ? 'selected' : ''}>本板块独立</option>
									<option value="hidden" ${scope === 'hidden' ? 'selected' : ''}>隐藏面板</option>
								</select>
							</div>
						</div>
					</div>
				</div>

				<div class="card-body variedmc-topic-meta-category-body d-flex flex-column gap-3">
					<div>
						<label class="form-label">标题模板覆盖</label>
						<input
							type="text"
							class="form-control"
							data-rule-field="titleTemplate"
							value="${escapeHtml(rule.titleTemplate || '')}"
							placeholder="留空表示沿用继承链上的标题模板"
						/>
						<div class="form-text">继承并追加时留空会继续使用父级或全局模板；独立模式则回退到全局默认模板。</div>
					</div>

					<div>
						<label class="form-label">规则说明</label>
						<textarea class="form-control" rows="3" data-rule-field="rulesText" placeholder="显示在 composer 面板顶部的规则说明">${escapeHtml(rule.rulesText || '')}</textarea>
						<div class="form-text">继承并追加时会追加到父级说明后面；独立模式则只使用这里的内容。</div>
					</div>

					<div class="variedmc-topic-meta-admin-grid">
						${buildFieldConfigMarkup(category.cid, 'versions', '版本', rule.versionMode, rule.requireVersions, rule.supportedVersions)}
						${buildFieldConfigMarkup(category.cid, 'loaders', '运行环境', rule.loaderMode, rule.requireLoaders, rule.supportedLoaders)}
						${buildFieldConfigMarkup(category.cid, 'themes', '主题', rule.themeMode, rule.requireThemes, rule.supportedThemes)}
					</div>
				</div>
			</article>
		`;
	}

	function applyCardState(card) {
		const scope = String(card.find('[data-rule-field="scope"]').val() || 'inherit');
		card.toggleClass('is-inherit', scope === 'inherit');
		card.toggleClass('is-extend', scope === 'extend');
		card.toggleClass('is-override', scope === 'override');
		card.toggleClass('is-hidden', scope === 'hidden');
		card.find('[data-role="scope-badge"]').text(getScopeLabel(scope));
		card.find('.variedmc-topic-meta-category-body :input').not('[data-rule-field="scope"]').prop('disabled', scope === 'inherit' || scope === 'hidden');
		card.find('[data-role="field-options-help"]').each(function () {
			$(this).text(scope === 'extend' ?
				'这里填的是追加项，会在父级允许列表后继续补充；必填和单选/多选也会覆盖父级。' :
				'留空表示使用当前层的默认选项池。');
		});
	}

	function updateCategorySummary(card) {
		const scope = String(card.find('[data-rule-field="scope"]').val() || 'inherit');
		const pieces = [];

		if (scope === 'inherit') {
			pieces.push('完全继承父级规则');
		} else if (scope === 'extend') {
			pieces.push('继承父级后追加本板块配置');
			if (String(card.find('[data-rule-field="titleTemplate"]').val() || '').trim()) {
				pieces.push('重写标题模板');
			}
			if (String(card.find('[data-rule-field="rulesText"]').val() || '').trim()) {
				pieces.push('追加规则说明');
			}
			appendFieldSummary(card, pieces, '版本', 'versionMode', 'requireVersions', 'supportedVersions');
			appendFieldSummary(card, pieces, '运行环境', 'loaderMode', 'requireLoaders', 'supportedLoaders');
			appendFieldSummary(card, pieces, '主题', 'themeMode', 'requireThemes', 'supportedThemes');
			appendFieldExtendSummary(card, pieces, '版本', 'supportedVersions');
			appendFieldExtendSummary(card, pieces, '运行环境', 'supportedLoaders');
			appendFieldExtendSummary(card, pieces, '主题', 'supportedThemes');
		} else if (scope === 'hidden') {
			pieces.push('该板块不会显示 meta 面板');
		} else {
			if (String(card.find('[data-rule-field="titleTemplate"]').val() || '').trim()) {
				pieces.push('自定义标题模板');
			}
			if (String(card.find('[data-rule-field="rulesText"]').val() || '').trim()) {
				pieces.push('有规则说明');
			}

			appendFieldSummary(card, pieces, '版本', 'versionMode', 'requireVersions', 'supportedVersions');
			appendFieldSummary(card, pieces, '运行环境', 'loaderMode', 'requireLoaders', 'supportedLoaders');
			appendFieldSummary(card, pieces, '主题', 'themeMode', 'requireThemes', 'supportedThemes');

			if (!pieces.length) {
				pieces.push('已启用板块覆盖，但还没有设置额外限制');
			}
		}

		card.find('[data-role="summary"]').text(pieces.join(' · '));
	}

	function appendFieldExtendSummary(card, pieces, label, supportedField) {
		const supported = parseList(card.find(`[data-rule-field="${supportedField}"]`).val());
		if (supported.length) {
			pieces.push(`追加${label}${supported.length}项`);
		}
	}

	function appendFieldSummary(card, pieces, label, modeField, requiredField, supportedField) {
		const supported = parseList(card.find(`[data-rule-field="${supportedField}"]`).val());
		const required = card.find(`[data-rule-field="${requiredField}"]`).prop('checked');
		const mode = String(card.find(`[data-rule-field="${modeField}"]`).val() || 'multi');

		if (required) {
			pieces.push(`${label}必填`);
		}

		if (mode === 'single') {
			pieces.push(`${label}单选`);
		}

		if (supported.length) {
			pieces.push(`${label}${supported.length}项`);
		}
	}

	function buildFieldConfigMarkup(cid, fieldKey, label, mode, required, supported) {
		const modeField = `${fieldKey === 'versions' ? 'version' : fieldKey === 'loaders' ? 'loader' : 'theme'}Mode`;
		const requireField = `${fieldKey === 'versions' ? 'requireVersions' : fieldKey === 'loaders' ? 'requireLoaders' : 'requireThemes'}`;
		const supportedField = `${fieldKey === 'versions' ? 'supportedVersions' : fieldKey === 'loaders' ? 'supportedLoaders' : 'supportedThemes'}`;
		const checkboxId = `variedmc-topic-meta-${supportedField}-${escapeHtml(String(cid))}`;

		return `
			<section class="variedmc-topic-meta-admin-field">
				<div class="d-flex justify-content-between align-items-center gap-2 mb-2 flex-wrap">
					<div class="fw-semibold">${label}</div>
					<div class="form-check m-0">
						<input class="form-check-input" type="checkbox" data-rule-field="${requireField}" data-role="field-required" id="${checkboxId}" ${required ? 'checked' : ''} />
						<label class="form-check-label small" for="${checkboxId}">必填</label>
					</div>
				</div>

				<div class="mb-2">
					<label class="form-label small">选择模式</label>
					<select class="form-select" data-rule-field="${modeField}" data-role="field-mode">
						<option value="multi" ${String(mode || 'multi') === 'multi' ? 'selected' : ''}>多选</option>
						<option value="single" ${String(mode || 'multi') === 'single' ? 'selected' : ''}>单选</option>
					</select>
					<div class="form-text">独立模式和继承并追加模式都可以设置；继承并追加时这里会覆盖父级的选择模式。</div>
				</div>

				<div>
					<label class="form-label small">允许的选项</label>
					<textarea class="form-control" rows="5" data-rule-field="${supportedField}" placeholder="留空表示不额外补充">${escapeHtml((supported || []).join('\n'))}</textarea>
					<div class="form-text" data-role="field-options-help">留空表示使用当前层的默认选项池。</div>
				</div>
			</section>
		`;
	}

	function getSearchText(card) {
		return [
			String(card.attr('data-search-text') || ''),
			String(card.find('[data-rule-field="scope"]').val() || ''),
			String(card.find('[data-rule-field="titleTemplate"]').val() || ''),
			String(card.find('[data-rule-field="rulesText"]').val() || ''),
			String(card.find('[data-rule-field="supportedVersions"]').val() || ''),
			String(card.find('[data-rule-field="supportedLoaders"]').val() || ''),
			String(card.find('[data-rule-field="supportedThemes"]').val() || ''),
		].join(' ').toLowerCase();
	}

	function getScopeLabel(scope) {
		if (scope === 'extend') {
			return '继承并追加';
		}
		if (scope === 'override') {
			return '本板块独立';
		}
		if (scope === 'hidden') {
			return '隐藏面板';
		}
		return '继承父级';
	}

	function normalizeSearchQuery(value) {
		return String(value || '').trim().toLowerCase();
	}

	function toListValue(value) {
		if (Array.isArray(value)) {
			return value.join('\n');
		}

		return String(value || '');
	}

	function parseList(value) {
		return String(value || '')
			.split(/[\n,]/)
			.map(item => item.trim())
			.filter(Boolean)
			.filter((item, index, array) => array.findIndex(entry => entry.toLowerCase() === item.toLowerCase()) === index);
	}

	function escapeHtml(value) {
		return String(value || '')
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	function getMessage(err) {
		if (!err) {
			return '[[error:invalid-data]]';
		}

		return err.message || err;
	}

	function normalizeRule(rule) {
		const normalized = rule && typeof rule === 'object' ? rule : {};
		const supportedVersions = parseList(toListValue(normalized.supportedVersions));
		const supportedLoaders = parseList(toListValue(normalized.supportedLoaders));
		const supportedThemes = parseList(toListValue(normalized.supportedThemes));
		const hasOverrides = [
			String(normalized.rulesText || '').trim(),
			String(normalized.titleTemplate || '').trim(),
			String(normalized.versionMode || 'multi') === 'single',
			String(normalized.loaderMode || 'multi') === 'single',
			String(normalized.themeMode || 'multi') === 'single',
			!!normalized.requireVersions,
			!!normalized.requireLoaders,
			!!normalized.requireThemes,
			supportedVersions.length > 0,
			supportedLoaders.length > 0,
			supportedThemes.length > 0,
		].some(Boolean);
		const rawScope = String(normalized.scope || '').trim();
		let scope = rawScope === 'custom' ? 'override' : rawScope;
		scope = ['inherit', 'extend', 'override', 'hidden'].includes(scope) ? scope : '';

		if (!scope) {
			if (normalized.enabled === false) {
				scope = hasOverrides ? 'hidden' : 'inherit';
			} else if (normalized.enabled === true || hasOverrides) {
				scope = 'override';
			} else {
				scope = 'inherit';
			}
		}

		return {
			scope,
			titleTemplate: String(normalized.titleTemplate || ''),
			rulesText: String(normalized.rulesText || ''),
			versionMode: String(normalized.versionMode || 'multi') === 'single' ? 'single' : 'multi',
			requireVersions: !!normalized.requireVersions,
			supportedVersions,
			loaderMode: String(normalized.loaderMode || 'multi') === 'single' ? 'single' : 'multi',
			requireLoaders: !!normalized.requireLoaders,
			supportedLoaders,
			themeMode: String(normalized.themeMode || 'multi') === 'single' ? 'single' : 'multi',
			requireThemes: !!normalized.requireThemes,
			supportedThemes,
		};
	}

	function buildCategoryIndex(categories) {
		return (categories || []).reduce(function (accumulator, category) {
			const cid = String(category && category.cid || '');
			if (cid) {
				accumulator[cid] = category;
			}
			return accumulator;
		}, {});
	}

	function buildInheritancePath(category) {
		const lineage = [];
		const visited = new Set();
		let current = category;

		while (current && current.cid && !visited.has(String(current.cid))) {
			visited.add(String(current.cid));
			lineage.unshift(String(current.name || `CID ${current.cid}`));
			current = adminState && adminState.categoryIndex ?
				adminState.categoryIndex[String(current.parentCid || '')] :
				null;
		}

		return ['全局'].concat(lineage).join(' -> ');
	}

	return ACP;
});
