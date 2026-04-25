(function () {
	'use strict';

	const composerStates = new Map();
	let hooksBound = false;
	const RUNTIME_STYLE_ID = 'variedmc-topic-meta-runtime-style';

	bootstrap();

	function bootstrap() {
		ensureRuntimeStyles();
		if (window.jQuery) {
			const $window = window.jQuery(window);
			$window.on('action:composer.loaded', function (ev, data) {
				if (data && data.postContainer) {
					enhanceComposer(data.postContainer, data.composerData || {});
				}
			});
			$window.on('action:composer.changeCategory', function (ev, data) {
				if (data && data.postContainer) {
					refreshComposer(data.postContainer, data.postData || {});
				}
			});
		}

		bindComposerSubmitHook();
	}

	function ensureRuntimeStyles() {
		if (document.getElementById(RUNTIME_STYLE_ID)) {
			return;
		}

		const style = document.createElement('style');
		style.id = RUNTIME_STYLE_ID;
		style.textContent = `
			.variedmc-topic-meta-previewline {
				display: grid;
				gap: 0.16rem;
				padding: 0 0 0.24rem;
			}
			.variedmc-topic-meta-previewlabel {
				font-size: 0.74rem;
				font-weight: 700;
				letter-spacing: 0.04em;
				text-transform: uppercase;
				color: var(--bs-secondary-color);
			}
			.variedmc-topic-meta-preview {
				padding: 0.52rem 0.7rem;
				border: 1px solid var(--bs-border-color);
				border-radius: 0.52rem;
				background: var(--bs-body-bg);
				font-size: 0.98rem;
				line-height: 1.34;
			}
			.variedmc-topic-meta-shell {
				display: grid;
				gap: 0.32rem;
			}
			.variedmc-topic-meta-note {
				padding: 0.24rem 0.46rem;
				border-inline-start: 2px solid rgba(var(--bs-warning-rgb), 0.65);
				background: rgba(var(--bs-warning-rgb), 0.08);
				border-radius: 0 0.42rem 0.42rem 0;
				font-size: 0.73rem;
				line-height: 1.35;
			}
			.variedmc-topic-meta-inline-list {
				display: grid;
				gap: 0.24rem;
			}
			.variedmc-topic-meta-inline-field {
				display: flex;
				gap: 0.5rem;
				align-items: flex-start;
				min-width: 0;
			}
			.variedmc-topic-meta-inline-label {
				flex: 0 0 4.8rem;
				font-size: 0.75rem;
				font-weight: 600;
				line-height: 1.55;
				padding-top: 0.12rem;
				color: var(--bs-secondary-color);
			}
			.variedmc-topic-meta-inline-required {
				color: var(--bs-danger);
				margin-inline-start: 0.15rem;
			}
			.variedmc-topic-meta-options {
				display: flex;
				flex-wrap: wrap;
				gap: 0.24rem;
				flex: 1 1 auto;
				min-width: 0;
			}
			.variedmc-topic-meta-chip {
				display: inline-flex;
				align-items: center;
				min-height: 1.52rem;
				padding: 0.08rem 0.42rem;
				border: 1px solid var(--bs-border-color);
				border-radius: 999px;
				background: var(--bs-body-bg);
				cursor: pointer;
				user-select: none;
				font-size: 0.74rem;
				font-weight: 500;
				line-height: 1.2;
				transition: border-color 0.12s ease, background-color 0.12s ease;
			}
			.variedmc-topic-meta-chip.is-active {
				border-color: var(--bs-primary);
				background: rgba(var(--bs-primary-rgb), 0.12);
			}
		`;
		document.head.appendChild(style);
	}

	function bindComposerSubmitHook() {
		if (hooksBound || typeof require !== 'function') {
			return;
		}

		require(['hooks'], function (hooks) {
			if (hooksBound) {
				return;
			}

			hooks.on('filter:composer.submit', async function (hookData) {
				try {
					return await handleComposerSubmit(hookData);
				} catch (err) {
					restoreComposerSubmit(hookData && hookData.composerEl);
					showComposerError(err);
					throw err;
				}
			});
			hooksBound = true;
		});
	}

	function enhanceComposer(postContainer, composerData) {
		const $postContainer = window.jQuery(postContainer);
		if (!isSupportedComposer(composerData) || !$postContainer.length) {
			return;
		}

		const state = getComposerState($postContainer, composerData);
		renderComposerPanel($postContainer, state);
	}

	function refreshComposer(postContainer, postData) {
		const $postContainer = window.jQuery(postContainer);
		const uuid = String($postContainer.attr('data-uuid') || '');
		if (!uuid || !composerStates.has(uuid)) {
			return;
		}

		const state = composerStates.get(uuid);
		state.cid = resolveComposerCid($postContainer, postData);
		state.rule = resolveCategoryRule(state.cid);
		state.selected = constrainSelections(state.selected, state.rule);
		renderComposerPanel($postContainer, state);
	}

	function getComposerState(postContainer, composerData) {
		const uuid = String(postContainer.attr('data-uuid') || '');
		const storedMeta = normalizeMetaState(composerData.variedmcTopicMeta);
		let state = composerStates.get(uuid);

		if (!state) {
			state = {
				uuid,
				selected: {
					versions: storedMeta.versions.slice(),
					loaders: storedMeta.loaders.slice(),
					themes: storedMeta.themes.slice(),
				},
				cid: 0,
				rule: null,
				initialized: false,
			};
			composerStates.set(uuid, state);
		}

		state.cid = resolveComposerCid(postContainer, composerData);
		state.rule = resolveCategoryRule(state.cid);
		state.selected = constrainSelections(state.selected, state.rule);

		if (!state.initialized) {
			const titleInput = getTitleInput(postContainer);
			const existingPrefix = buildTitlePrefix(storedMeta, {
				versionCatalog: state.rule.fields.versions.options,
			});
			const baseTitle = storedMeta.baseTitle || stripGeneratedPrefix(titleInput.val(), existingPrefix);

			titleInput.val(baseTitle);
			titleInput.off('.variedmcTopicMeta').on('input.variedmcTopicMeta', function () {
				updateTitlePreview(postContainer, state);
			});

			state.initialized = true;
		}

		return state;
	}

	function renderComposerPanel(postContainer, state) {
		const existingPreview = postContainer.find('[component="variedmc/topic-meta-preview"]');
		const existingPanel = postContainer.find('[component="variedmc/topic-meta"]');
		if (!state.rule || !state.rule.enabled) {
			existingPreview.remove();
			existingPanel.remove();
			return;
		}

		const preview = existingPreview.length ? existingPreview : createComposerPreview();
		mountComposerPreview(postContainer, preview);
		const panel = existingPanel.length ? existingPanel : createComposerPanel(postContainer);
		preview.html(buildPreviewMarkup());
		panel.html(buildPanelMarkup(state));
		panel.off('.variedmcTopicMeta');
		panel.on('change.variedmcTopicMeta', '[data-meta-field]', function () {
			const input = window.jQuery(this);
			const field = String(input.attr('data-meta-field') || '');
			const value = String(input.attr('data-meta-value') || '');
			const fieldRule = state.rule.fields[field];

			if (!fieldRule || !fieldRule.enabled) {
				return;
			}

			if (fieldRule.mode === 'single') {
				state.selected[field] = input.prop('checked') ? [value] : [];
			} else if (input.prop('checked')) {
				if (!state.selected[field].includes(value)) {
					state.selected[field].push(value);
				}
			} else {
				state.selected[field] = state.selected[field].filter(entry => entry !== value);
			}

			state.selected = constrainSelections(state.selected, state.rule);
			renderComposerPanel(postContainer, state);
		});

		updateTitlePreview(postContainer, state);
	}

	function createComposerPreview() {
		return window.jQuery('<div component="variedmc/topic-meta-preview" class="variedmc-topic-meta-preview-panel"></div>');
	}

	function mountComposerPreview(postContainer, preview) {
		const titleSlot = postContainer.find('[data-component="composer/title"]').first();
		if (titleSlot.length) {
			titleSlot.prepend(preview);
			return preview;
		}

		const titleContainer = postContainer.find('.title-container').first();
		if (titleContainer.length) {
			titleContainer.before(preview);
			return preview;
		}

		postContainer.prepend(preview);
		return preview;
	}

	function createComposerPanel(postContainer) {
		const panel = window.jQuery('<div component="variedmc/topic-meta" class="variedmc-topic-meta-panel mt-2"></div>');
		const titleContainer = postContainer.find('.title-container').first();
		if (titleContainer.length) {
			titleContainer.after(panel);
			return panel;
		}

		const tagRow = postContainer.find('.tag-row').first();
		if (tagRow.length) {
			tagRow.before(panel);
			return panel;
		}

		postContainer.find('.composer-formatting-bar, .write-container').first().before(panel);
		return panel;
	}

	function buildPreviewMarkup() {
		return `
			<div class="variedmc-topic-meta-previewline">
				<div class="variedmc-topic-meta-previewlabel">最终标题预览</div>
				<div class="variedmc-topic-meta-preview" data-role="title-preview"></div>
			</div>
		`;
	}

	function buildPanelMarkup(state) {
		const fieldMarkup = ['versions', 'loaders', 'themes']
			.map(key => buildFieldMarkup(state.uuid, key, state.rule.fields[key], state.selected[key] || []))
			.filter(Boolean)
			.join('');
		const rulesText = state.rule.rulesText ?
			`<div class="variedmc-topic-meta-note">${escapeHtml(state.rule.rulesText).replace(/\n/g, '<br>')}</div>` :
			'';

		return `
			<div class="variedmc-topic-meta-shell">
				${rulesText}

				<div class="variedmc-topic-meta-inline-list">
					${fieldMarkup}
				</div>
			</div>
		`;
	}

	function buildFieldMarkup(uuid, key, field, selectedValues) {
		if (!field || !field.enabled) {
			return '';
		}

		const optionsMarkup = (field.options || []).map((option) => {
			const checked = selectedValues.includes(option);
			const inputType = field.mode === 'single' ? 'radio' : 'checkbox';
			return `
				<label class="variedmc-topic-meta-chip ${checked ? 'is-active' : ''}">
					<input
						class="d-none"
						type="${inputType}"
						name="variedmc-topic-meta-${escapeHtml(uuid)}-${escapeHtml(field.key)}"
						data-meta-field="${escapeHtml(field.key)}"
						data-meta-value="${escapeHtml(option)}"
						${checked ? 'checked' : ''}
					/>
					<span>${escapeHtml(option)}</span>
				</label>
			`;
		}).join('');

		return `
			<section class="variedmc-topic-meta-inline-field">
				<div class="variedmc-topic-meta-inline-label">
					${escapeHtml(field.label)}
					${field.required ? '<span class="variedmc-topic-meta-inline-required">*</span>' : ''}
				</div>
				<div class="variedmc-topic-meta-options">
					${optionsMarkup}
				</div>
			</section>
		`;
	}

	function updateTitlePreview(postContainer, state) {
		const titleInput = getTitleInput(postContainer);
		const previewEl = postContainer.find('[component="variedmc/topic-meta-preview"] [data-role="title-preview"]');
		const baseTitle = String(titleInput.val() || '').trim();
		const metaState = {
			versions: state.selected.versions,
			loaders: state.selected.loaders,
			themes: state.selected.themes,
		};
		const previewTitle = buildGeneratedTitle(baseTitle, metaState, state.rule.titleTemplate, {
			versionCatalog: state.rule.fields.versions.options,
		}) || '未填写标题';

		previewEl.text(previewTitle);
	}

	async function handleComposerSubmit(hookData) {
		if (!hookData || !hookData.composerEl) {
			return hookData;
		}

		const composerEl = window.jQuery(hookData.composerEl);
		const uuid = String(composerEl.attr('data-uuid') || '');
		if (!uuid || !composerStates.has(uuid)) {
			return hookData;
		}

		const state = composerStates.get(uuid);
		if (!state.rule || !state.rule.enabled) {
			return hookData;
		}

		const titleInput = getTitleInput(composerEl);
		const baseTitle = String(titleInput.val() || '').trim();
		validateComposerState(state.rule, state.selected);

		hookData.composerData.variedmcTopicMeta = {
			versions: state.selected.versions.slice(),
			loaders: state.selected.loaders.slice(),
			themes: state.selected.themes.slice(),
			baseTitle,
		};
		return hookData;
	}

	function validateComposerState(rule, selected) {
		['versions', 'loaders', 'themes'].forEach((key) => {
			const field = rule.fields[key];
			const values = selected[key] || [];
			if (!field || !field.enabled) {
				return;
			}

			if (field.required && values.length === 0) {
				throw new Error(`请选择至少一个${field.label}`);
			}

			if (field.mode === 'single' && values.length > 1) {
				throw new Error(`${field.label} 只允许选择一个`);
			}
		});
	}

	function resolveCategoryRule(cid) {
		const config = normalizeConfig(getPluginConfig());
		if (!config) {
			return disabledRule();
		}

		const chain = buildCategoryChain(parseCid(cid), config.categoryHierarchy);
		let resolvedRule = buildGlobalResolvedRule(config);

		chain.forEach(function (currentCid) {
			const currentRule = normalizeRuleConfig((config.categoryRules || {})[String(currentCid)]);
			resolvedRule = applyCategoryRule(config, resolvedRule, currentRule);
		});

		return {
			enabled: !!resolvedRule.enabled,
			scope: resolvedRule.scope,
			rulesText: String(resolvedRule.rulesText || '').trim(),
			titleTemplate: normalizeTitleTemplate(resolvedRule.titleTemplate, config.defaultTitleTemplate),
			fields: resolvedRule.fields,
		};
	}

	function constrainSelections(selected, rule) {
		const next = {
			versions: filterSelectedValues(selected.versions || [], rule.fields.versions),
			loaders: filterSelectedValues(selected.loaders || [], rule.fields.loaders),
			themes: filterSelectedValues(selected.themes || [], rule.fields.themes),
		};

		return next;
	}

	function filterSelectedValues(values, field) {
		if (!field || !field.enabled) {
			return [];
		}

		const allowed = new Set((field.options || []).map(option => option.toLowerCase()));
		const filtered = normalizeList(values).filter(value => allowed.has(value.toLowerCase()));
		return field.mode === 'single' ? filtered.slice(0, 1) : filtered;
	}

	function normalizeMetaState(input) {
		const metaState = input && typeof input === 'object' ? input : {};
		return {
			versions: normalizeList(metaState.versions),
			loaders: normalizeList(metaState.loaders),
			themes: normalizeList(metaState.themes),
			baseTitle: String(metaState.baseTitle || '').trim(),
		};
	}

	function getTitleInput(postContainer) {
		return postContainer.find('input.title').first();
	}

	function resolveComposerCid(postContainer, composerData) {
		const composerCid = parseCid(composerData && composerData.cid);
		if (composerCid > 0) {
			return composerCid;
		}

		const ajaxifyCid = parseCid(window.ajaxify && window.ajaxify.data && window.ajaxify.data.cid);
		if (ajaxifyCid > 0) {
			return ajaxifyCid;
		}

		const selectedCid = parseCid(postContainer.find('[component="category-selector-selected"]').attr('data-cid'));
		return selectedCid;
	}

	function isSupportedComposer(composerData) {
		if (!composerData) {
			return false;
		}

		return composerData.action === 'topics.post' ||
			(composerData.action === 'posts.edit' && composerData.isMain);
	}

	function buildTitlePrefix(metaState, context) {
		return buildTitleTokens('', metaState, context).blocks;
	}

	function buildGeneratedTitle(baseTitle, metaState, titleTemplate, context) {
		const tokens = buildTitleTokens(baseTitle, metaState, context);
		const template = normalizeTitleTemplate(titleTemplate, '{blocks} {title}');
		const rendered = renderTitleTemplate(template, tokens);
		return normalizeGeneratedTitle(rendered) || tokens.title || tokens.blocks;
	}

	function buildTitleTokens(baseTitle, metaState, context) {
		const normalizedBaseTitle = String(baseTitle || '').trim();
		const versions = normalizeList(metaState && metaState.versions);
		const loaders = normalizeList(metaState && metaState.loaders);
		const themes = normalizeList(metaState && metaState.themes);
		const versionsText = formatVersionDisplay(versions, context && context.versionCatalog || metaState && metaState.versionCatalog);
		const loadersText = loaders.join(',');
		const themesText = themes.join(',');
		const versionsBlock = versionsText ? `[${versionsText}]` : '';
		const loadersBlock = loadersText ? `[${loadersText}]` : '';
		const themesBlock = themesText ? `[${themesText}]` : '';
		const blocks = `${versionsBlock}${loadersBlock}${themesBlock}`;

		return {
			title: normalizedBaseTitle,
			versions: versionsText,
			loaders: loadersText,
			themes: themesText,
			versionsBlock: versionsBlock,
			loadersBlock: loadersBlock,
			themesBlock: themesBlock,
			blocks: blocks,
			meta: blocks,
		};
	}

	function stripGeneratedPrefix(title, prefix) {
		const normalizedTitle = String(title || '').trim();
		const normalizedPrefix = String(prefix || '').trim();

		if (!normalizedPrefix) {
			return normalizedTitle;
		}

		if (normalizedTitle === normalizedPrefix) {
			return '';
		}

		if (normalizedTitle.startsWith(`${normalizedPrefix} `)) {
			return normalizedTitle.slice(normalizedPrefix.length + 1).trim();
		}

		return normalizedTitle;
	}

	function normalizeList(input) {
		const values = Array.isArray(input) ? input : String(input || '').split(/[\n,]/);
		const unique = new Set();
		const normalized = [];

		values.forEach((value) => {
			const trimmed = String(value || '').trim();
			if (!trimmed) {
				return;
			}

			const lowered = trimmed.toLowerCase();
			if (unique.has(lowered)) {
				return;
			}

			unique.add(lowered);
			normalized.push(trimmed);
		});

		return normalized;
	}

	function normalizeGeneratedTitle(value) {
		return String(value || '').replace(/\s+/g, ' ').trim();
	}

	function formatVersionDisplay(input, catalogInput) {
		const versions = normalizeList(input);
		if (!versions.length) {
			return '';
		}

		const catalog = normalizeList(catalogInput);
		const orderMap = new Map(catalog.map(function (value, index) {
			return [value.toLowerCase(), index];
		}));
		const sorted = versions.slice().sort(function (left, right) {
			return compareVersionValues(left, right, orderMap);
		});
		if (sorted.length === 1 || catalog.length === 0) {
			return sorted.join(',');
		}

		const groups = [];
		let rangeStart = sorted[0];
		let previous = sorted[0];

		for (let index = 1; index < sorted.length; index += 1) {
			const current = sorted[index];
			if (areAdjacentVersionValues(previous, current, orderMap)) {
				previous = current;
				continue;
			}

			groups.push(formatVersionRange(rangeStart, previous));
			rangeStart = current;
			previous = current;
		}

		groups.push(formatVersionRange(rangeStart, previous));
		return groups.join(',');
	}

	function normalizeConfig(input) {
		if (!input || typeof input !== 'object') {
			return null;
		}

		return {
			defaultTitleTemplate: normalizeTitleTemplate(input.defaultTitleTemplate, '{blocks} {title}'),
			versionsCatalog: normalizeList(input.versionsCatalog),
			loadersCatalog: normalizeList(input.loadersCatalog),
			themesCatalog: normalizeList(input.themesCatalog),
			categoryHierarchy: normalizeCategoryHierarchy(input.categoryHierarchy),
			categoryRules: input.categoryRules && typeof input.categoryRules === 'object' ? input.categoryRules : {},
		};
	}

	function normalizeCategoryHierarchy(input) {
		const rawHierarchy = input && typeof input === 'object' ? input : {};
		const normalized = {};

		Object.keys(rawHierarchy).forEach(function (cid) {
			const normalizedCid = String(parseCid(cid));
			if (normalizedCid === '0') {
				return;
			}

			normalized[normalizedCid] = parseCid(rawHierarchy[cid]);
		});

		return normalized;
	}

	function normalizeTitleTemplate(value, fallback) {
		const normalized = String(value || '').trim();
		if (normalized) {
			return normalized;
		}

		const normalizedFallback = String(fallback || '').trim();
		return normalizedFallback || '{blocks} {title}';
	}

	function renderTitleTemplate(template, tokens) {
		return String(template || '').replace(/\{(title|versions|loaders|themes|versionsBlock|loadersBlock|themesBlock|blocks|meta)\}/g, function (match, token) {
			return Object.prototype.hasOwnProperty.call(tokens, token) ? String(tokens[token] || '') : '';
		});
	}

	function disabledRule() {
		return {
			enabled: false,
			scope: 'hidden',
			rulesText: '',
			titleTemplate: '{blocks} {title}',
			fields: {
				versions: { enabled: false, options: [], mode: 'multi', required: false, key: 'versions', label: '版本' },
				loaders: { enabled: false, options: [], mode: 'multi', required: false, key: 'loaders', label: '运行环境' },
				themes: { enabled: false, options: [], mode: 'multi', required: false, key: 'themes', label: '主题' },
			},
		};
	}

	function parseCid(value) {
		const parsed = parseInt(value, 10);
		return Number.isFinite(parsed) ? parsed : 0;
	}

	function compareVersionValues(left, right, orderMap) {
		const leftIndex = orderMap.get(String(left || '').toLowerCase());
		const rightIndex = orderMap.get(String(right || '').toLowerCase());
		if (leftIndex !== undefined && rightIndex !== undefined) {
			return leftIndex - rightIndex;
		}

		const leftTokens = tokenizeVersionLikeValue(left);
		const rightTokens = tokenizeVersionLikeValue(right);
		const maxLength = Math.max(leftTokens.length, rightTokens.length);

		for (let index = 0; index < maxLength; index += 1) {
			const leftToken = leftTokens[index];
			const rightToken = rightTokens[index];

			if (leftToken === undefined) {
				return -1;
			}

			if (rightToken === undefined) {
				return 1;
			}

			if (leftToken.type === rightToken.type) {
				if (leftToken.value < rightToken.value) {
					return -1;
				}

				if (leftToken.value > rightToken.value) {
					return 1;
				}

				continue;
			}

			return leftToken.type === 'number' ? -1 : 1;
		}

		return String(left || '').localeCompare(String(right || ''), undefined, {
			numeric: true,
			sensitivity: 'base',
		});
	}

	function areAdjacentVersionValues(left, right, orderMap) {
		const leftIndex = orderMap.get(String(left || '').toLowerCase());
		const rightIndex = orderMap.get(String(right || '').toLowerCase());
		return leftIndex !== undefined && rightIndex !== undefined && rightIndex - leftIndex === 1;
	}

	function formatVersionRange(start, end) {
		return start === end ? start : `${start}-${end}`;
	}

	function tokenizeVersionLikeValue(value) {
		const matches = String(value || '').trim().match(/\d+|[a-z]+/gi) || [];
		return matches.map(function (entry) {
			if (/^\d+$/.test(entry)) {
				return {
					type: 'number',
					value: parseInt(entry, 10),
				};
			}

			return {
				type: 'text',
				value: entry.toLowerCase(),
			};
		});
	}

	function getPluginConfig() {
		return window.config && window.config.variedmcTopicMeta;
	}

	function normalizeRuleConfig(input) {
		const rawRule = input && typeof input === 'object' ? input : {};
		const scope = inferRuleScope(rawRule);

		return {
			scope: scope,
			rulesText: String(rawRule.rulesText || '').trim(),
			titleTemplate: String(rawRule.titleTemplate || '').trim(),
			versionMode: String(rawRule.versionMode || 'multi') === 'single' ? 'single' : 'multi',
			requireVersions: !!rawRule.requireVersions,
			supportedVersions: normalizeList(rawRule.supportedVersions),
			loaderMode: String(rawRule.loaderMode || 'multi') === 'single' ? 'single' : 'multi',
			requireLoaders: !!rawRule.requireLoaders,
			supportedLoaders: normalizeList(rawRule.supportedLoaders),
			themeMode: String(rawRule.themeMode || 'multi') === 'single' ? 'single' : 'multi',
			requireThemes: !!rawRule.requireThemes,
			supportedThemes: normalizeList(rawRule.supportedThemes),
		};
	}

	function inferRuleScope(rule) {
		const rawScope = String(rule && (rule.scope || rule.ruleScope || rule.mode) || '').trim();
		if (rawScope === 'custom') {
			return 'override';
		}
		if (['inherit', 'extend', 'override', 'hidden'].includes(rawScope)) {
			return rawScope;
		}

		const hasOverrides = hasRuleOverrides(rule);
		if (rule && rule.enabled === true) {
			return 'custom';
		}

		if (rule && (rule.enabled === false || rule.enabled === 'false' || rule.enabled === 0 || rule.enabled === '0')) {
			return hasOverrides ? 'hidden' : 'inherit';
		}

		return hasOverrides ? 'override' : 'inherit';
	}

	function hasRuleOverrides(rule) {
		const rawRule = rule && typeof rule === 'object' ? rule : {};
		return [
			String(rawRule.rulesText || '').trim(),
			String(rawRule.titleTemplate || '').trim(),
			String(rawRule.versionMode || 'multi') === 'single',
			String(rawRule.loaderMode || 'multi') === 'single',
			String(rawRule.themeMode || 'multi') === 'single',
			!!rawRule.requireVersions,
			!!rawRule.requireLoaders,
			!!rawRule.requireThemes,
			normalizeList(rawRule.supportedVersions).length > 0,
			normalizeList(rawRule.supportedLoaders).length > 0,
			normalizeList(rawRule.supportedThemes).length > 0,
		].some(Boolean);
	}

	function buildFieldDefinition(key, label, mode, required, options, enabled) {
		const normalizedOptions = normalizeList(options);
		return {
			key: key,
			label: label,
			mode: String(mode || 'multi') === 'single' ? 'single' : 'multi',
			required: !!required,
			options: normalizedOptions,
			enabled: !!enabled && normalizedOptions.length > 0,
		};
	}

	function buildGlobalResolvedRule(config) {
		return {
			scope: 'global',
			enabled: true,
			rulesText: '',
			titleTemplate: normalizeTitleTemplate(config.defaultTitleTemplate, '{blocks} {title}'),
			fields: {
				versions: buildFieldDefinition('versions', '版本', 'multi', false, config.versionsCatalog, true),
				loaders: buildFieldDefinition('loaders', '运行环境', 'multi', false, config.loadersCatalog, true),
				themes: buildFieldDefinition('themes', '主题', 'multi', false, config.themesCatalog, true),
			},
		};
	}

	function applyCategoryRule(config, baseRule, rawRule) {
		const scope = String(rawRule && rawRule.scope || 'inherit').trim();

		if (scope === 'inherit') {
			return {
				enabled: !!(baseRule && baseRule.enabled),
				scope: 'inherit',
				rulesText: String(baseRule && baseRule.rulesText || '').trim(),
				titleTemplate: String(baseRule && baseRule.titleTemplate || '').trim(),
				fields: baseRule && baseRule.fields ? baseRule.fields : disabledRule().fields,
			};
		}

		if (scope === 'hidden') {
			return disabledRule();
		}

		if (scope === 'extend') {
			if (!baseRule || !baseRule.enabled) {
				return disabledRule();
			}

			return {
				enabled: true,
				scope: 'extend',
				rulesText: joinRuleText(baseRule.rulesText, rawRule.rulesText),
				titleTemplate: normalizeTitleTemplate(rawRule.titleTemplate, baseRule.titleTemplate),
				fields: {
					versions: extendFieldDefinition(baseRule.fields.versions, rawRule.versionMode, rawRule.requireVersions, rawRule.supportedVersions),
					loaders: extendFieldDefinition(baseRule.fields.loaders, rawRule.loaderMode, rawRule.requireLoaders, rawRule.supportedLoaders),
					themes: extendFieldDefinition(baseRule.fields.themes, rawRule.themeMode, rawRule.requireThemes, rawRule.supportedThemes),
				},
			};
		}

		return {
			enabled: true,
			scope: 'override',
			rulesText: String(rawRule.rulesText || '').trim(),
			titleTemplate: normalizeTitleTemplate(rawRule.titleTemplate, config.defaultTitleTemplate),
			fields: {
				versions: overrideFieldDefinition('versions', '版本', rawRule.versionMode, rawRule.requireVersions, rawRule.supportedVersions, config.versionsCatalog),
				loaders: overrideFieldDefinition('loaders', '运行环境', rawRule.loaderMode, rawRule.requireLoaders, rawRule.supportedLoaders, config.loadersCatalog),
				themes: overrideFieldDefinition('themes', '主题', rawRule.themeMode, rawRule.requireThemes, rawRule.supportedThemes, config.themesCatalog),
			},
		};
	}

	function extendFieldDefinition(baseField, mode, required, additionalOptions) {
		const inheritedField = baseField || buildFieldDefinition('', '', 'multi', false, [], false);
		return buildFieldDefinition(
			inheritedField.key,
			inheritedField.label,
			mode || inheritedField.mode,
			!!required,
			mergeOptionLists(inheritedField.options, additionalOptions),
			inheritedField.enabled
		);
	}

	function overrideFieldDefinition(key, label, mode, required, supportedOptions, fallbackCatalog) {
		const normalizedSupported = normalizeList(supportedOptions);
		const options = normalizedSupported.length ? normalizedSupported : normalizeList(fallbackCatalog);
		return buildFieldDefinition(key, label, mode, required, options, true);
	}

	function mergeOptionLists(left, right) {
		return normalizeList([].concat(normalizeList(left), normalizeList(right)));
	}

	function joinRuleText(baseText, appendText) {
		return [String(baseText || '').trim(), String(appendText || '').trim()].filter(Boolean).join('\n');
	}

	function buildCategoryChain(cid, hierarchy) {
		const normalizedHierarchy = normalizeCategoryHierarchy(hierarchy);
		const chain = [];
		const visited = new Set();
		let currentCid = parseCid(cid);

		while (currentCid > 0 && !visited.has(String(currentCid))) {
			visited.add(String(currentCid));
			chain.unshift(currentCid);
			currentCid = parseCid(normalizedHierarchy[String(currentCid)]);
		}

		return chain;
	}

	function restoreComposerSubmit(composerEl) {
		const composer = composerEl ? window.jQuery(composerEl) : null;
		if (!composer || !composer.length) {
			return;
		}

		composer.find('.composer-submit').removeAttr('disabled');
	}

	function showComposerError(err) {
		const message = err && err.message ? err.message : String(err || '[[error:invalid-data]]');
		if (typeof require !== 'function') {
			window.alert(message);
			return;
		}

		require(['alerts'], function (alerts) {
			alerts.error(message);
		});
	}

	function escapeHtml(value) {
		return String(value || '')
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}
}());
