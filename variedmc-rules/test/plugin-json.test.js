'use strict';

const assert = require('assert');
const plugin = require('../plugin.json');

describe('VariedMC Rules plugin manifest', () => {
	it('registers Task 3 topic creation and post edit filters', () => {
		const hookMethods = Object.fromEntries(plugin.hooks.map(hook => [hook.hook, hook.method]));

		assert.strictEqual(hookMethods['filter:topic.post'], 'filterTopicPost');
		assert.strictEqual(hookMethods['filter:post.edit'], 'filterPostEdit');
		assert.strictEqual(Object.prototype.hasOwnProperty.call(hookMethods, 'filter:topic.reply'), false);
	});
});
