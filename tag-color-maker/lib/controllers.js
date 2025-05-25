'use strict';

const Controllers = module.exports;

Controllers.renderAdminPage = function (req, res) {
    res.render('admin/plugins/tag-color-maker', {
        title: 'Tag Color Maker Settings',
    });
}; 