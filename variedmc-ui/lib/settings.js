'use strict';

const db = require.main.require('./src/database');
const meta = require.main.require('./src/meta');

const SETTINGS_KEY = 'variedmc-ui';
const SETTINGS_OBJECT_KEY = `settings:${SETTINGS_KEY}`;
const LEGACY_SORTED_LISTS_KEY = `${SETTINGS_OBJECT_KEY}:sorted-lists`;
const LEGACY_SLIDES_KEY = `${SETTINGS_OBJECT_KEY}:sorted-list:slides`;
const LEGACY_SINGLE_SLIDE_FIELDS = [
	'linkUrl',
	'topicUrl',
	'imageUrl',
	'title',
	'description',
	'carouselTitle',
	'carouselDescription',
];
const defaultSlides = Object.freeze([
	Object.freeze({
		linkUrl: '/topic/11',
		imageUrl: '/assets/uploads/system/carousel.webp',
		title: '',
		description: '',
	}),
]);
const defaultSettings = Object.freeze({
	slides: defaultSlides,
	autoRotate: true,
	autoRotateInterval: 6,
	recentTitle: '最新动态',
	recentLinkUrl: '/recent',
	recentLinkLabel: '更多',
	tagsTitle: '热门标签',
	categoriesTitle: '所有板块',
});

const Settings = module.exports;

Settings.get = async function () {
	const { stored, migratedFromLegacy, hasLegacyFields } = await readStoredSettings();
	const normalized = normalizeSettings(stored);

	if (migratedFromLegacy || hasLegacyFields || shouldPersistNormalized(stored, normalized)) {
		await persistSettings(normalized);
	}

	return normalized;
};

Settings.save = async function (input) {
	const settings = normalizeSettings(input);
	await persistSettings(settings);
	return settings;
};

Settings.getDefaults = function () {
	return normalizeSettings(defaultSettings);
};

function normalizeSettings(input = {}) {
	return {
		slides: normalizeSlides(input),
		autoRotate: normalizeBoolean(input.autoRotate, defaultSettings.autoRotate),
		autoRotateInterval: normalizeInterval(input.autoRotateInterval, defaultSettings.autoRotateInterval),
		recentTitle: normalizeString(input.recentTitle, defaultSettings.recentTitle),
		recentLinkUrl: normalizeString(input.recentLinkUrl, defaultSettings.recentLinkUrl),
		recentLinkLabel: normalizeString(input.recentLinkLabel, defaultSettings.recentLinkLabel),
		tagsTitle: normalizeString(input.tagsTitle, defaultSettings.tagsTitle),
		categoriesTitle: normalizeString(input.categoriesTitle, defaultSettings.categoriesTitle),
	};
}

function normalizeSlides(input) {
	let slides = Array.isArray(input && input.slides) ?
		input.slides.map(normalizeSlide).filter(Boolean) :
		[];

	if (!slides.length) {
		const legacySlide = normalizeSlide({
			linkUrl: input && (input.linkUrl || input.topicUrl),
			imageUrl: input && input.imageUrl,
			title: input && (input.title || input.carouselTitle),
			description: input && (input.description || input.carouselDescription),
		});
		if (legacySlide) {
			slides = [legacySlide];
		}
	}

	if (!slides.length) {
		slides = defaultSlides.map(slide => ({ ...slide }));
	}

	return slides;
}

function normalizeSlide(input = {}) {
	const imageUrl = normalizeOptionalString(input.imageUrl || input.src || input.image);
	if (!imageUrl) {
		return null;
	}

	return {
		linkUrl: normalizeOptionalString(input.linkUrl || input.topicUrl || input.url || input.href),
		imageUrl,
		title: normalizeOptionalString(input.title || input.label || input.alt),
		description: normalizeOptionalString(input.description || input.caption || input.subtitle),
	};
}

function normalizeString(value, fallback) {
	const trimmed = normalizeOptionalString(value);
	return trimmed || fallback;
}

function normalizeBoolean(value, fallback) {
	if (typeof value === 'boolean') {
		return value;
	}

	if (typeof value === 'number') {
		return value !== 0;
	}

	if (typeof value === 'string') {
		const normalized = value.trim().toLowerCase();
		if (['1', 'true', 'on', 'yes'].includes(normalized)) {
			return true;
		}
		if (['0', 'false', 'off', 'no'].includes(normalized)) {
			return false;
		}
	}

	return fallback;
}

function normalizeInterval(value, fallback) {
	const parsed = parseInt(value, 10);
	if (!Number.isFinite(parsed)) {
		return fallback;
	}

	return Math.min(60, Math.max(2, parsed));
}

function normalizeOptionalString(value) {
	return String(value || '').trim();
}

function shouldPersistNormalized(stored, normalized) {
	if (!stored || typeof stored !== 'object') {
		return true;
	}

	const missingKeys = Object.keys(normalized).some(key => !Object.prototype.hasOwnProperty.call(stored, key));
	if (missingKeys) {
		return true;
	}

	return JSON.stringify(normalizeSettings(stored)) !== JSON.stringify(normalized);
}

function cloneSettings(settings) {
	return {
		...settings,
		slides: (settings.slides || []).map(slide => ({
			linkUrl: slide.linkUrl,
			imageUrl: slide.imageUrl,
			title: slide.title,
			description: slide.description,
		})),
	};
}

async function readStoredSettings() {
	const [rawStored, legacyStored, legacyLists] = await Promise.all([
		db.getObject(SETTINGS_OBJECT_KEY),
		meta.settings.get(SETTINGS_KEY),
		db.getSetMembers(LEGACY_SORTED_LISTS_KEY),
	]);

	const raw = isPlainObject(rawStored) ? rawStored : {};
	const legacy = isPlainObject(legacyStored) ? legacyStored : {};
	const hasLegacySlides = Array.isArray(legacyLists) &&
		legacyLists.includes('slides') &&
		Array.isArray(legacy.slides) &&
		legacy.slides.length > 0;

	const stored = {
		slides: hasLegacySlides ? legacy.slides : raw.slides,
		autoRotate: pickStoredField(raw, legacy, 'autoRotate'),
		autoRotateInterval: pickStoredField(raw, legacy, 'autoRotateInterval'),
		recentTitle: pickStoredField(raw, legacy, 'recentTitle'),
		recentLinkUrl: pickStoredField(raw, legacy, 'recentLinkUrl'),
		recentLinkLabel: pickStoredField(raw, legacy, 'recentLinkLabel'),
		tagsTitle: pickStoredField(raw, legacy, 'tagsTitle'),
		categoriesTitle: pickStoredField(raw, legacy, 'categoriesTitle'),
	};

	return {
		stored,
		migratedFromLegacy: hasLegacySlides,
		hasLegacyFields: LEGACY_SINGLE_SLIDE_FIELDS.some(field => Object.prototype.hasOwnProperty.call(raw, field)),
	};
}

function pickStoredField(raw, legacy, field) {
	if (Object.prototype.hasOwnProperty.call(raw, field)) {
		return raw[field];
	}

	return legacy[field];
}

async function persistSettings(settings) {
	await db.setObject(SETTINGS_OBJECT_KEY, cloneSettings(settings));

	if (LEGACY_SINGLE_SLIDE_FIELDS.length) {
		await db.deleteObjectFields(SETTINGS_OBJECT_KEY, LEGACY_SINGLE_SLIDE_FIELDS);
	}

	await cleanupLegacySortedSlides();
}

async function cleanupLegacySortedSlides() {
	const legacyLists = await db.getSetMembers(LEGACY_SORTED_LISTS_KEY);
	if (!Array.isArray(legacyLists) || !legacyLists.length) {
		return;
	}

	const keysToDelete = [LEGACY_SORTED_LISTS_KEY];

	if (legacyLists.includes('slides')) {
		const members = await db.getSortedSetRange(LEGACY_SLIDES_KEY, 0, -1);
		keysToDelete.push(LEGACY_SLIDES_KEY);
		(members || []).forEach((member) => {
			keysToDelete.push(`${LEGACY_SLIDES_KEY}:${member}`);
		});
	}

	await db.deleteAll(Array.from(new Set(keysToDelete)));
}

function isPlainObject(value) {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}
