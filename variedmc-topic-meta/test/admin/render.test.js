'use strict';

const assert = require('assert');

const { baseState, createAdminHarness } = require('./helpers');

describe('VariedMC topic meta ACP rendering', () => {
	it('renders inherited, extended, and override meta lists in category cards', () => {
		const { $ } = createAdminHarness(baseState({
			settings: {
				lists: [{
					id: 'topic',
					label: '技能',
					selectionKey: 'themes',
					moduleKey: 'topic',
					fieldKey: 'primary',
					options: ['KubeJS'],
				}, {
					id: 'content.kind',
					label: '内容类型',
					moduleKey: 'content',
					fieldKey: 'kind',
					selectionKey: 'content.kind',
					mode: 'single',
					options: ['教程', '提问'],
				}],
				modules: [{
					key: 'topic',
					label: '技能',
					fields: [{ key: 'primary', selectionKey: 'themes', label: '技能', options: ['KubeJS'] }],
				}],
				categoryRules: {
					5: {
						scope: 'extend',
						lists: [{
							id: 'category-kind',
							label: '板块内容',
							moduleKey: 'category-kind',
							fieldKey: 'primary',
							selectionKey: 'category-kind.primary',
							options: ['教程', '案例'],
						}],
					},
					7: {
						scope: 'override',
						lists: [{
							id: 'child-only',
							label: '子板块独立项',
							moduleKey: 'child-only',
							fieldKey: 'primary',
							selectionKey: 'child-only.primary',
							options: ['只在子板块'],
						}],
					},
				},
			},
			categories: [
				{ cid: 5, name: '妙妙工具', depth: 0, parentCid: 0 },
				{ cid: 6, name: '子工具', depth: 1, parentCid: 5 },
				{ cid: 7, name: '独立子工具', depth: 1, parentCid: 5 },
			],
		}));

		const parent = $('#variedmc-topic-meta-categories [data-cid="5"]');
		const child = $('#variedmc-topic-meta-categories [data-cid="6"]');
		const overrideChild = $('#variedmc-topic-meta-categories [data-cid="7"]');

		assert.strictEqual(parent.find('[data-selection-key="versions"]').length, 1);
		assert.strictEqual(parent.find('[data-selection-key="loaders"]').length, 1);
		assert.strictEqual(parent.find('[data-selection-key="themes"]').length, 1);
		assert.strictEqual(parent.find('[data-selection-key="content.kind"]').length, 1);
		assert.strictEqual(parent.find('[data-selection-key="category-kind.primary"]').length, 1);
		assert.strictEqual(child.find('[data-selection-key="category-kind.primary"]').length, 1);
		assert.strictEqual(overrideChild.find('[data-selection-key="themes"]').length, 0);
		assert.strictEqual(overrideChild.find('[data-selection-key="content.kind"]').length, 0);
		assert.strictEqual(overrideChild.find('[data-selection-key="child-only.primary"]').length, 1);
	});

	it('keeps the delegated global add-list button working', () => {
		const { $ } = createAdminHarness(baseState());
		$('#variedmc-topic-meta-add-list').off('click');
		$('#variedmc-topic-meta-lists').empty();

		$('#variedmc-topic-meta-add-list').trigger('click');

		assert.strictEqual($('#variedmc-topic-meta-lists [data-meta-list]').length, 1);
	});

	it('renders category aliases and scoped placeholders', () => {
		const { $ } = createAdminHarness(baseState({
			settings: {
				categoryAliases: { 5: 'tools' },
				categoryRules: {
					5: {
						scope: 'extend',
						lists: [{
							id: 'custom-1',
							label: '内容类型',
							moduleKey: 'category-5-custom-1',
							fieldKey: 'primary',
							selectionKey: 'category-5-custom-1.primary',
							options: ['教程'],
						}],
					},
				},
			},
			categories: [{ cid: 5, name: '妙妙工具', depth: 0, parentCid: 0 }],
		}));
		const card = $('#variedmc-topic-meta-categories [data-cid="5"]');

		assert.strictEqual(card.find('[data-category-field="alias"]').val(), 'tools');
		assert(card.text().includes('{block:tools.custom-1}'));
		assert(card.text().includes('{block:tools.custom-1.primary}'));
	});
});
