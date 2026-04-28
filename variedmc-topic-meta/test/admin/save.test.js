'use strict';

const assert = require('assert');

const {
	baseState,
	createAdminHarness,
	fillLastCategoryMetaList,
	fillLastGlobalMetaList,
	templateWithHeaderSave,
	triggerSave,
} = require('./helpers');

describe('VariedMC topic meta ACP saving', () => {
	it('saves global root meta lists with the simplified list model and legacy modules', () => {
		let savedPayload = null;
		const { $ } = createAdminHarness(baseState(), { onSave: payload => { savedPayload = payload; } });

		$('#variedmc-topic-meta-lists').empty();
		$('#variedmc-topic-meta-add-list').trigger('click');
		fillLastGlobalMetaList($, {
			id: 'skill',
			moduleLabel: '技能',
			moduleKey: 'skill',
			selectionKey: 'skill.primary',
			label: '技能',
			options: 'KubeJS\n数据包',
		});
		triggerSave($);

		assert(savedPayload, 'save payload should be captured');
		assert.strictEqual(savedPayload.lists[0].id, 'skill');
		assert.strictEqual(savedPayload.modules[0].key, 'skill');
		assert.strictEqual(savedPayload.modules[0].fields[0].selectionKey, 'skill.primary');
		assert.deepStrictEqual(Array.from(savedPayload.modules[0].fields[0].options), ['KubeJS', '数据包']);
	});

	it('saves category-local meta lists for parent and child categories', () => {
		let savedPayload = null;
		const { $ } = createAdminHarness(baseState({
			categories: [
				{ cid: 5, name: '父板块', depth: 0, parentCid: 0 },
				{ cid: 6, name: '子板块', depth: 1, parentCid: 5 },
			],
		}), { onSave: payload => { savedPayload = payload; } });

		addCategoryList($, '5', 'extend', {
			id: 'parent-kind',
			moduleLabel: '父级分类',
			moduleKey: 'parent-kind',
			selectionKey: 'parent-kind.primary',
			label: '父级分类',
			options: '教程\n案例',
		});
		addCategoryList($, '6', 'override', {
			id: 'child-kind',
			moduleLabel: '子级分类',
			moduleKey: 'child-kind',
			selectionKey: 'child-kind.primary',
			label: '子级分类',
			options: '独立项',
		});
		triggerSave($);

		assert.strictEqual(savedPayload.categoryRules['5'].lists[0].id, 'parent-kind');
		assert.strictEqual(savedPayload.categoryRules['5'].modules[0].fields[0].selectionKey, 'parent-kind.primary');
		assert.strictEqual(savedPayload.categoryRules['6'].lists[0].id, 'child-kind');
		assert.strictEqual(savedPayload.categoryRules['6'].modules[0].fields[0].selectionKey, 'child-kind.primary');
	});

	it('allows creating category-local lists from inherited parent and child cards', () => {
		let savedPayload = null;
		const { $ } = createAdminHarness(baseState({
			categories: [
				{ cid: 5, name: '父板块', depth: 0, parentCid: 0 },
				{ cid: 6, name: '子板块', depth: 1, parentCid: 5 },
			],
		}), { onSave: payload => { savedPayload = payload; } });
		const parent = $('#variedmc-topic-meta-categories [data-cid="5"]');
		const child = $('#variedmc-topic-meta-categories [data-cid="6"]');

		parent.find('[data-action="add-category-list"]').trigger('click');
		child.find('[data-action="add-category-list"]').trigger('click');
		fillLastCategoryMetaList(parent, { id: 'parent-local', label: '父级新增', options: '父级项' });
		fillLastCategoryMetaList(child, { id: 'child-local', label: '子级新增', options: '子级项' });
		triggerSave($);

		assert.strictEqual(parent.find('[data-rule-field="scope"]').val(), 'extend');
		assert.strictEqual(child.find('[data-rule-field="scope"]').val(), 'extend');
		assert.strictEqual(savedPayload.categoryRules['5'].lists[0].id, 'parent-local');
		assert.strictEqual(savedPayload.categoryRules['6'].lists[0].id, 'child-local');
	});

	it('generates stable category-specific legacy keys for new parent and child lists', () => {
		let savedPayload = null;
		const { $ } = createAdminHarness(baseState({
			categories: [
				{ cid: 5, name: '父板块', depth: 0, parentCid: 0 },
				{ cid: 6, name: '子板块', depth: 1, parentCid: 5 },
			],
		}), { onSave: payload => { savedPayload = payload; } });

		['5', '6'].forEach((cid) => {
			const card = $(`#variedmc-topic-meta-categories [data-cid="${cid}"]`);
			card.find('[data-action="add-category-list"]').trigger('click');
			card.find('[data-category-meta-lists] [data-list-field="options"]').last().val(`${cid}项`);
		});
		triggerSave($);

		const parentField = savedPayload.categoryRules['5'].modules[0].fields[0];
		const childField = savedPayload.categoryRules['6'].modules[0].fields[0];
		assert.strictEqual(savedPayload.categoryRules['5'].modules[0].key, 'category-5-custom-1');
		assert.strictEqual(savedPayload.categoryRules['6'].modules[0].key, 'category-6-custom-1');
		assert.strictEqual(parentField.selectionKey, 'category-5-custom-1.primary');
		assert.strictEqual(childField.selectionKey, 'category-6-custom-1.primary');
	});

	it('saves from footer and header save buttons', () => {
		let savedPayload = null;
		const state = baseState({ categories: [{ cid: 5, name: '父板块', depth: 0, parentCid: 0 }] });
		const { $ } = createAdminHarness(state, { onSave: payload => { savedPayload = payload; } }, templateWithHeaderSave());

		addCategoryList($, '5', 'override', {
			id: 'category-topic',
			moduleLabel: '板块主题',
			moduleKey: 'category-topic',
			selectionKey: 'category-topic.primary',
			label: '板块主题',
			options: '教程',
		});
		$('.variedmc-topic-meta-page [id="save"]').first().trigger('click');

		assert(savedPayload, 'header save should trigger plugin save');
		assert.strictEqual(savedPayload.categoryRules['5'].modules[0].fields[0].selectionKey, 'category-topic.primary');
	});

	it('persists aliases while saving category-local lists', () => {
		let savedPayload = null;
		const { $ } = createAdminHarness(baseState({
			settings: { categoryAliases: { 5: 'tools' } },
			categories: [{ cid: 5, name: '妙妙工具', depth: 0, parentCid: 0 }],
		}), { onSave: payload => { savedPayload = payload; } });
		const card = $('#variedmc-topic-meta-categories [data-cid="5"]');

		card.find('[data-category-field="alias"]').val('magic-tools');
		triggerSave($);

		assert.strictEqual(savedPayload.categoryAliases['5'], 'magic-tools');
	});
});

function addCategoryList($, cid, scope, values) {
	const card = $(`#variedmc-topic-meta-categories [data-cid="${cid}"]`);
	card.find('[data-rule-field="scope"]').val(scope).trigger('change');
	card.find('[data-action="add-category-list"]').trigger('click');
	fillLastCategoryMetaList(card, values);
}
