'use strict';

const db = require.main.require('./src/database');
const meta = require.main.require('./src/meta');
const utils = require.main.require('./src/utils');

const TagPolicy = module.exports;

TagPolicy.assertExistingTags = async function (tags) {
	const normalized = normalizeTags(tags);
	const missing = await findMissingTags(normalized);
	if (missing.length) {
		throw new Error(`[[error:tag-not-allowed]]: ${missing.join(', ')}`);
	}

	return normalized;
};

TagPolicy.filterExistingTags = async function (tags) {
	const normalized = normalizeTags(tags);
	if (!normalized.length) {
		return [];
	}

	const exists = await db.isSortedSetMembers('tags:topic:count', normalized);
	return normalized.filter((tag, index) => exists[index]);
};

function normalizeTags(tags) {
	if (!Array.isArray(tags)) {
		return [];
	}

	const seen = new Set();
	const normalized = [];
	tags.forEach((tag) => {
		const clean = normalizeTag(tag);
		if (clean && !seen.has(clean)) {
			seen.add(clean);
			normalized.push(clean);
		}
	});
	return normalized;
}

function normalizeTag(value) {
	return utils.cleanUpTag(String(value || ''), meta.config.maximumTagLength);
}

async function findMissingTags(tags) {
	if (!tags.length) {
		return [];
	}

	const exists = await db.isSortedSetMembers('tags:topic:count', tags);
	return tags.filter((tag, index) => !exists[index]);
}
