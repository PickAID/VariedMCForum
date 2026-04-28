'use strict';

const { defaultSettings } = require('./defaults');
const KeyNormalizer = require('./key-normalizer');

class SettingsNormalizer {
	static normalize(input = {}) {
		const versionsCatalog = KeyNormalizer.list(input.versionsCatalog || defaultSettings.versionsCatalog);
		const loadersCatalog = KeyNormalizer.list(input.loadersCatalog || defaultSettings.loadersCatalog);
		const themesCatalog = KeyNormalizer.list(input.themesCatalog || defaultSettings.themesCatalog);
		const lists = SettingsNormalizer.normalizeLists(input, themesCatalog);

		return {
			defaultTitleTemplate: SettingsNormalizer.titleTemplate(
				input.defaultTitleTemplate,
				defaultSettings.defaultTitleTemplate
			),
			versionsCatalog,
			loadersCatalog,
			themesCatalog,
			builtInFields: SettingsNormalizer.normalizeBuiltInFields(input, versionsCatalog, loadersCatalog),
			lists,
			modules: SettingsNormalizer.listsToModules(lists),
			categoryHierarchy: SettingsNormalizer.normalizeCategoryHierarchy(input.categoryHierarchy),
			categoryAliases: SettingsNormalizer.normalizeCategoryAliases(input.categoryAliases),
			categoryRules: SettingsNormalizer.normalizeCategoryRules(input.categoryRules),
		};
	}

	static normalizeBuiltInFields(input, versionsCatalog, loadersCatalog) {
		const raw = input.builtInFields && typeof input.builtInFields === 'object' ? input.builtInFields : {};
		return {
			version: SettingsNormalizer.normalizeField(raw.version, {
				id: 'versions',
				selectionKey: 'versions',
				fieldKey: 'version',
				label: '版本',
				options: versionsCatalog,
				builtIn: true,
			}),
			loader: SettingsNormalizer.normalizeField(raw.loader, {
				id: 'loaders',
				selectionKey: 'loaders',
				fieldKey: 'loader',
				label: '运行环境',
				options: loadersCatalog,
				builtIn: true,
			}),
		};
	}

	static normalizeLists(input, themesCatalog = [], includeFallback = true) {
		const rawLists = Array.isArray(input.lists) && input.lists.length ?
			input.lists :
			SettingsNormalizer.modulesToLists(input.modules, themesCatalog, includeFallback);
		const usedIds = new Set();

		return rawLists.map((listInput, index) => {
			const list = SettingsNormalizer.normalizeList(listInput, index);
			if (!list || usedIds.has(list.id)) {
				return null;
			}
			usedIds.add(list.id);
			return list;
		}).filter(Boolean);
	}

	static normalizeList(input, index = 0) {
		const raw = input && typeof input === 'object' ? input : {};
		const id = KeyNormalizer.key(raw.id || raw.selectionKey || raw.key || raw.moduleKey) || `meta-${index + 1}`;
		const moduleKey = KeyNormalizer.key(raw.moduleKey || raw.key || id);
		const fieldKey = KeyNormalizer.key(raw.fieldKey || 'primary') || 'primary';
		const selectionKey = KeyNormalizer.key(raw.selectionKey || id);
		const label = KeyNormalizer.text(raw.label || raw.moduleLabel || raw.name) || id;

		return {
			id,
			label,
			mode: KeyNormalizer.mode(raw.mode),
			required: KeyNormalizer.bool(raw.required),
			options: KeyNormalizer.list(raw.options),
			enabled: raw.enabled === undefined ? true : KeyNormalizer.bool(raw.enabled),
			titleVisible: raw.titleVisible === undefined ? true : KeyNormalizer.bool(raw.titleVisible),
			searchVisible: raw.searchVisible === undefined ? true : KeyNormalizer.bool(raw.searchVisible),
			filterable: raw.filterable === undefined ? true : KeyNormalizer.bool(raw.filterable),
			moduleKey,
			fieldKey,
			selectionKey,
			builtIn: !!raw.builtIn,
		};
	}

	static modulesToLists(modules, themesCatalog = [], includeFallback = true) {
		if ((!Array.isArray(modules) || !modules.length) && !includeFallback) {
			return [];
		}
		const source = Array.isArray(modules) && modules.length ? modules : [{
			key: 'topic',
			label: '主题',
			fields: [{
				key: 'primary',
				selectionKey: 'themes',
				label: '主题',
				options: themesCatalog,
			}],
		}];
		const lists = [];

		source.forEach((moduleInput) => {
			const moduleKey = KeyNormalizer.key(moduleInput && moduleInput.key);
			if (!moduleKey) {
				return;
			}
			const fields = Array.isArray(moduleInput.fields) && moduleInput.fields.length ?
				moduleInput.fields :
				[{ key: 'primary', selectionKey: `${moduleKey}.primary` }];
			fields.forEach((fieldInput) => {
				const fieldKey = KeyNormalizer.key(fieldInput && fieldInput.key) || 'primary';
				const selectionKey = KeyNormalizer.key(
					fieldInput && fieldInput.selectionKey ||
					(moduleKey === 'topic' && fieldKey === 'primary' ? 'themes' : `${moduleKey}.${fieldKey}`)
				);
				lists.push(SettingsNormalizer.normalizeList({
					...(fieldInput || {}),
					id: selectionKey === 'themes' ? 'topic' : selectionKey,
					moduleKey,
					moduleLabel: moduleInput.label,
					fieldKey,
					selectionKey,
					label: fieldInput && fieldInput.label || moduleInput.label,
				}, lists.length));
			});
		});

		return lists;
	}

	static listsToModules(lists) {
		return (Array.isArray(lists) ? lists : []).map(list => ({
			key: list.moduleKey || list.id,
			label: list.label,
			fields: [{
				key: list.fieldKey || 'primary',
				selectionKey: list.selectionKey || list.id,
				label: list.label,
				enabled: list.enabled !== false,
				mode: list.mode,
				required: !!list.required,
				options: KeyNormalizer.list(list.options),
				titleVisible: list.titleVisible !== false,
				searchVisible: list.searchVisible !== false,
				filterable: list.filterable !== false,
			}],
		}));
	}

	static normalizeCategoryRules(input) {
		const rawRules = input && typeof input === 'object' ? input : {};
		const normalized = {};

		Object.keys(rawRules).forEach((cid) => {
			const normalizedCid = String(KeyNormalizer.cid(cid));
			const rule = SettingsNormalizer.normalizeCategoryRule(rawRules[cid]);
			if (normalizedCid !== '0' && SettingsNormalizer.shouldPersistRule(rule)) {
				normalized[normalizedCid] = rule;
			}
		});

		return normalized;
	}

	static normalizeCategoryRule(input = {}) {
		const scope = SettingsNormalizer.inferScope(input);
		const lists = SettingsNormalizer.normalizeLists(input, [], false);
		const fieldRules = SettingsNormalizer.normalizeFieldRules(input.fieldRules);
		SettingsNormalizer.mergeLegacyFieldRule(fieldRules, 'versions', input.versionMode, input.requireVersions, input.supportedVersions);
		SettingsNormalizer.mergeLegacyFieldRule(fieldRules, 'loaders', input.loaderMode, input.requireLoaders, input.supportedLoaders);
		SettingsNormalizer.mergeLegacyFieldRule(fieldRules, 'themes', input.themeMode, input.requireThemes, input.supportedThemes);

		return {
			scope: scope === 'inherit' && lists.length ? 'extend' : scope,
			enabled: scope !== 'hidden',
			rulesText: KeyNormalizer.text(input.rulesText),
			titleTemplate: KeyNormalizer.text(input.titleTemplate),
			lists,
			modules: SettingsNormalizer.listsToModules(lists),
			fieldRules,
		};
	}

	static normalizeField(input, defaults) {
		const raw = input && typeof input === 'object' ? input : {};
		const options = KeyNormalizer.list(raw.options || defaults.options);
		const enabled = raw.enabled === undefined ? true : KeyNormalizer.bool(raw.enabled);
		return {
			id: KeyNormalizer.key(defaults.id || defaults.selectionKey || defaults.key),
			key: KeyNormalizer.key(defaults.key || defaults.selectionKey || defaults.id),
			selectionKey: KeyNormalizer.key(defaults.selectionKey || defaults.id || defaults.key),
			fieldKey: KeyNormalizer.key(defaults.fieldKey || defaults.key || defaults.id),
			moduleKey: KeyNormalizer.key(defaults.moduleKey),
			label: KeyNormalizer.text(raw.label) || defaults.label || defaults.id,
			mode: KeyNormalizer.mode(raw.mode),
			required: KeyNormalizer.bool(raw.required),
			options,
			enabled: enabled && options.length > 0,
			titleVisible: raw.titleVisible === undefined ? defaults.titleVisible !== false : KeyNormalizer.bool(raw.titleVisible),
			searchVisible: raw.searchVisible === undefined ? defaults.searchVisible !== false : KeyNormalizer.bool(raw.searchVisible),
			filterable: raw.filterable === undefined ? defaults.filterable !== false : KeyNormalizer.bool(raw.filterable),
			builtIn: !!defaults.builtIn,
		};
	}

	static normalizeFieldRules(input) {
		const rawRules = input && typeof input === 'object' ? input : {};
		const normalized = {};
		Object.keys(rawRules).forEach((selectionKey) => {
			const key = KeyNormalizer.key(selectionKey);
			const raw = rawRules[selectionKey] && typeof rawRules[selectionKey] === 'object' ? rawRules[selectionKey] : {};
			if (key) {
				normalized[key] = SettingsNormalizer.normalizeFieldRule(raw);
			}
		});
		return normalized;
	}

	static normalizeFieldRule(input = {}) {
		return {
			enabled: input.enabled === undefined ? true : KeyNormalizer.bool(input.enabled),
			mode: KeyNormalizer.mode(input.mode),
			required: KeyNormalizer.bool(input.required),
			options: KeyNormalizer.list(input.options),
		};
	}

	static mergeLegacyFieldRule(fieldRules, selectionKey, mode, required, options) {
		const rule = SettingsNormalizer.normalizeFieldRule({ mode, required, options });
		if (
			mode ||
			required ||
			rule.options.length ||
			Object.prototype.hasOwnProperty.call(fieldRules, selectionKey)
		) {
			const existing = fieldRules[selectionKey] || {};
			fieldRules[selectionKey] = {
				...existing,
				...rule,
				enabled: existing.enabled === undefined ? rule.enabled : existing.enabled,
			};
		}
	}

	static inferScope(input = {}) {
		const requested = KeyNormalizer.text(input.scope || input.ruleScope || input.mode);
		if (requested === 'custom') {
			return 'override';
		}
		if (['inherit', 'extend', 'override', 'hidden'].includes(requested)) {
			return requested;
		}
		return SettingsNormalizer.hasRuleOverrides(input) ? 'override' : 'inherit';
	}

	static hasRuleOverrides(input = {}) {
		return [
			KeyNormalizer.text(input.rulesText),
			KeyNormalizer.text(input.titleTemplate),
			KeyNormalizer.list(input.supportedVersions).length,
			KeyNormalizer.list(input.supportedLoaders).length,
			KeyNormalizer.list(input.supportedThemes).length,
			SettingsNormalizer.normalizeLists(input, [], false).length,
			Object.keys(SettingsNormalizer.normalizeFieldRules(input.fieldRules)).length,
			KeyNormalizer.bool(input.requireVersions),
			KeyNormalizer.bool(input.requireLoaders),
			KeyNormalizer.bool(input.requireThemes),
		].some(Boolean);
	}

	static shouldPersistRule(rule) {
		return rule && rule.scope !== 'inherit';
	}

	static normalizeCategoryAliases(input) {
		const rawAliases = input && typeof input === 'object' ? input : {};
		const normalized = {};
		Object.keys(rawAliases).forEach((cid) => {
			const key = String(KeyNormalizer.cid(cid));
			const alias = KeyNormalizer.key(rawAliases[cid]);
			if (key !== '0' && alias) {
				normalized[key] = alias;
			}
		});
		return normalized;
	}

	static normalizeCategoryHierarchy(input) {
		const rawHierarchy = input && typeof input === 'object' ? input : {};
		const normalized = {};
		Object.keys(rawHierarchy).forEach((cid) => {
			const key = String(KeyNormalizer.cid(cid));
			if (key !== '0') {
				normalized[key] = KeyNormalizer.cid(rawHierarchy[cid]);
			}
		});
		return normalized;
	}

	static titleTemplate(value, fallback) {
		return KeyNormalizer.text(value) || KeyNormalizer.text(fallback) || defaultSettings.defaultTitleTemplate;
	}
}

module.exports = SettingsNormalizer;
