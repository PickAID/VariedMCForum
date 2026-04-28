'use strict';

const KeyNormalizer = require('./key-normalizer');
const TitleTemplateRenderer = require('./title-template-renderer');

class StoredMetaCodec {
	static parse(topicData) {
		const source = topicData && typeof topicData === 'object' ? topicData : {};
		let parsed = {};
		try {
			parsed = JSON.parse(String(source.variedmcMeta || '{}'));
		} catch (err) {
			parsed = {};
		}

		return {
			versions: KeyNormalizer.list(parsed.versions || source.variedmcMetaVersions),
			loaders: KeyNormalizer.list(parsed.loaders || source.variedmcMetaLoaders),
			themes: KeyNormalizer.list(parsed.themes || source.variedmcMetaThemes),
			modules: StoredMetaCodec.modules(parsed.modules),
			fields: StoredMetaCodec.fields(parsed.fields),
			baseTitle: KeyNormalizer.text(parsed.baseTitle || source.variedmcMetaBaseTitle),
			prefix: KeyNormalizer.text(parsed.prefix || source.variedmcMetaPrefix),
		};
	}

	static serialize(metaState) {
		const payload = {
			versions: KeyNormalizer.list(metaState && metaState.versions),
			loaders: KeyNormalizer.list(metaState && metaState.loaders),
			themes: KeyNormalizer.list(metaState && metaState.themes),
			modules: StoredMetaCodec.modules(metaState && metaState.modules),
			fields: StoredMetaCodec.fields(metaState && metaState.fields),
			baseTitle: KeyNormalizer.text(metaState && metaState.baseTitle),
		};
		payload.prefix = TitleTemplateRenderer.buildPrefix(payload, {
			versionCatalog: metaState && metaState.versionCatalog,
			metaFields: metaState && metaState.metaFields,
			categoryAlias: metaState && metaState.categoryAlias,
			categoryCid: metaState && metaState.categoryCid,
		});

		return {
			variedmcMeta: JSON.stringify(payload),
			variedmcMetaVersions: payload.versions.join(','),
			variedmcMetaLoaders: payload.loaders.join(','),
			variedmcMetaThemes: payload.themes.join(','),
			variedmcMetaBaseTitle: payload.baseTitle,
			variedmcMetaPrefix: payload.prefix,
		};
	}

	static modules(input) {
		const rawModules = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
		const normalized = {};
		Object.keys(rawModules).forEach((moduleKey) => {
			const key = KeyNormalizer.key(moduleKey);
			const rawFields = rawModules[moduleKey] && typeof rawModules[moduleKey] === 'object' ? rawModules[moduleKey] : {};
			const fields = {};
			Object.keys(rawFields).forEach((fieldKey) => {
				const normalizedFieldKey = KeyNormalizer.key(fieldKey);
				const values = KeyNormalizer.list(rawFields[fieldKey]);
				if (normalizedFieldKey && values.length) {
					fields[normalizedFieldKey] = values;
				}
			});
			if (key && Object.keys(fields).length) {
				normalized[key] = fields;
			}
		});
		return normalized;
	}

	static fields(input) {
		const rawFields = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
		const normalized = {};
		Object.keys(rawFields).forEach((fieldKey) => {
			const key = KeyNormalizer.key(fieldKey);
			const values = KeyNormalizer.list(rawFields[fieldKey]);
			if (key && values.length) {
				normalized[key] = values;
			}
		});
		return normalized;
	}
}

module.exports = StoredMetaCodec;
