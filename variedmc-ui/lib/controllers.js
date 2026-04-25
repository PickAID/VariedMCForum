'use strict';

const Controllers = module.exports;

Controllers.renderAdminPage = async function (req, res) {
	res.render('admin/plugins/variedmc-ui', {});
};
