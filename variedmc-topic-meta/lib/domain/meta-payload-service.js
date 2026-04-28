'use strict';

const CategoryRuleResolver = require('./category-rule-resolver');
const KeyNormalizer = require('./key-normalizer');
const SettingsNormalizer = require('./settings-normalizer');
const TitleTemplateRenderer = require('./title-template-renderer');

class MetaPayloadService {
	static prepare(settingsInput, cid, input, fallbackBaseTitle) {
		const settings = SettingsNormalizer.normalize(settingsInput || {});
		const rule = CategoryRuleResolver.resolve(settings, cid);
		const metaInput = input && typeof input === 'object' ? input : {};
		const baseTitle = KeyNormalizer.text(metaInput.baseTitle || fallbackBaseTitle);
		const selectedByKey = {};
		const modules = {};
		const fields = {};

		rule.metaFields.forEach((field) => {
			const selected = MetaPayloadService.selectValues(MetaPayloadService.readInput(metaInput, field), field);
			MetaPayloadService.validate(field, selected);
			selectedByKey[field.selectionKey] = selected.values;
			fields[field.selectionKey] = selected.values;
			if (field.id) {
				fields[field.id] = selected.values;
			}
			if (field.moduleKey && field.fieldKey) {
				modules[field.moduleKey] = modules[field.moduleKey] || {};
				modules[field.moduleKey][field.fieldKey] = selected.values;
			}
		});

		const meta = {
			versions: selectedByKey.versions || [],
			loaders: selectedByKey.loaders || [],
			themes: selectedByKey.themes || selectedByKey.topic || [],
			modules,
			fields,
			baseTitle,
			versionCatalog: rule.fields.versions.options.slice(),
			metaFields: rule.metaFields,
			categoryAlias: rule.categoryAlias,
			categoryCid: rule.cid,
		};
		meta.prefix = TitleTemplateRenderer.buildPrefix(meta, MetaPayloadService.context(rule));

		return {
			rule,
			meta,
			title: TitleTemplateRenderer.renderTitle(baseTitle, meta, rule.titleTemplate, MetaPayloadService.context(rule)),
		};
	}

	static context(rule) {
		return {
			versionCatalog: rule.fields.versions.options,
			metaFields: rule.metaFields,
			categoryAlias: rule.categoryAlias,
			categoryCid: rule.cid,
		};
	}

	static readInput(metaInput, field) {
		if (field.selectionKey === 'versions') {
			return metaInput.versions || metaInput.version || MetaPayloadService.readGeneric(metaInput, field);
		}
		if (field.selectionKey === 'loaders') {
			return metaInput.loaders || metaInput.loader || MetaPayloadService.readGeneric(metaInput, field);
		}
		if (field.selectionKey === 'themes') {
			return metaInput.themes ||
				MetaPayloadService.readModule(metaInput, 'topic', 'primary') ||
				MetaPayloadService.readGeneric(metaInput, field);
		}
		return MetaPayloadService.readGeneric(metaInput, field);
	}

	static readGeneric(metaInput, field) {
		return metaInput.fields && (metaInput.fields[field.selectionKey] || metaInput.fields[field.id]) ||
			MetaPayloadService.readModule(metaInput, field.moduleKey, field.fieldKey) ||
			metaInput[field.selectionKey] ||
			metaInput[field.id] ||
			[];
	}

	static readModule(metaInput, moduleKey, fieldKey) {
		return metaInput.modules &&
			metaInput.modules[moduleKey] &&
			metaInput.modules[moduleKey][fieldKey];
	}

	static selectValues(value, field) {
		const rawValues = KeyNormalizer.list(value);
		if (!field.enabled) {
			return {
				values: [],
				invalidValues: rawValues,
			};
		}
		const canonicalMap = new Map((field.options || []).map(option => [option.toLowerCase(), option]));
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

		return { values, invalidValues };
	}

	static validate(field, result) {
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
}

module.exports = MetaPayloadService;
