'use strict';

const Controllers = module.exports;

Controllers.renderAdminPage = async function (req, res) {
	res.render('admin/plugins/variedmc-rules', {});
};

Controllers.renderReviewQueue = async function (req, res) {
	res.render('review-queue', {
		title: '治理队列',
		requests: [],
	});
};
