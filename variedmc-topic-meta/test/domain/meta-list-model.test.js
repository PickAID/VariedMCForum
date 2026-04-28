'use strict';

const assert = require('assert');

const SettingsNormalizer = require('../../lib/domain/settings-normalizer');
const CategoryRuleResolver = require('../../lib/domain/category-rule-resolver');
const TitleTemplateRenderer = require('../../lib/domain/title-template-renderer');

describe('VariedMC topic meta list model', () => {
	it('normalizes lists as the primary model while preserving legacy modules', () => {
		const settings = SettingsNormalizer.normalize({
			lists: [{
				id: 'skill',
				label: '技能',
				mode: 'single',
				options: ['KubeJS', '数据包'],
			}],
			categoryRules: {
				5: {
					scope: 'override',
					lists: [{
						id: 'topic',
						label: '主题',
						options: ['教程'],
					}],
				},
			},
		});

		assert.deepStrictEqual(settings.lists.map(list => list.id), ['skill']);
		assert.strictEqual(settings.modules[0].key, 'skill');
		assert.strictEqual(settings.modules[0].fields[0].selectionKey, 'skill');
		assert.deepStrictEqual(settings.categoryRules['5'].lists.map(list => list.id), ['topic']);
		assert.strictEqual(settings.categoryRules['5'].modules[0].fields[0].selectionKey, 'topic');
	});

	it('keeps an override category independent from global custom lists', () => {
		const settings = SettingsNormalizer.normalize({
			lists: [{
				id: 'global-topic',
				label: '全局主题',
				options: ['KubeJS'],
			}],
			categoryHierarchy: {
				5: 0,
				6: 5,
			},
			categoryRules: {
				5: {
					scope: 'extend',
					lists: [{
						id: 'parent-topic',
						label: '父级主题',
						options: ['父级项'],
					}],
				},
				6: {
					scope: 'override',
					lists: [{
						id: 'child-topic',
						label: '子级主题',
						options: ['子级项'],
					}],
				},
			},
		});
		const rule = CategoryRuleResolver.resolve(settings, 6);

		assert.deepStrictEqual(rule.metaFields.map(field => field.selectionKey), [
			'versions',
			'loaders',
			'child-topic',
		]);
	});

	it('does not inject fallback topic lists into category rules', () => {
		const settings = SettingsNormalizer.normalize({
			categoryRules: {
				5: {
					scope: 'extend',
					rulesText: '只追加规则说明',
				},
			},
		});

		assert.deepStrictEqual(settings.categoryRules['5'].lists, []);
		assert.deepStrictEqual(settings.categoryRules['5'].modules, []);
	});

	it('renders list-id placeholders and legacy module.field placeholders', () => {
		const metaState = {
			versions: ['1.18.2', '1.20.1', '1.21.1', '26.1'],
			modules: {
				topic: {
					primary: ['KubeJS'],
				},
				'category-5-content': {
					primary: ['教程'],
				},
			},
		};
		const metaFields = [
			{
				id: 'versions',
				selectionKey: 'versions',
				fieldKey: 'version',
				label: '版本',
				enabled: true,
				options: ['1.18.2', '1.19.2', '1.20.1', '1.21.1', '26.1'],
			},
			{
				id: 'topic',
				selectionKey: 'topic',
				moduleKey: 'topic',
				fieldKey: 'primary',
				label: '主题',
				enabled: true,
				options: ['KubeJS'],
			},
			{
				id: 'content',
				selectionKey: 'content',
				moduleKey: 'category-5-content',
				fieldKey: 'primary',
				label: '内容',
				enabled: true,
				options: ['教程'],
			},
		];

		const title = TitleTemplateRenderer.renderTitle(
			'标题',
			metaState,
			'{block:versions}{block:topic}{block:topic.primary}{block:tools.content}{label:tools.content} {title}',
			{
				categoryAlias: 'tools',
				categoryCid: 5,
				metaFields,
				versionCatalog: ['1.18.2', '1.19.2', '1.20.1', '1.21.1', '26.1'],
			}
		);

		assert.strictEqual(title, '[1.18.2,1.20.1-26.1][KubeJS][KubeJS][教程]内容 标题');
	});
});
