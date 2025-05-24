'use strict';

const meta = require.main.require('./src/meta');

const Controllers = module.exports;

Controllers.renderAdminPage = async function (req, res) {
	const settings = await meta.settings.get('tag-color-maker');
	let tagColors = {};
	
	try {
		tagColors = JSON.parse(settings.tagColors || '{}');
	} catch (e) {
		tagColors = {};
	}
	
	res.render('admin/plugins/tag-color-maker', {
		title: '标签颜色管理',
		tagColors: JSON.stringify(tagColors, null, 2)
	});
};

Controllers.saveSettings = async function (req, res) {
	try {
		const { tagColors } = req.body;
		
		JSON.parse(tagColors);
		
		await meta.settings.set('tag-color-maker', {
			tagColors: tagColors
		});
		
		res.json({ success: true, message: '设置已保存' });
	} catch (e) {
		res.status(400).json({ success: false, message: 'JSON格式错误: ' + e.message });
	}
};
