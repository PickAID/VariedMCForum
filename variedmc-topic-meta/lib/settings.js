'use strict';

const categories = require.main.require('./src/categories');
const meta = require.main.require('./src/meta');

const CategoryRuleResolver = require('./domain/category-rule-resolver');
const KeyNormalizer = require('./domain/key-normalizer');
const MetaPayloadService = require('./domain/meta-payload-service');
const SettingsNormalizer = require('./domain/settings-normalizer');
const StoredMetaCodec = require('./domain/stored-meta-codec');
const TitleTemplateRenderer = require('./domain/title-template-renderer');
const { EMPTY_META, SETTINGS_KEY, defaultSettings } = require('./domain/defaults');

class SettingsFacade {
	static EMPTY_META = EMPTY_META;

	static async getSettings() {
		await meta.settings.setOnEmpty(SETTINGS_KEY, defaultSettings);
		const stored = await meta.settings.get(SETTINGS_KEY);
		const categoryHierarchy = await SettingsFacade.buildCategoryHierarchy();
		return SettingsNormalizer.normalize({
			...stored,
			categoryHierarchy,
		});
	}

	static async getPublicConfig() {
		return await SettingsFacade.getSettings();
	}

	static async getAdminState() {
		const [settings, categoryOptions] = await Promise.all([
			SettingsFacade.getSettings(),
			categories.buildForSelectAll(['depth', 'parentCid']),
		]);

		return {
			settings,
			categories: (categoryOptions || []).map(category => ({
				cid: KeyNormalizer.cid(category && category.cid),
				name: KeyNormalizer.text(category && category.name),
				depth: Number.isFinite(Number(category && category.depth)) ? Number(category.depth) : 0,
				parentCid: KeyNormalizer.cid(category && category.parentCid),
			})).filter(category => category.cid > 0),
		};
	}

	static async save(input) {
		const settings = SettingsNormalizer.normalize(input || {});
		await meta.settings.set(SETTINGS_KEY, settings, true);
		return settings;
	}

	static resolveCategoryRule(settings, cid) {
		return CategoryRuleResolver.resolve(settings, cid);
	}

	static prepareMetaPayload(settings, cid, input, fallbackBaseTitle) {
		return MetaPayloadService.prepare(settings, cid, input, fallbackBaseTitle);
	}

	static buildTitleTokens(baseTitle, metaState, context = {}) {
		return TitleTemplateRenderer.buildTokens(baseTitle, metaState, context);
	}

	static buildTitlePrefix(metaState, context = {}) {
		return TitleTemplateRenderer.buildPrefix(metaState, context);
	}

	static buildGeneratedTitle(baseTitle, metaState, titleTemplate, context = {}) {
		return TitleTemplateRenderer.renderTitle(baseTitle, metaState, titleTemplate, context);
	}

	static parseStoredMeta(topicData) {
		return StoredMetaCodec.parse(topicData);
	}

	static serializeTopicMetaFields(metaState) {
		return StoredMetaCodec.serialize(metaState);
	}

	static stripGeneratedPrefix(title, prefix) {
		const normalizedTitle = KeyNormalizer.text(title);
		const normalizedPrefix = KeyNormalizer.text(prefix);
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

	static async buildCategoryHierarchy() {
		const categoryOptions = await categories.buildForSelectAll(['parentCid']);
		const hierarchy = {};
		(categoryOptions || []).forEach((category) => {
			const cid = KeyNormalizer.cid(category && category.cid);
			if (cid > 0) {
				hierarchy[String(cid)] = KeyNormalizer.cid(category && category.parentCid);
			}
		});
		return hierarchy;
	}
}

module.exports = SettingsFacade;
