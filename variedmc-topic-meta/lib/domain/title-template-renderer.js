'use strict';

const KeyNormalizer = require('./key-normalizer');
const VersionFormatter = require('./version-formatter');

class TitleTemplateRenderer {
	static buildPrefix(metaState, context = {}) {
		return TitleTemplateRenderer.buildTokens('', metaState, context).blocks;
	}

	static renderTitle(baseTitle, metaState, titleTemplate, context = {}) {
		const tokens = TitleTemplateRenderer.buildTokens(baseTitle, metaState, context);
		const template = KeyNormalizer.text(titleTemplate) || '{blocks} {title}';
		const rendered = TitleTemplateRenderer.renderTemplate(template, tokens);
		return TitleTemplateRenderer.cleanTitle(rendered) || tokens.title || tokens.blocks;
	}

	static buildTokens(baseTitle, metaState, context = {}) {
		const normalizedMeta = metaState && typeof metaState === 'object' ? metaState : {};
		const metaFields = TitleTemplateRenderer.normalizeFields(context.metaFields || normalizedMeta.metaFields);
		const versions = KeyNormalizer.list(normalizedMeta.versions);
		const loaders = KeyNormalizer.list(normalizedMeta.loaders);
		const themes = KeyNormalizer.list(normalizedMeta.themes);
		const versionsText = VersionFormatter.format(versions, context.versionCatalog || normalizedMeta.versionCatalog);
		const loadersText = loaders.join(',');
		const themesText = themes.join(',');
		const legacyBlocks = [
			versionsText ? `[${versionsText}]` : '',
			loadersText ? `[${loadersText}]` : '',
			themesText ? `[${themesText}]` : '',
		].join('');
		const blocks = metaFields.length ?
			metaFields
				.filter(field => field.titleVisible !== false)
				.map(field => TitleTemplateRenderer.fieldBlock(normalizedMeta, field, context))
				.filter(Boolean)
				.join('') :
			legacyBlocks;

		return {
			title: KeyNormalizer.text(baseTitle),
			versions: versionsText,
			loaders: loadersText,
			themes: themesText,
			versionsBlock: versionsText ? `[${versionsText}]` : '',
			loadersBlock: loadersText ? `[${loadersText}]` : '',
			themesBlock: themesText ? `[${themesText}]` : '',
			blocks,
			meta: blocks,
			fieldTokens: TitleTemplateRenderer.fieldTokens(normalizedMeta, metaFields, context),
		};
	}

	static renderTemplate(template, tokens) {
		const fieldTokens = tokens.fieldTokens || {};
		return String(template || '')
			.replace(/\{(block|value|label):([a-z0-9_.-]+)\}/gi, (match, type, key) => {
				const token = fieldTokens[KeyNormalizer.key(key)];
				return token ? String(token[String(type).toLowerCase()] || '') : '';
			})
			.replace(/\{(title|versions|loaders|themes|versionsBlock|loadersBlock|themesBlock|blocks|meta)\}/g, (match, key) => (
				Object.prototype.hasOwnProperty.call(tokens, key) ? String(tokens[key] || '') : ''
			));
	}

	static fieldTokens(metaState, metaFields, context = {}) {
		const tokens = Object.create(null);
		const categoryAlias = KeyNormalizer.key(context.categoryAlias);

		TitleTemplateRenderer.normalizeFields(metaFields).forEach((field) => {
			const value = TitleTemplateRenderer.fieldValue(metaState, field, context);
			const token = {
				value,
				block: value ? `[${value}]` : '',
				label: KeyNormalizer.text(field.label),
			};
			TitleTemplateRenderer.placeholderKeys(field, context).forEach((key) => {
				TitleTemplateRenderer.addToken(tokens, key, token);
				if (categoryAlias) {
					TitleTemplateRenderer.addToken(tokens, `${categoryAlias}.${key}`, token);
				}
			});
		});

		return tokens;
	}

	static placeholderKeys(field, context = {}) {
		const keys = [
			field.id,
			field.selectionKey,
			field.fieldKey,
		];
		const moduleKey = KeyNormalizer.key(field.moduleKey);
		const shortModuleKey = TitleTemplateRenderer.shortModuleKey(moduleKey, context);

		[moduleKey, shortModuleKey].filter(Boolean).forEach((key) => {
			keys.push(field.fieldKey ? `${key}.${field.fieldKey}` : key);
			if (field.fieldKey === 'primary') {
				keys.push(key);
			}
		});

		return keys.filter(Boolean);
	}

	static fieldValue(metaState, field, context = {}) {
		const values = TitleTemplateRenderer.readValues(metaState, field);
		return field.selectionKey === 'versions' || field.id === 'versions' ?
			VersionFormatter.format(values, context.versionCatalog || metaState && metaState.versionCatalog) :
			KeyNormalizer.list(values).join(',');
	}

	static fieldBlock(metaState, field, context) {
		const value = TitleTemplateRenderer.fieldValue(metaState, field, context);
		return value ? `[${value}]` : '';
	}

	static readValues(metaState, field) {
		const source = metaState && typeof metaState === 'object' ? metaState : {};
		if (field.selectionKey === 'versions') {
			return source.versions || source.version || TitleTemplateRenderer.readFieldMap(source, field);
		}
		if (field.selectionKey === 'loaders') {
			return source.loaders || source.loader || TitleTemplateRenderer.readFieldMap(source, field);
		}
		if (field.selectionKey === 'themes') {
			return source.themes || TitleTemplateRenderer.readModule(source, 'topic', 'primary') ||
				TitleTemplateRenderer.readFieldMap(source, field);
		}
		return TitleTemplateRenderer.readFieldMap(source, field) ||
			TitleTemplateRenderer.readModule(source, field.moduleKey, field.fieldKey) ||
			source[field.selectionKey] ||
			source[field.id] ||
			[];
	}

	static readFieldMap(source, field) {
		return source.fields && (source.fields[field.selectionKey] || source.fields[field.id]);
	}

	static readModule(source, moduleKey, fieldKey) {
		const modules = source.modules && typeof source.modules === 'object' ? source.modules : {};
		const fields = modules[moduleKey] && typeof modules[moduleKey] === 'object' ? modules[moduleKey] : {};
		return fields[fieldKey];
	}

	static normalizeFields(fields) {
		const seen = new Set();
		return (Array.isArray(fields) ? fields : []).map((field) => {
			const raw = field && typeof field === 'object' ? field : {};
			const selectionKey = KeyNormalizer.key(raw.selectionKey || raw.id || raw.key);
			const id = KeyNormalizer.key(raw.id || (selectionKey === 'themes' ? 'topic' : selectionKey));
			if (!selectionKey || seen.has(selectionKey) || raw.enabled === false) {
				return null;
			}
			seen.add(selectionKey);
			return {
				id,
				selectionKey,
				fieldKey: KeyNormalizer.key(raw.fieldKey || raw.key || id),
				moduleKey: KeyNormalizer.key(raw.moduleKey),
				label: KeyNormalizer.text(raw.label) || id,
				options: KeyNormalizer.list(raw.options),
				titleVisible: raw.titleVisible !== false,
			};
		}).filter(Boolean);
	}

	static shortModuleKey(moduleKey, context = {}) {
		const cid = KeyNormalizer.cid(context.categoryCid);
		const alias = KeyNormalizer.key(context.categoryAlias);
		const cidPrefix = cid > 0 ? `category-${cid}-` : '';
		const aliasPrefix = alias ? `${alias}-` : '';
		if (cidPrefix && moduleKey.startsWith(cidPrefix)) {
			return moduleKey.slice(cidPrefix.length);
		}
		if (aliasPrefix && moduleKey.startsWith(aliasPrefix)) {
			return moduleKey.slice(aliasPrefix.length);
		}
		return moduleKey;
	}

	static addToken(tokens, key, token) {
		const normalized = KeyNormalizer.key(key);
		if (normalized && !tokens[normalized]) {
			tokens[normalized] = token;
		}
	}

	static cleanTitle(value) {
		return String(value || '').replace(/\s+/g, ' ').trim();
	}
}

module.exports = TitleTemplateRenderer;
