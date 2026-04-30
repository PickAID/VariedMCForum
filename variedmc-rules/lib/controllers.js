'use strict';

const Controllers = module.exports;

Controllers.renderAdminPage = async function (req, res) {
	res.render('admin/plugins/variedmc-rules', {});
};

Controllers.renderReviewQueue = async function (req, res) {
	const user = require.main.require('./src/user');
	const topics = require.main.require('./src/topics');
	const posts = require.main.require('./src/posts');
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
	const topicData = await topics.getTopicsFields(visible.map(request => request.tid), ['tid', 'title', 'slug', 'mainPid']);
	const topicsByTid = Object.fromEntries((topicData || []).filter(Boolean).map(topic => [String(topic.tid), topic]));
	const mainPids = topicData.filter(topic => topic && topic.mainPid).map(topic => topic.mainPid);
	const postData = await posts.getPostsFields(mainPids, ['pid', 'content', 'sourceContent']);
	const postsByPid = Object.fromEntries((postData || []).filter(Boolean).map(post => [String(post.pid), post]));
	res.render('review-queue', {
		title: '治理队列',
		requests: visible.map(request => enrichRequest(request, topicsByTid[String(request.tid)], postsByPid)),
		state,
		breadcrumbs: helpers.buildBreadcrumbs([{ text: '治理队列' }]),
	});
};

function enrichRequest(request, topic, postsByPid) {
	const slug = topic && topic.slug ? topic.slug : request.tid;
	const post = topic && postsByPid[String(topic.mainPid)];
	return {
		...request,
		typeLabel: typeLabel(request.type),
		topicTitle: topic && topic.title ? topic.title : `主题 #${request.tid}`,
		topicUrl: `/topic/${slug}`,
		mainPid: topic && topic.mainPid,
		currentTitle: topic && topic.title,
		currentContent: post ? post.sourceContent || post.content || '' : '',
	};
}

function typeLabel(type) {
	if (type === 'restore-topic') {
		return '恢复主题';
	}
	if (type === 'edit-topic') {
		return '编辑主题';
	}
	return '删除主题';
}
