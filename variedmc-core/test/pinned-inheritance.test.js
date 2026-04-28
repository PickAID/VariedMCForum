'use strict';

const assert = require('assert');

const {
	mergePinnedTids,
	slicePinnedTids,
} = require('../lib/pinned-inheritance');

describe('VariedMC core pinned inheritance', () => {
	it('inherits ancestor pinned topics before appending child pinned topics', () => {
		const merged = mergePinnedTids([
			['1', '2'],
			['3'],
			['4', '5'],
		]);

		assert.deepStrictEqual(merged, ['1', '2', '3', '4', '5']);
	});

	it('deduplicates inherited pinned topics without changing first-seen order', () => {
		const merged = mergePinnedTids([
			['1', '2'],
			['2', '3'],
			['1', '4'],
		]);

		assert.deepStrictEqual(merged, ['1', '2', '3', '4']);
	});

	it('applies NodeBB-style start and stop slicing after inheritance is merged', () => {
		const sliced = slicePinnedTids(['1', '2', '3', '4'], 1, 2);

		assert.deepStrictEqual(sliced, ['2', '3']);
	});

	it('keeps stop -1 as open-ended', () => {
		const sliced = slicePinnedTids(['1', '2', '3', '4'], 2, -1);

		assert.deepStrictEqual(sliced, ['3', '4']);
	});
});
