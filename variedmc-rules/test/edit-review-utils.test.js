'use strict';

const assert = require('assert');

describe('VariedMC Rules edit review client utilities', () => {
	let utils;

	beforeEach(() => {
		delete require.cache[require.resolve('../public/js/client/review-preview')];
		utils = require('../public/js/client/review-preview');
	});

	it('builds composer edit payload from the latest pending draft', () => {
		assert.deepStrictEqual(utils.buildEditComposerPayload('main-pid', {
			title: '第二次标题',
			content: '第二次内容',
		}), {
			pid: 'main-pid',
			title: '第二次标题',
			body: '第二次内容',
		});
	});

	it('falls back to current post content when no pending draft exists', () => {
		assert.deepStrictEqual(utils.buildEditComposerPayload('main-pid', null), {
			pid: 'main-pid',
		});
	});

	it('reads proposed edit content from a review card', () => {
		const card = {
			getAttribute: name => ({
				'data-main-pid': 'main-pid',
				'data-proposed-title': '拟改标题',
			}[name]),
			querySelector: selector => ({
				'[data-role="proposed-content"]': { value: '拟改内容' },
			}[selector]),
		};

		assert.deepStrictEqual(utils.readCardDraft(card), {
			pid: 'main-pid',
			title: '拟改标题',
			proposedContent: '拟改内容',
		});
	});
});
