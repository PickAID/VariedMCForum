'use strict';

const categories = require.main.require('./src/categories');
const meta = require.main.require('./src/meta');

const SETTINGS_KEY = 'variedmc-topic-meta';
const EMPTY_META = Object.freeze({
	versions: [],
	loaders: [],
	themes: [],
	baseTitle: '',
	prefix: '',
});

const defaultSettings = Object.freeze({
	defaultTitleTemplate: '{blocks} {title}',
	versionsCatalog: [
		'1.20.1',
		'1.21.1',
	],
	loadersCatalog: [
		'Forge',
		'NeoForge',
		'Fabric',
	],
	themesCatalog: [
		'KubeJS',
		'CraftTweaker',
		'数据包',
		'模组开发',
	],
	categoryRules: {},
});

const Settings = module.exports;

Settings.EMPTY_META = EMPTY_META;

Settings.getSettings = async function () {
	await meta.settings.setOnEmpty(SETTINGS_KEY, defaultSettings);
	const stored = await meta.settings.get(SETTINGS_KEY);
	const runtimeCategoryHierarchy = await buildCategoryHierarchy();
	return normalizeSettings({
		...stored,
		categoryHierarchy: runtimeCategoryHierarchy,
	});
};

Settings.getPublicConfig = async function () {
	return await Settings.getSettings();
};

Settings.getAdminState = async function () {
	const [settings, categoryOptions] = await Promise.all([
		Settings.getSettings(),
		categories.buildForSelectAll(['depth']),
	]);

	return {
		settings,
		categories: (categoryOptions || []).map(category => ({
			cid: parseCid(category.cid),
			name: String(category.name || ''),
			depth: Number.isFinite(Number(category.depth)) ? Number(category.depth) : 0,
			parentCid: parseCid(category.parentCid),
		})).filter(category => category.cid > 0),
	};
};

Settings.save = async function (input) {
	const settings = normalizeSettings(input);
	await meta.settings.set(SETTINGS_KEY, settings, true);
	return settings;
};

Settings.resolveCategoryRule = function (settings, cid) {
	const normalizedSettings = normalizeSettings(settings || {});
	const chain = buildCategoryChain(parseCid(cid), normalizedSettings.categoryHierarchy);
	let resolvedRule = buildGlobalResolvedRule(normalizedSettings);

	chain.forEach((currentCid) => {
		const currentRule = normalizeCategoryRule((normalizedSettings.categoryRules || {})[String(currentCid)] || {});
		resolvedRule = applyCategoryRule(normalizedSettings, resolvedRule, currentRule, currentCid);
	});

	return {
		cid: parseCid(cid),
		enabled: !!resolvedRule.enabled,
		scope: resolvedRule.scope,
		rulesText: normalizeText(resolvedRule.rulesText),
		titleTemplate: normalizeTitleTemplate(resolvedRule.titleTemplate, normalizedSettings.defaultTitleTemplate),
		fields: resolvedRule.fields,
	};
};

Settings.prepareMetaPayload = function (settings, cid, input, fallbackBaseTitle) {
	const rule = Settings.resolveCategoryRule(settings, cid);
	const metaInput = input && typeof input === 'object' ? input : {};
	const baseTitle = normalizeBaseTitle(metaInput.baseTitle || fallbackBaseTitle || '');

	const versions = selectCanonicalValues(metaInput.versions, rule.fields.versions);
	const loaders = selectCanonicalValues(metaInput.loaders, rule.fields.loaders);
	const themes = selectCanonicalValues(metaInput.themes, rule.fields.themes);

	validateFieldSelection(rule.fields.versions, versions);
	validateFieldSelection(rule.fields.loaders, loaders);
	validateFieldSelection(rule.fields.themes, themes);

	const prepared = {
		versions: versions.values,
		loaders: loaders.values,
		themes: themes.values,
		baseTitle,
		versionCatalog: rule.fields.versions.options.slice(),
	};
	prepared.prefix = Settings.buildTitlePrefix(prepared, {
		versionCatalog: rule.fields.versions.options,
	});
	const generatedTitle = Settings.buildGeneratedTitle(baseTitle, prepared, rule.titleTemplate, {
		versionCatalog: rule.fields.versions.options,
	});

	return {
		rule,
		meta: prepared,
		title: generatedTitle,
	};
};

Settings.buildTitleTokens = function (baseTitle, metaState, context = {}) {
	const normalizedBaseTitle = normalizeBaseTitle(baseTitle);
	const versions = normalizeOptionList(metaState && metaState.versions);
	const loaders = normalizeOptionList(metaState && metaState.loaders);
	const themes = normalizeOptionList(metaState && metaState.themes);
	const versionsText = formatVersionDisplay(versions, context.versionCatalog || metaState && metaState.versionCatalog);
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
		versionsBlock,
		loadersBlock,
		themesBlock,
		blocks,
		meta: blocks,
	};
};

Settings.buildTitlePrefix = function (metaState, context = {}) {
	return Settings.buildTitleTokens('', metaState, context).blocks;
};

Settings.buildGeneratedTitle = function (baseTitle, metaState, titleTemplate, context = {}) {
	const tokens = Settings.buildTitleTokens(baseTitle, metaState, context);
	const template = normalizeTitleTemplate(titleTemplate, defaultSettings.defaultTitleTemplate);
	const rendered = renderTitleTemplate(template, tokens);
	return normalizeGeneratedTitle(rendered) || tokens.title || tokens.blocks;
};

Settings.parseStoredMeta = function (topicData) {
	let parsed = {};

	try {
		parsed = JSON.parse(String(topicData && topicData.variedmcMeta || '{}'));
	} catch (err) {
		parsed = {};
	}

	return {
		versions: normalizeOptionList(parsed.versions || topicData && topicData.variedmcMetaVersions),
		loaders: normalizeOptionList(parsed.loaders || topicData && topicData.variedmcMetaLoaders),
		themes: normalizeOptionList(parsed.themes || topicData && topicData.variedmcMetaThemes),
		baseTitle: normalizeBaseTitle(parsed.baseTitle || topicData && topicData.variedmcMetaBaseTitle),
		prefix: normalizeText(parsed.prefix || topicData && topicData.variedmcMetaPrefix),
	};
};

Settings.serializeTopicMetaFields = function (metaState) {
	const payload = {
		versions: normalizeOptionList(metaState && metaState.versions),
		loaders: normalizeOptionList(metaState && metaState.loaders),
		themes: normalizeOptionList(metaState && metaState.themes),
		baseTitle: normalizeBaseTitle(metaState && metaState.baseTitle),
	};
	payload.prefix = Settings.buildTitlePrefix(payload, {
		versionCatalog: metaState && metaState.versionCatalog,
	});

	return {
		variedmcMeta: JSON.stringify(payload),
		variedmcMetaVersions: payload.versions.join(','),
		variedmcMetaLoaders: payload.loaders.join(','),
		variedmcMetaThemes: payload.themes.join(','),
		variedmcMetaBaseTitle: payload.baseTitle,
		variedmcMetaPrefix: payload.prefix,
	};
};

Settings.stripGeneratedPrefix = function (title, prefix) {
	const normalizedTitle = normalizeBaseTitle(title);
	const normalizedPrefix = normalizeText(prefix);

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
};

function normalizeSettings(input = {}) {
	return {
		defaultTitleTemplate: normalizeTitleTemplate(input.defaultTitleTemplate, defaultSettings.defaultTitleTemplate),
		versionsCatalog: normalizeOptionList(input.versionsCatalog || defaultSettings.versionsCatalog),
		loadersCatalog: normalizeOptionList(input.loadersCatalog || defaultSettings.loadersCatalog),
		themesCatalog: normalizeOptionList(input.themesCatalog || defaultSettings.themesCatalog),
		categoryHierarchy: normalizeCategoryHierarchy(input.categoryHierarchy),
		categoryRules: normalizeCategoryRules(input.categoryRules),
	};
}

function normalizeCategoryHierarchy(input) {
	const rawHierarchy = input && typeof input === 'object' ? input : {};
	const normalized = {};

	Object.keys(rawHierarchy).forEach((cid) => {
		const normalizedCid = String(parseCid(cid));
		if (normalizedCid === '0') {
			return;
		}

		normalized[normalizedCid] = parseCid(rawHierarchy[cid]);
	});

	return normalized;
}

function normalizeCategoryRules(input) {
	const rawRules = input && typeof input === 'object' ? input : {};
	const normalized = {};

	Object.keys(rawRules).forEach((cid) => {
		const normalizedCid = String(parseCid(cid));
		if (normalizedCid === '0') {
			return;
		}

		const rule = normalizeCategoryRule(rawRules[cid]);
		if (!shouldPersistCategoryRule(rule)) {
			return;
		}

		normalized[normalizedCid] = rule;
	});

	return normalized;
}

function normalizeCategoryRule(input = {}) {
	const scope = inferCategoryRuleScope(input);
	return {
		scope,
		enabled: scope !== 'hidden',
		requiresPrefix: true,
		rulesText: normalizeText(input.rulesText),
		titleTemplate: normalizeOptionalTitleTemplate(input.titleTemplate),
		versionMode: normalizeMode(input.versionMode),
		requireVersions: toBool(input.requireVersions),
		supportedVersions: normalizeOptionList(input.supportedVersions),
		loaderMode: normalizeMode(input.loaderMode),
		requireLoaders: toBool(input.requireLoaders),
		supportedLoaders: normalizeOptionList(input.supportedLoaders),
		themeMode: normalizeMode(input.themeMode),
		requireThemes: toBool(input.requireThemes),
		supportedThemes: normalizeOptionList(input.supportedThemes),
	};
}

function shouldPersistCategoryRule(rule) {
	return String(rule && rule.scope || 'inherit') !== 'inherit';
}

function inferCategoryRuleScope(input = {}) {
	const requestedScope = normalizeCategoryRuleScope(input.scope || input.ruleScope || input.mode);
	if (requestedScope) {
		return requestedScope;
	}

	const hasOverrides = hasCategoryRuleOverrides(input);
	if (toBool(input.enabled)) {
		return 'custom';
	}

	if (input.enabled === false || input.enabled === 'false' || input.enabled === 0 || input.enabled === '0') {
		return hasOverrides ? 'hidden' : 'inherit';
	}

	return hasOverrides ? 'override' : 'inherit';
}

function normalizeCategoryRuleScope(value) {
	const normalized = normalizeText(value);
	if (normalized === 'custom') {
		return 'override';
	}

	return ['inherit', 'extend', 'override', 'hidden'].includes(normalized) ? normalized : '';
}

function hasCategoryRuleOverrides(input = {}) {
	return [
		normalizeText(input.rulesText),
		normalizeText(input.titleTemplate),
		normalizeMode(input.versionMode) === 'single',
		normalizeMode(input.loaderMode) === 'single',
		normalizeMode(input.themeMode) === 'single',
		toBool(input.requireVersions),
		toBool(input.requireLoaders),
		toBool(input.requireThemes),
		normalizeOptionList(input.supportedVersions).length > 0,
		normalizeOptionList(input.supportedLoaders).length > 0,
		normalizeOptionList(input.supportedThemes).length > 0,
	].some(Boolean);
}

function validateFieldSelection(field, result) {
	if (!field.enabled) {
		return;
	}

	if (result.invalidValues.length) {
		throw new Error(`${field.label} 包含未允许的选项: ${result.invalidValues.join(', ')}`);
	}

	if (field.mode === 'single' && result.values.length > 1) {
		throw new Error(`${field.label} 只允许选择一个`);
	}

	if (field.required && result.values.length === 0) {
		throw new Error(`请选择至少一个${field.label}`);
	}
}

function selectCanonicalValues(value, field) {
	const rawValues = normalizeOptionList(value);
	if (!field.enabled) {
		return {
			values: [],
			invalidValues: rawValues,
		};
	}

	const canonicalMap = new Map(
		(field.options || []).map(option => [option.toLowerCase(), option])
	);
	const values = [];
	const invalidValues = [];

	rawValues.forEach((rawValue) => {
		const canonical = canonicalMap.get(rawValue.toLowerCase());
		if (!canonical) {
			invalidValues.push(rawValue);
			return;
		}

		if (!values.includes(canonical)) {
			values.push(canonical);
		}
	});

	return {
		values,
		invalidValues,
	};
}

function normalizeOptionList(input) {
	const items = Array.isArray(input) ? input : String(input || '').split(/[\n,]/);
	const unique = new Set();
	const normalized = [];

	items.forEach((item) => {
		const value = normalizeText(item);
		if (!value) {
			return;
		}

		const lowered = value.toLowerCase();
		if (unique.has(lowered)) {
			return;
		}

		unique.add(lowered);
		normalized.push(value);
	});

	return normalized;
}

function normalizeBaseTitle(value) {
	return normalizeText(value);
}

function normalizeGeneratedTitle(value) {
	return String(value || '').replace(/\s+/g, ' ').trim();
}

function formatVersionDisplay(input, catalogInput) {
	const versions = normalizeOptionList(input);
	if (!versions.length) {
		return '';
	}

	const catalog = normalizeOptionList(catalogInput);
	const orderMap = new Map(catalog.map((value, index) => [value.toLowerCase(), index]));
	const sorted = versions.slice().sort((left, right) => compareVersionValues(left, right, orderMap));
	if (sorted.length === 1 || catalog.length === 0) {
		return sorted.join(',');
	}

	const groups = [];
	let rangeStart = sorted[0];
	let previous = sorted[0];

	for (let i = 1; i < sorted.length; i += 1) {
		const current = sorted[i];
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

function normalizeText(value) {
	return String(value || '').trim();
}

function normalizeOptionalTitleTemplate(value) {
	return normalizeText(value);
}

function normalizeTitleTemplate(value, fallback) {
	const normalized = normalizeOptionalTitleTemplate(value);
	if (normalized) {
		return normalized;
	}

	const normalizedFallback = normalizeOptionalTitleTemplate(fallback);
	return normalizedFallback || defaultSettings.defaultTitleTemplate;
}

function normalizeMode(value) {
	return String(value || '').trim() === 'single' ? 'single' : 'multi';
}

function toBool(value) {
	return value === true || value === 'true' || value === 'on' || value === 1 || value === '1';
}

function parseCid(value) {
	const cid = parseInt(value, 10);
	return Number.isFinite(cid) ? cid : 0;
}

function buildFieldDefinition(key, label, mode, required, options, enabled) {
	return {
		key,
		label,
		mode: normalizeMode(mode),
		required: !!required,
		options: normalizeOptionList(options),
		enabled: !!enabled && normalizeOptionList(options).length > 0,
	};
}

function buildGlobalResolvedRule(settings) {
	return {
		scope: 'global',
		enabled: true,
		rulesText: '',
		titleTemplate: normalizeTitleTemplate(settings.defaultTitleTemplate, defaultSettings.defaultTitleTemplate),
		fields: {
			versions: buildFieldDefinition('versions', '版本', 'multi', false, settings.versionsCatalog, true),
			loaders: buildFieldDefinition('loaders', '运行环境', 'multi', false, settings.loadersCatalog, true),
			themes: buildFieldDefinition('themes', '主题', 'multi', false, settings.themesCatalog, true),
		},
	};
}

function applyCategoryRule(settings, baseRule, categoryRule, cid) {
	const scope = normalizeCategoryRuleScope(categoryRule && categoryRule.scope) || 'inherit';
	if (scope === 'inherit') {
		return {
			...baseRule,
			scope: 'inherit',
			cid,
		};
	}

	if (scope === 'hidden') {
		return {
			scope: 'hidden',
			cid,
			enabled: false,
			rulesText: normalizeText(baseRule && baseRule.rulesText),
			titleTemplate: normalizeTitleTemplate(baseRule && baseRule.titleTemplate, settings.defaultTitleTemplate),
			fields: {
				versions: buildFieldDefinition('versions', '版本', 'multi', false, [], false),
				loaders: buildFieldDefinition('loaders', '运行环境', 'multi', false, [], false),
				themes: buildFieldDefinition('themes', '主题', 'multi', false, [], false),
			},
		};
	}

	if (scope === 'extend') {
		if (!baseRule || !baseRule.enabled) {
			return {
				...baseRule,
				scope: 'hidden',
				cid,
				enabled: false,
			};
		}

		return {
			scope: 'extend',
			cid,
			enabled: true,
			rulesText: joinRuleText(baseRule.rulesText, categoryRule.rulesText),
			titleTemplate: normalizeTitleTemplate(categoryRule.titleTemplate, baseRule.titleTemplate),
			fields: {
				versions: extendFieldDefinition(baseRule.fields.versions, categoryRule.versionMode, categoryRule.requireVersions, categoryRule.supportedVersions),
				loaders: extendFieldDefinition(baseRule.fields.loaders, categoryRule.loaderMode, categoryRule.requireLoaders, categoryRule.supportedLoaders),
				themes: extendFieldDefinition(baseRule.fields.themes, categoryRule.themeMode, categoryRule.requireThemes, categoryRule.supportedThemes),
			},
		};
	}

	return {
		scope: 'override',
		cid,
		enabled: true,
		rulesText: normalizeText(categoryRule.rulesText),
		titleTemplate: normalizeTitleTemplate(categoryRule.titleTemplate, settings.defaultTitleTemplate),
		fields: {
			versions: overrideFieldDefinition('versions', '版本', categoryRule.versionMode, categoryRule.requireVersions, categoryRule.supportedVersions, settings.versionsCatalog),
			loaders: overrideFieldDefinition('loaders', '运行环境', categoryRule.loaderMode, categoryRule.requireLoaders, categoryRule.supportedLoaders, settings.loadersCatalog),
			themes: overrideFieldDefinition('themes', '主题', categoryRule.themeMode, categoryRule.requireThemes, categoryRule.supportedThemes, settings.themesCatalog),
		},
	};
}

function extendFieldDefinition(baseField, mode, required, additionalOptions) {
	const inheritedField = baseField || buildFieldDefinition('', '', 'multi', false, [], false);
	const options = mergeOptionLists(inheritedField.options, additionalOptions);
	return buildFieldDefinition(
		inheritedField.key,
		inheritedField.label,
		mode || inheritedField.mode,
		!!required,
		options,
		inheritedField.enabled
	);
}

function overrideFieldDefinition(key, label, mode, required, supportedOptions, fallbackCatalog) {
	const options = normalizeOptionList(supportedOptions).length ? supportedOptions : fallbackCatalog;
	return buildFieldDefinition(key, label, mode, required, options, true);
}

function mergeOptionLists(left, right) {
	return normalizeOptionList([].concat(normalizeOptionList(left), normalizeOptionList(right)));
}

function joinRuleText(baseText, appendText) {
	return [normalizeText(baseText), normalizeText(appendText)].filter(Boolean).join('\n');
}

function buildCategoryChain(cid, hierarchy) {
	const normalizedHierarchy = normalizeCategoryHierarchy(hierarchy);
	const chain = [];
	const seen = new Set();
	let currentCid = parseCid(cid);

	while (currentCid > 0 && !seen.has(currentCid)) {
		seen.add(currentCid);
		chain.unshift(currentCid);
		currentCid = parseCid(normalizedHierarchy[String(currentCid)]);
	}

	return chain;
}

async function buildCategoryHierarchy() {
	const categoryOptions = await categories.buildForSelectAll(['parentCid']);
	const hierarchy = {};

	(categoryOptions || []).forEach((category) => {
		const cid = parseCid(category && category.cid);
		if (cid <= 0) {
			return;
		}

		hierarchy[String(cid)] = parseCid(category && category.parentCid);
	});

	return hierarchy;
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

	for (let i = 0; i < maxLength; i += 1) {
		const leftToken = leftTokens[i];
		const rightToken = rightTokens[i];

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
	return matches.map((entry) => {
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

function renderTitleTemplate(template, tokens) {
	return String(template || '').replace(/\{(title|versions|loaders|themes|versionsBlock|loadersBlock|themesBlock|blocks|meta)\}/g, (match, token) => (
		Object.prototype.hasOwnProperty.call(tokens, token) ? String(tokens[token] || '') : ''
	));
}
