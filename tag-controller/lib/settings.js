'use strict';

const meta = require.main.require('./src/meta');
const topics = require.main.require('./src/topics');
const utils = require.main.require('./src/utils');
const winston = require.main.require('winston');

const defaultDefinitions = require('./defaults');

const SETTINGS_KEY = 'tag-controller';
const DEFAULT_BG_COLOR = '#4B5563';
const DEFAULT_TEXT_COLOR = '#FFFFFF';
const DARK_SKIN_SELECTORS = [
	'html[data-bs-theme="dark"]',
	'body[data-bs-theme="dark"]',
	'body.theme-dark',
	'body.skin-cyborg',
	'body.skin-darkly',
	'body.skin-quartz',
	'body.skin-slate',
	'body.skin-solar',
	'body.skin-superhero',
];

const Settings = module.exports;

Settings.getAdminState = async function () {
	const { definitions, availableTags } = await getSynchronizedState(true);
	return buildAdminState(definitions, availableTags);
};

Settings.getPublicConfig = async function () {
	const { definitions } = await getSynchronizedState(true);
	return buildState(definitions);
};

Settings.getSettings = async function () {
	await meta.settings.setOnEmpty(SETTINGS_KEY, {
		definitions: defaultDefinitions,
	});

	const stored = await meta.settings.get(SETTINGS_KEY);
	return {
		definitions: normalizeDefinitions(stored.definitions || defaultDefinitions),
	};
};

Settings.saveDefinitions = async function (inputDefinitions) {
	const { definitions: currentDefinitions, availableTags } = await getSynchronizedState();
	const definitions = mergeDefinitions({
		currentDefinitions,
		inputDefinitions,
		availableTags,
	});

	validateDefinitions(definitions);
	await ensureTagsExist(definitions, false);
	await persistDefinitions(definitions);

	return buildState(definitions);
};

Settings.createTag = async function (inputTag) {
	const tag = normalizeTag(inputTag);
	if (!tag) {
		throw new Error('[[error:invalid-tag]]');
	}

	await topics.createEmptyTag(tag);
	await ensureDefinitionExists(tag);
	return tag;
};

Settings.ensureSynchronized = async function () {
	const { definitions } = await getSynchronizedState(true);
	await ensureTagsExist(definitions, true);
};

function buildState(definitions) {
	return {
		definitions,
		cssText: buildCss(definitions),
	};
}

function buildAdminState(definitions, availableTags) {
	return {
		definitions: mergeAdminDefinitions(definitions, availableTags),
		availableTagCount: Array.isArray(availableTags) ? availableTags.length : 0,
		savedDefinitionCount: definitions.length,
	};
}

function mergeAdminDefinitions(definitions, availableTags) {
	const definitionMap = new Map(definitions.map(definition => [definition.tag, definition]));
	const merged = [];
	const seen = new Set();

	(availableTags || []).forEach((tagData) => {
		const tag = normalizeTag(tagData && tagData.value);
		if (!tag || seen.has(tag)) {
			return;
		}

		seen.add(tag);
		const definition = definitionMap.get(tag) || { tag };
		merged.push({
			...normalizeDefinition(definition),
			topicCount: parseTopicCount(tagData && tagData.score),
			inCatalog: true,
		});
	});

	definitions.forEach((definition) => {
		if (seen.has(definition.tag)) {
			return;
		}

		seen.add(definition.tag);
		merged.push({
			...normalizeDefinition(definition),
			topicCount: 0,
			inCatalog: false,
		});
	});

	return merged.sort((left, right) => left.tag.localeCompare(right.tag));
}

function normalizeDefinitions(input) {
	if (!Array.isArray(input)) {
		return [];
	}

	const unique = new Map();

	input.forEach((definition) => {
		const normalized = normalizeDefinition(definition);
		if (normalized) {
			unique.set(normalized.tag, normalized);
		}
	});

	return Array.from(unique.values()).sort((left, right) => left.tag.localeCompare(right.tag));
}

function normalizeDefinition(input) {
	const tag = normalizeTag(input && input.tag);
	if (!tag) {
		return null;
	}

	return {
		tag,
		lightBgColor: normalizeColor(input && (input.lightBgColor || input.bgColor), DEFAULT_BG_COLOR),
		lightTextColor: normalizeColor(input && (input.lightTextColor || input.textColor), DEFAULT_TEXT_COLOR),
		darkBgColor: normalizeColor(
			input && (input.darkBgColor || input.lightBgColor || input.bgColor),
			normalizeColor(input && (input.lightBgColor || input.bgColor), DEFAULT_BG_COLOR)
		),
		darkTextColor: normalizeColor(
			input && (input.darkTextColor || input.lightTextColor || input.textColor),
			normalizeColor(input && (input.lightTextColor || input.textColor), DEFAULT_TEXT_COLOR)
		),
	};
}

function normalizeTag(value) {
	return utils.cleanUpTag(String(value || ''), meta.config.maximumTagLength);
}

function normalizeColor(value, fallback) {
	const color = String(value || '').trim();
	return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toUpperCase() : fallback;
}

function parseTopicCount(value) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function validateDefinitions(definitions) {
	const minimumTagLength = meta.config.minimumTagLength || 3;
	const tooShort = definitions.find(definition => definition.tag.length < minimumTagLength);

	if (tooShort) {
		throw new Error(`Managed tag "${tooShort.tag}" is shorter than minimumTagLength (${minimumTagLength})`);
	}
}

async function ensureTagsExist(definitions, quiet) {
	const minimumTagLength = meta.config.minimumTagLength || 3;

	await Promise.all(definitions.map(async (definition) => {
		if (definition.tag.length < minimumTagLength) {
			if (quiet) {
				winston.warn(`[plugin/tag-controller] Skipping managed tag "${definition.tag}" because it is shorter than minimumTagLength (${minimumTagLength})`);
				return;
			}

			throw new Error(`Managed tag "${definition.tag}" is shorter than minimumTagLength (${minimumTagLength})`);
		}

		await topics.createEmptyTag(definition.tag);
	}));
}

async function getAvailableTags() {
	const tags = await topics.getTags(0, -1);
	return Array.isArray(tags) ? tags : [];
}

async function getSynchronizedState(persistChanges) {
	const { definitions } = await Settings.getSettings();
	const availableTags = await getAvailableTags();
	const mergedDefinitions = mergeDefinitions({
		currentDefinitions: definitions,
		availableTags,
	});

	if (persistChanges && !areDefinitionsEqual(definitions, mergedDefinitions)) {
		await persistDefinitions(mergedDefinitions);
	}

	return {
		definitions: mergedDefinitions,
		availableTags,
	};
}

function mergeDefinitions({
	currentDefinitions,
	inputDefinitions,
	availableTags,
}) {
	const merged = new Map();

	normalizeDefinitions(currentDefinitions).forEach((definition) => {
		merged.set(definition.tag, definition);
	});

	(availableTags || []).forEach((tagData) => {
		const tag = normalizeTag(tagData && tagData.value);
		if (!tag || merged.has(tag)) {
			return;
		}

		merged.set(tag, normalizeDefinition({ tag }));
	});

	if (Array.isArray(inputDefinitions)) {
		normalizeDefinitions(inputDefinitions).forEach((definition) => {
			merged.set(definition.tag, definition);
		});
	}

	return Array.from(merged.values()).sort((left, right) => left.tag.localeCompare(right.tag));
}

async function ensureDefinitionExists(tag) {
	const { definitions } = await Settings.getSettings();
	if (definitions.some(definition => definition.tag === tag)) {
		return;
	}

	await persistDefinitions(mergeDefinitions({
		currentDefinitions: definitions,
		inputDefinitions: [{ tag }],
	}));
}

async function persistDefinitions(definitions) {
	await meta.settings.set(SETTINGS_KEY, {
		definitions,
	}, true);
}

function areDefinitionsEqual(left, right) {
	return JSON.stringify(normalizeDefinitions(left)) === JSON.stringify(normalizeDefinitions(right));
}

function buildCss(definitions) {
	return definitions.map(buildDefinitionCss).join('\n\n');
}

function buildDefinitionCss(definition) {
	const tag = escapeAttributeSelector(definition.tag);
	const badgeTargets = [
		`[data-tag="${tag}"].tag`,
		`[data-tag="${tag}"].tag-item`,
		`.bootstrap-tagsinput .tag[data-tag-controller-tag="${tag}"]`,
	];
	const hotTagButtonTargets = [
		`a.btn[data-tag="${tag}"]`,
		`a.btn[data-tag="${tag}"]:hover`,
		`a.btn[data-tag="${tag}"]:focus`,
		`a.btn[data-tag="${tag}"]:active`,
	];
	const hotTagWrapperTargets = [
		`[data-tag-controller-rendered-wrapper="${tag}"]`,
	];
	const hotTagBarMainTargets = [
		`[data-tag-controller-bar-main="${tag}"]`,
	];
	const hotTagBarCountTargets = [
		`[data-tag-controller-bar-count="${tag}"]`,
	];
	const hotTagBarOverlayTargets = [
		`[data-tag-controller-bar-main="${tag}"] > .position-absolute`,
		`[data-tag-controller-bar-main="${tag}"] > .popular-tags-bar`,
	];
	const textTargets = [
		`a.btn[data-tag="${tag}"] .tag-item`,
		`a.btn[data-tag="${tag}"] .tag-topic-count`,
		`a.btn[data-tag="${tag}"] span`,
		`a[data-tag-controller-rendered="${tag}"] .tag-topic-count`,
		`a[data-tag-controller-rendered="${tag}"] span`,
		`[data-tag-controller-bar-count="${tag}"]`,
		`.bootstrap-tagsinput .tag[data-tag-controller-tag="${tag}"] [data-role="remove"]`,
	];
	const darkBadgeTargets = prefixSelectors(badgeTargets);
	const darkHotTagButtonTargets = prefixSelectors(hotTagButtonTargets);
	const darkHotTagWrapperTargets = prefixSelectors(hotTagWrapperTargets);
	const darkHotTagBarMainTargets = prefixSelectors(hotTagBarMainTargets);
	const darkHotTagBarCountTargets = prefixSelectors(hotTagBarCountTargets);
	const darkHotTagBarOverlayTargets = prefixSelectors(hotTagBarOverlayTargets);
	const darkTextTargets = prefixSelectors(textTargets);

	return [
		`${badgeTargets.join(',\n')} {`,
		`\tbackground-color: ${definition.lightBgColor} !important;`,
		`\tborder-color: ${definition.lightBgColor} !important;`,
		`\tcolor: ${definition.lightTextColor} !important;`,
		`\tbox-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);`,
		'}',
		`${hotTagButtonTargets.join(',\n')} {`,
		`\t--bs-btn-bg: ${definition.lightBgColor};`,
		`\t--bs-btn-border-color: ${definition.lightBgColor};`,
		`\t--bs-btn-color: ${definition.lightTextColor};`,
		`\t--bs-btn-hover-bg: ${definition.lightBgColor};`,
		`\t--bs-btn-hover-border-color: ${definition.lightBgColor};`,
		`\t--bs-btn-hover-color: ${definition.lightTextColor};`,
		`\t--bs-btn-active-bg: ${definition.lightBgColor};`,
		`\t--bs-btn-active-border-color: ${definition.lightBgColor};`,
		`\t--bs-btn-active-color: ${definition.lightTextColor};`,
		`\tdisplay: inline-flex !important;`,
		`\tflex: 0 0 auto;`,
		`\tflex-direction: column;`,
		`\talign-items: flex-start;`,
		`\tjustify-content: flex-start;`,
		`\tgap: 0.12rem;`,
		`\twidth: auto;`,
		`\theight: auto;`,
		`\tmax-width: 100%;`,
		`\tpadding: 0.44rem 0.56rem !important;`,
		`\tbox-sizing: border-box;`,
		`\tborder-radius: 0.48rem;`,
		`\tborder: 0 !important;`,
		`\tbackground-color: ${definition.lightBgColor} !important;`,
		`\tcolor: ${definition.lightTextColor} !important;`,
		`\ttext-decoration: none !important;`,
		`\toverflow: hidden;`,
		`\tbox-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);`,
		'}',
		`${hotTagWrapperTargets.join(',\n')} {`,
		`\tmin-width: 0;`,
		'}',
		`${hotTagBarMainTargets.join(',\n')} {`,
		`\tbackground-color: ${definition.lightBgColor} !important;`,
		`\tborder-color: ${definition.lightBgColor} !important;`,
		`\tborder-radius: 0.85rem;`,
		`\toverflow: hidden;`,
		`\tbox-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);`,
		'}',
		`${hotTagBarCountTargets.join(',\n')} {`,
		`\tbackground-color: ${definition.lightBgColor} !important;`,
		`\tborder-color: ${definition.lightBgColor} !important;`,
		`\tcolor: ${definition.lightTextColor} !important;`,
		`\tbox-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);`,
		'}',
		`${hotTagBarOverlayTargets.join(',\n')} {`,
		`\topacity: 0 !important;`,
		'}',
		`${textTargets.join(',\n')} {`,
		`\tcolor: ${definition.lightTextColor} !important;`,
		'}',
		`${darkBadgeTargets.join(',\n')} {`,
		`\tbackground-color: ${definition.darkBgColor} !important;`,
		`\tborder-color: ${definition.darkBgColor} !important;`,
		`\tcolor: ${definition.darkTextColor} !important;`,
		`\tbox-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);`,
		'}',
		`${darkHotTagButtonTargets.join(',\n')} {`,
		`\t--bs-btn-bg: ${definition.darkBgColor};`,
		`\t--bs-btn-border-color: ${definition.darkBgColor};`,
		`\t--bs-btn-color: ${definition.darkTextColor};`,
		`\t--bs-btn-hover-bg: ${definition.darkBgColor};`,
		`\t--bs-btn-hover-border-color: ${definition.darkBgColor};`,
		`\t--bs-btn-hover-color: ${definition.darkTextColor};`,
		`\t--bs-btn-active-bg: ${definition.darkBgColor};`,
		`\t--bs-btn-active-border-color: ${definition.darkBgColor};`,
		`\t--bs-btn-active-color: ${definition.darkTextColor};`,
		`\tdisplay: inline-flex !important;`,
		`\tflex: 0 0 auto;`,
		`\tflex-direction: column;`,
		`\talign-items: flex-start;`,
		`\tjustify-content: flex-start;`,
		`\tgap: 0.12rem;`,
		`\twidth: auto;`,
		`\theight: auto;`,
		`\tmax-width: 100%;`,
		`\tpadding: 0.44rem 0.56rem !important;`,
		`\tbox-sizing: border-box;`,
		`\tborder-radius: 0.48rem;`,
		`\tborder: 0 !important;`,
		`\tbackground-color: ${definition.darkBgColor} !important;`,
		`\tcolor: ${definition.darkTextColor} !important;`,
		`\ttext-decoration: none !important;`,
		`\toverflow: hidden;`,
		`\tbox-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);`,
		'}',
		`${darkHotTagWrapperTargets.join(',\n')} {`,
		`\tmin-width: 0;`,
		'}',
		`${darkHotTagBarMainTargets.join(',\n')} {`,
		`\tbackground-color: ${definition.darkBgColor} !important;`,
		`\tborder-color: ${definition.darkBgColor} !important;`,
		`\tborder-radius: 0.85rem;`,
		`\toverflow: hidden;`,
		`\tbox-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);`,
		'}',
		`${darkHotTagBarCountTargets.join(',\n')} {`,
		`\tbackground-color: ${definition.darkBgColor} !important;`,
		`\tborder-color: ${definition.darkBgColor} !important;`,
		`\tcolor: ${definition.darkTextColor} !important;`,
		`\tbox-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);`,
		'}',
		`${darkHotTagBarOverlayTargets.join(',\n')} {`,
		`\topacity: 0 !important;`,
		'}',
		`${darkTextTargets.join(',\n')} {`,
		`\tcolor: ${definition.darkTextColor} !important;`,
		'}',
	].join('\n');
}

function prefixSelectors(selectors) {
	return DARK_SKIN_SELECTORS.flatMap(
		darkSelector => selectors.map(selector => `${darkSelector} ${selector}`)
	);
}

function escapeAttributeSelector(value) {
	return String(value)
		.replace(/\\/g, '\\\\')
		.replace(/"/g, '\\"');
}
