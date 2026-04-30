'use strict';

const assert = require('assert');

let restoreMainRequire;

afterEach(() => {
	if (restoreMainRequire) {
		require.main.require = restoreMainRequire;
		restoreMainRequire = null;
	}
	for (const filename of ['../lib/domain/review-request-service', '../lib/controllers']) {
		delete require.cache[require.resolve(filename)];
	}
});

describe('VariedMC Rules review queue controller', () => {
	it('only renders requests visible to admins, global mods, or category moderators', async () => {
		const { controllers, rendered } = loadControllers();

		await controllers.renderReviewQueue({ uid: 'mod', query: {} }, renderer(rendered));

		assert.strictEqual(rendered.template, 'review-queue');
		assert.deepStrictEqual(rendered.data.requests.map(request => request.id), ['visible', 'edit-visible']);
		assert.strictEqual(rendered.data.requests[0].topicTitle, 'Visible topic');
		assert.strictEqual(rendered.data.requests[0].topicUrl, '/topic/55/visible-topic');
		assert.strictEqual(rendered.data.requests[0].typeLabel, '删除主题');
		assert.strictEqual(rendered.data.requests[1].typeLabel, '编辑主题');
		assert.strictEqual(rendered.data.requests[1].mainPid, 'main-pid');
		assert.strictEqual(rendered.data.requests[1].currentContent, '当前内容');
		assert.strictEqual(rendered.data.state, 'open');
	});

	it('rejects users without review queue permissions', async () => {
		const { controllers, notAllowedCalls } = loadControllers();

		await controllers.renderReviewQueue({ uid: 'user', query: {} }, renderer({}));

		assert.strictEqual(notAllowedCalls.length, 1);
	});
});

function loadControllers() {
	const rendered = {};
	const notAllowedCalls = [];
	const reviewRequests = {
		listByState: async () => [
			{ id: 'visible', tid: 55, cid: 5, type: 'delete-topic', state: 'open' },
			{ id: 'edit-visible', tid: 55, cid: 5, type: 'edit-topic', state: 'open', proposedContent: '拟改内容' },
			{ id: 'hidden', tid: 66, cid: 6, type: 'restore-topic', state: 'open' },
		],
	};
	const originalRequire = require.main.require;
	require.main.require = (requestPath) => {
		if (requestPath === './src/user') {
			return {
				isAdminOrGlobalMod: async uid => uid === 'admin',
				getModeratedCids: async uid => (uid === 'mod' ? [5] : []),
			};
		}
		if (requestPath === './src/topics') {
			return {
				getTopicsFields: async tids => tids.map(tid => ({
					tid,
					title: Number(tid) === 55 ? 'Visible topic' : 'Hidden topic',
					slug: Number(tid) === 55 ? '55/visible-topic' : '66/hidden-topic',
					mainPid: Number(tid) === 55 ? 'main-pid' : 'hidden-main-pid',
				})),
			};
		}
		if (requestPath === './src/posts') {
			return {
				getPostsFields: async pids => pids.map(pid => ({
					pid,
					sourceContent: pid === 'main-pid' ? '当前内容' : '隐藏内容',
				})),
			};
		}
		if (requestPath === './src/controllers/helpers') {
			return {
				buildBreadcrumbs: crumbs => crumbs,
				notAllowed: async (req, res) => notAllowedCalls.push({ req, res }),
			};
		}
		return originalRequire.call(require.main, requestPath);
	};
	const servicePath = require.resolve('../lib/domain/review-request-service');
	const controllersPath = require.resolve('../lib/controllers');
	restoreMainRequire = originalRequire;
	require.cache[servicePath] = {
		id: servicePath,
		filename: servicePath,
		loaded: true,
		exports: reviewRequests,
	};
	delete require.cache[controllersPath];
	const controllers = require('../lib/controllers');
	return { controllers, rendered, notAllowedCalls };
}

function renderer(rendered) {
	return {
		render: (template, data) => {
			rendered.template = template;
			rendered.data = data;
		},
	};
}
