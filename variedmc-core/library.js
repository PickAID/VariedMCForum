'use strict';

const db = require.main.require('./src/database');
const categories = require.main.require('./src/categories');
const privileges = require.main.require('./src/privileges');
const topics = require.main.require('./src/topics');

const {
	mergePinnedTids,
	slicePinnedTids,
} = require('./lib/pinned-inheritance');

const plugin = module.exports;

plugin.filterCategoryPinnedTids = async function (payload) {
	const data = payload && payload.data ? payload.data : {};
	const cid = String(data.cid || '').trim();

	if (!cid || cid === '-1') {
		return payload;
	}

	const chain = await getCategoryChain(cid, data.category);
	const groupedTids = await Promise.all(chain.map(chainCid => getVisiblePinnedTids(chainCid, data.uid)));
	const pinnedTids = slicePinnedTids(mergePinnedTids(groupedTids), data.start, data.stop);

	return {
		...payload,
		pinnedTids,
	};
};

async function getCategoryChain(cid, currentCategory) {
	const chain = [];
	const seen = new Set();
	let category = normalizeCategory(currentCategory, cid);
	let currentCid = cid;

	while (currentCid && currentCid !== '0' && currentCid !== '-1' && !seen.has(currentCid)) {
		seen.add(currentCid);
		if (!category || String(category.cid) !== currentCid) {
			category = await categories.getCategoryFields(currentCid, ['cid', 'parentCid']);
		}
		if (!category || !category.cid) {
			break;
		}

		chain.push(String(category.cid));
		currentCid = String(category.parentCid || '0');
		category = null;
	}

	return chain.reverse();
}

function normalizeCategory(category, cid) {
	if (!category || String(category.cid) !== String(cid)) {
		return null;
	}
	return {
		cid: category.cid,
		parentCid: category.parentCid,
	};
}

async function getVisiblePinnedTids(cid, uid) {
	const allPinnedTids = await db.getSortedSetRevRange(`cid:${cid}:tids:pinned`, 0, -1);
	if (!allPinnedTids.length) {
		return [];
	}

	const canSchedule = await privileges.categories.can('topics:schedule', cid, uid);
	const visibleTids = canSchedule ? allPinnedTids : await filterScheduledTids(allPinnedTids);

	return await topics.tools.checkPinExpiry(visibleTids);
}

async function filterScheduledTids(tids) {
	const scores = await db.sortedSetScores('topics:scheduled', tids);
	const now = Date.now();
	return tids.filter((tid, index) => tid && (!scores[index] || scores[index] <= now));
}
