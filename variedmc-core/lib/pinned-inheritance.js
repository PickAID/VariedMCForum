'use strict';

function mergePinnedTids(groups) {
	const seen = new Set();
	const merged = [];

	(Array.isArray(groups) ? groups : []).forEach((group) => {
		(Array.isArray(group) ? group : []).forEach((tid) => {
			const value = String(tid || '').trim();
			if (!value || seen.has(value)) {
				return;
			}
			seen.add(value);
			merged.push(value);
		});
	});

	return merged;
}

function slicePinnedTids(tids, start = 0, stop = -1) {
	const normalizedStart = Math.max(0, parseInt(start, 10) || 0);
	const normalizedStop = parseInt(stop, 10);

	if (normalizedStop === -1) {
		return tids.slice(normalizedStart);
	}

	return tids.slice(normalizedStart, Math.max(normalizedStart, normalizedStop) + 1);
}

module.exports = {
	mergePinnedTids,
	slicePinnedTids,
};
