'use strict';

const Controllers = module.exports;

Controllers.renderAdminPage = async function (req, res) {
	res.render('admin/plugins/variedmc-rules', {});
};

Controllers.renderReviewQueue = async function (req, res) {
	const user = require.main.require('./src/user');
	const helpers = require.main.require('./src/controllers/helpers');
	const reviewRequests = require('./domain/review-request-service');
	const state = req.query.state || 'open';
	const [isAdminOrGlobalMod, moderatedCids] = await Promise.all([
		user.isAdminOrGlobalMod(req.uid),
		user.getModeratedCids(req.uid),
	]);
	if (!isAdminOrGlobalMod && !moderatedCids.length) {
		return helpers.notAllowed(req, res);
	}
	const requests = await reviewRequests.listByState(state, 0, 49);
	const moderatedCidSet = new Set(moderatedCids.map(String));
	const visible = isAdminOrGlobalMod ? requests : requests.filter(request => (
		moderatedCidSet.has(String(request.cid))
	));
	res.render('review-queue', {
		title: '治理队列',
		requests: visible,
		state,
		breadcrumbs: helpers.buildBreadcrumbs([{ text: '治理队列' }]),
	});
};
