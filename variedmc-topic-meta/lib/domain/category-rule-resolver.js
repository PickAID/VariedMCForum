'use strict';

const { defaultSettings } = require('./defaults');
const KeyNormalizer = require('./key-normalizer');
const SettingsNormalizer = require('./settings-normalizer');

class CategoryRuleResolver {
	static resolve(settingsInput, cid) {
		const settings = SettingsNormalizer.normalize(settingsInput || {});
		const chain = CategoryRuleResolver.categoryChain(KeyNormalizer.cid(cid), settings.categoryHierarchy);
		let resolved = CategoryRuleResolver.globalRule(settings);

		chain.forEach((currentCid) => {
			const rule = settings.categoryRules[String(currentCid)] || {};
			resolved = CategoryRuleResolver.applyRule(settings, resolved, rule, currentCid);
		});

		return {
			...resolved,
			cid: KeyNormalizer.cid(cid),
			categoryAlias: CategoryRuleResolver.categoryAlias(settings, cid),
			titleTemplate: SettingsNormalizer.titleTemplate(resolved.titleTemplate, settings.defaultTitleTemplate),
			metaFields: CategoryRuleResolver.normalizeMetaFields(resolved.metaFields),
			fields: CategoryRuleResolver.legacyFields(resolved.metaFields),
		};
	}

	static globalRule(settings) {
		const versions = CategoryRuleResolver.builtInField(settings.builtInFields.version, 'versions', '版本', settings.versionsCatalog);
		const loaders = CategoryRuleResolver.builtInField(settings.builtInFields.loader, 'loaders', '运行环境', settings.loadersCatalog);
		const customFields = CategoryRuleResolver.fieldsFromLists(settings.lists);
		const metaFields = CategoryRuleResolver.normalizeMetaFields([versions, loaders].concat(customFields));

		return {
			scope: 'global',
			enabled: true,
			rulesText: '',
			titleTemplate: SettingsNormalizer.titleTemplate(settings.defaultTitleTemplate, defaultSettings.defaultTitleTemplate),
			metaFields,
			fields: CategoryRuleResolver.legacyFields(metaFields),
		};
	}

	static builtInOnlyRule(settings) {
		const versions = CategoryRuleResolver.builtInField(settings.builtInFields.version, 'versions', '版本', settings.versionsCatalog);
		const loaders = CategoryRuleResolver.builtInField(settings.builtInFields.loader, 'loaders', '运行环境', settings.loadersCatalog);
		const metaFields = CategoryRuleResolver.normalizeMetaFields([versions, loaders]);
		return {
			scope: 'built-in',
			enabled: true,
			rulesText: '',
			titleTemplate: SettingsNormalizer.titleTemplate(settings.defaultTitleTemplate, defaultSettings.defaultTitleTemplate),
			metaFields,
			fields: CategoryRuleResolver.legacyFields(metaFields),
		};
	}

	static applyRule(settings, baseRule, categoryRule, cid) {
		const scope = CategoryRuleResolver.scope(categoryRule && categoryRule.scope);
		if (scope === 'inherit') {
			return { ...baseRule, scope, cid };
		}
		if (scope === 'hidden') {
			return CategoryRuleResolver.hiddenRule(settings, baseRule, cid);
		}

		const base = scope === 'extend' ? baseRule : CategoryRuleResolver.builtInOnlyRule(settings);
		const fields = CategoryRuleResolver.mergeFields(
			base.metaFields,
			CategoryRuleResolver.fieldsFromLists(categoryRule.lists),
			scope
		);
		const metaFields = CategoryRuleResolver.applyFieldRules(fields, categoryRule, scope);
		return {
			scope,
			cid,
			enabled: true,
			rulesText: scope === 'extend' ?
				CategoryRuleResolver.joinRuleText(baseRule.rulesText, categoryRule.rulesText) :
				KeyNormalizer.text(categoryRule.rulesText),
			titleTemplate: SettingsNormalizer.titleTemplate(categoryRule.titleTemplate, baseRule.titleTemplate),
			metaFields,
			fields: CategoryRuleResolver.legacyFields(metaFields),
		};
	}

	static hiddenRule(settings, baseRule, cid) {
		return {
			scope: 'hidden',
			cid,
			enabled: false,
			rulesText: KeyNormalizer.text(baseRule && baseRule.rulesText),
			titleTemplate: SettingsNormalizer.titleTemplate(baseRule && baseRule.titleTemplate, settings.defaultTitleTemplate),
			metaFields: [],
			fields: CategoryRuleResolver.legacyFields([]),
		};
	}

	static fieldsFromLists(lists) {
		return (Array.isArray(lists) ? lists : []).map(list => CategoryRuleResolver.fieldFromList(list));
	}

	static fieldFromList(list) {
		const raw = list && typeof list === 'object' ? list : {};
		return CategoryRuleResolver.field({
			id: raw.id,
			key: raw.selectionKey || raw.id,
			selectionKey: raw.selectionKey || raw.id,
			fieldKey: raw.fieldKey || 'primary',
			moduleKey: raw.moduleKey || raw.id,
			label: raw.label || raw.id,
			mode: raw.mode,
			required: raw.required,
			options: raw.options,
			enabled: raw.enabled !== false,
			titleVisible: raw.titleVisible,
			searchVisible: raw.searchVisible,
			filterable: raw.filterable,
		});
	}

	static builtInField(source, selectionKey, label, options) {
		return CategoryRuleResolver.field({
			...(source || {}),
			id: selectionKey,
			key: selectionKey,
			selectionKey,
			fieldKey: source && source.fieldKey || selectionKey,
			label: source && source.label || label,
			options: source && source.options && source.options.length ? source.options : options,
			enabled: source && source.enabled !== false,
			builtIn: true,
		});
	}

	static field(input = {}) {
		const options = KeyNormalizer.list(input.options);
		const id = KeyNormalizer.key(input.id || input.selectionKey || input.key);
		const selectionKey = KeyNormalizer.key(input.selectionKey || id);
		return {
			id,
			key: selectionKey,
			selectionKey,
			fieldKey: KeyNormalizer.key(input.fieldKey || input.key || id),
			moduleKey: KeyNormalizer.key(input.moduleKey),
			label: KeyNormalizer.text(input.label) || selectionKey,
			mode: KeyNormalizer.mode(input.mode),
			required: KeyNormalizer.bool(input.required),
			options,
			enabled: input.enabled !== false && (options.length > 0 || !input.builtIn),
			titleVisible: input.titleVisible === undefined ? true : KeyNormalizer.bool(input.titleVisible),
			searchVisible: input.searchVisible === undefined ? true : KeyNormalizer.bool(input.searchVisible),
			filterable: input.filterable === undefined ? true : KeyNormalizer.bool(input.filterable),
			builtIn: !!input.builtIn,
		};
	}

	static normalizeMetaFields(fields) {
		const seen = new Set();
		return (Array.isArray(fields) ? fields : []).map(field => CategoryRuleResolver.field(field))
			.filter((field) => {
				if (!field.enabled || !field.selectionKey || seen.has(field.selectionKey)) {
					return false;
				}
				seen.add(field.selectionKey);
				return true;
			});
	}

	static mergeFields(baseFields, additions, scope) {
		const merged = CategoryRuleResolver.normalizeMetaFields(baseFields);
		CategoryRuleResolver.normalizeMetaFields(additions).forEach((field) => {
			const index = merged.findIndex(entry => entry.selectionKey === field.selectionKey);
			if (index === -1) {
				merged.push(field);
				return;
			}
			merged[index] = scope === 'extend' ?
				CategoryRuleResolver.mergeField(merged[index], field) :
				field;
		});
		return merged;
	}

	static mergeField(baseField, nextField) {
		return CategoryRuleResolver.field({
			...baseField,
			...nextField,
			required: baseField.required || nextField.required,
			options: CategoryRuleResolver.mergeOptions(baseField.options, nextField.options),
		});
	}

	static applyFieldRules(fields, categoryRule, scope) {
		const rules = categoryRule && categoryRule.fieldRules && typeof categoryRule.fieldRules === 'object' ?
			categoryRule.fieldRules :
			{};
		return CategoryRuleResolver.normalizeMetaFields(fields).map((field) => {
			const rule = rules[field.selectionKey] || rules[field.id];
			return CategoryRuleResolver.applyFieldRule(field, rule, scope);
		}).filter(Boolean);
	}

	static applyFieldRule(field, rule, scope) {
		if (!rule) {
			return field;
		}
		if (rule.enabled === false) {
			return null;
		}
		const options = KeyNormalizer.list(rule.options);
		return CategoryRuleResolver.field({
			...field,
			mode: rule.mode || field.mode,
			required: rule.required,
			options: scope === 'extend' ?
				CategoryRuleResolver.mergeOptions(field.options, options) :
				(options.length ? options : field.options),
			enabled: true,
		});
	}

	static legacyFields(metaFields) {
		const map = {};
		CategoryRuleResolver.normalizeMetaFields(metaFields).forEach((field) => {
			map[field.selectionKey] = field;
			if (field.selectionKey === 'versions' || field.selectionKey === 'loaders' || field.selectionKey === 'themes') {
				return;
			}
			if (field.id && !map[field.id]) {
				map[field.id] = field;
			}
		});
		return {
			versions: map.versions || CategoryRuleResolver.disabledField('versions', '版本'),
			loaders: map.loaders || CategoryRuleResolver.disabledField('loaders', '运行环境'),
			themes: map.themes || map.topic || CategoryRuleResolver.disabledField('themes', '主题'),
			...map,
		};
	}

	static disabledField(selectionKey, label) {
		return CategoryRuleResolver.field({ id: selectionKey, selectionKey, label, options: [], enabled: false });
	}

	static categoryChain(cid, hierarchy) {
		const normalized = SettingsNormalizer.normalizeCategoryHierarchy(hierarchy);
		const chain = [];
		const seen = new Set();
		let currentCid = KeyNormalizer.cid(cid);
		while (currentCid > 0 && !seen.has(currentCid)) {
			seen.add(currentCid);
			chain.unshift(currentCid);
			currentCid = KeyNormalizer.cid(normalized[String(currentCid)]);
		}
		return chain;
	}

	static categoryAlias(settings, cid) {
		const normalizedCid = String(KeyNormalizer.cid(cid));
		return KeyNormalizer.key(settings && settings.categoryAliases && settings.categoryAliases[normalizedCid]) ||
			(normalizedCid === '0' ? '' : `cid-${normalizedCid}`);
	}

	static scope(value) {
		const scope = KeyNormalizer.text(value);
		return ['inherit', 'extend', 'override', 'hidden'].includes(scope) ? scope : 'inherit';
	}

	static mergeOptions(left, right) {
		return KeyNormalizer.list([].concat(KeyNormalizer.list(left), KeyNormalizer.list(right)));
	}

	static joinRuleText(left, right) {
		return [KeyNormalizer.text(left), KeyNormalizer.text(right)].filter(Boolean).join('\n');
	}
}

module.exports = CategoryRuleResolver;
