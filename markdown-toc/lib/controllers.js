'use strict';

const Controllers = module.exports;

Controllers.renderAdminPage = function (req, res/* , next */) {
	res.render('admin/plugins/markdown-toc', {
		title: 'Markdown TOC Settings',
	});
};
