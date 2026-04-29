'use strict';

const assert = require('assert');
const ContentPolicy = require('../lib/domain/content-policy');

describe('VariedMC Rules content policy', () => {
	it('counts meaningful plain text and ignores markdown image noise', () => {
		const text = ContentPolicy.toMeaningfulText('![x](https://example.com/a.png)\n\n**招募说明**：需要长期协作。');
		assert.strictEqual(text, '招募说明：需要长期协作。');
	});

	it('rejects topic content shorter than the resolved rule', () => {
		assert.throws(() => ContentPolicy.assertTopicContent('短内容', {
			minimumTopicContentLength: 10,
		}), /error:variedmc-rules-content-too-short/);
	});

	it('allows disabled length rules', () => {
		assert.doesNotThrow(() => ContentPolicy.assertTopicContent('', {
			minimumTopicContentLength: 0,
		}));
	});
});
