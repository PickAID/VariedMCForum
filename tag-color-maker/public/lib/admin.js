'use strict';

/*
	This file is located in the "modules" block of plugin.json
	It is only loaded when the user navigates to /admin/plugins/quickstart page
	It is not bundled into the min file that is served on the first load of the page.
*/

import { save, load } from 'settings';

export function init() {
	handleSettingsForm();
	setupEventHandlers();
	updatePreview();
}

function handleSettingsForm() {
	load('tag-color-maker', $('.tag-color-maker-settings'));

	$('#save').on('click', () => {
		save('tag-color-maker', $('.tag-color-maker-settings'), function() {
			console.log('设置已保存！请刷新页面查看效果。');
		});
	});
}

function setupEventHandlers() {
	$('#tagColors').on('input', updatePreview);
	
	$('.add-preset').on('click', function() {
		const tag = $(this).data('tag');
		const bg = $(this).data('bg');
		const color = $(this).data('color');
		addTagToConfig(tag, bg, color);
	});
	
	$('#addCustom').on('click', function() {
		const tag = $('#customTag').val().trim();
		const bg = $('#customBg').val();
		const color = $('#customColor').val();
		
		if (!tag) {
			console.log('请输入标签名');
			return;
		}
		
		addTagToConfig(tag, bg, color);
		$('#customTag').val('');
	});
	
	$('#reset').on('click', function() {
		if (confirm('确定要重置为默认配置吗？')) {
			const defaultConfig = {
				forge: { background: '#DFA86A', color: '#FAF4F3' },
				neoforge: { background: '#E68C37', color: '#FFFFFF' },
				fabric: { background: '#DBD0B4', color: '#111111' },
				kubejs: { background: '#C186E6', color: '#FFFFFF' },
				unsafe: { background: 'red', color: '#FFFFFF' }
			};
			$('#tagColors').val(JSON.stringify(defaultConfig, null, 2));
			updatePreview();
		}
	});
	
	$('#format').on('click', function() {
		try {
			const config = JSON.parse($('#tagColors').val());
			$('#tagColors').val(JSON.stringify(config, null, 2));
			console.log('JSON已格式化');
		} catch (e) {
			console.log('JSON格式错误: ' + e.message);
		}
	});
}

function addTagToConfig(tag, background, color) {
	try {
		let config = {};
		const currentValue = $('#tagColors').val().trim();
		if (currentValue) {
			config = JSON.parse(currentValue);
		}
		
		config[tag] = { background, color };
		$('#tagColors').val(JSON.stringify(config, null, 2));
		updatePreview();
		console.log(`标签 "${tag}" 已添加`);
	} catch (e) {
		console.log('添加失败: ' + e.message);
	}
}

function updatePreview() {
	try {
		const config = JSON.parse($('#tagColors').val() || '{}');
		const preview = $('#colorPreview');
		preview.empty();
		
		Object.keys(config).forEach(tag => {
			const colors = config[tag];
			const tagElement = $(`
				<span class="badge me-2 mb-2" style="background-color: ${colors.background}; color: ${colors.color}; position: relative;">
					${tag}
					<button type="button" class="btn-close btn-close-white ms-2" style="font-size: 0.7em;" data-tag="${tag}"></button>
				</span>
			`);
			
			tagElement.find('.btn-close').on('click', function() {
				removeTagFromConfig($(this).data('tag'));
			});
			
			preview.append(tagElement);
		});
		
		if (Object.keys(config).length === 0) {
			preview.html('<span class="text-muted">暂无标签颜色配置</span>');
		}
	} catch (e) {
		$('#colorPreview').html('<span class="text-danger">JSON格式错误</span>');
	}
}

function removeTagFromConfig(tag) {
	try {
		const config = JSON.parse($('#tagColors').val() || '{}');
		delete config[tag];
		$('#tagColors').val(JSON.stringify(config, null, 2));
		updatePreview();
		console.log(`标签 "${tag}" 已删除`);
	} catch (e) {
		console.log('删除失败: ' + e.message);
	}
}
