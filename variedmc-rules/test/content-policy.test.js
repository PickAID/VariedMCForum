'use strict';

const assert = require('assert');
const ContentPolicy = require('../lib/domain/content-policy');

describe('VariedMC Rules content policy', () => {
	it('counts meaningful plain text and ignores markdown image noise', () => {
		const text = ContentPolicy.toMeaningfulText('![x](https://example.com/a.png)\n\n**招募说明**：需要长期协作。');
		assert.strictEqual(text, '招募说明：需要长期协作。');
	});

	it('ignores reference-style markdown image alt text and definitions', () => {
		const text = ContentPolicy.toMeaningfulText('![very long hidden alt text][img]\n\n[img]: https://example.com/a.png "title"');
		assert.strictEqual(text, '');
	});

	it('does not count repeated linked reference images as topic content', () => {
		const text = [
			'[![hidden alt][img]][link]',
			'[![other hidden alt][img]][link]',
			'[img]: https://example.com/a.png',
			'[link]: https://example.com',
		].join('\n');

		assert.strictEqual(ContentPolicy.toMeaningfulText(text), '');
		assert.throws(() => ContentPolicy.assertTopicContent(text, {
			minimumTopicContentLength: 1,
		}), /error:content-too-short/);
	});

	it('does not count inline image destinations with balanced parentheses as content', () => {
		const text = [
			'![x](https://example.com/a(foo).png)',
			'![x](https://example.com/a(foo).png)',
		].join('\n');

		assert.strictEqual(ContentPolicy.toMeaningfulText(text), '');
		assert.throws(() => ContentPolicy.assertTopicContent(text, {
			minimumTopicContentLength: 1,
		}), /error:content-too-short/);
	});

	it('does not count linked inline image destinations with balanced parentheses as content', () => {
		const text = '[![x](https://example.com/a(foo).png)](https://example.com)';

		assert.strictEqual(ContentPolicy.toMeaningfulText(text), '');
		assert.throws(() => ContentPolicy.assertTopicContent(text, {
			minimumTopicContentLength: 1,
		}), /error:content-too-short/);
	});

	it('does not count angle-bracket image destinations as content', () => {
		const text = '![x](<https://example.com/a(foo).png>)';

		assert.strictEqual(ContentPolicy.toMeaningfulText(text), '');
	});

	it('does not count image alt text with nested brackets as content', () => {
		const text = '![very [long] hidden alt text](https://example.com/a.png)';

		assert.strictEqual(ContentPolicy.toMeaningfulText(text), '');
		assert.throws(() => ContentPolicy.assertTopicContent(text, {
			minimumTopicContentLength: 1,
		}), /error:content-too-short/);
	});

	it('does not count shortcut reference images as content', () => {
		const text = '![very long hidden alt text]\n\n[very long hidden alt text]: https://example.com/a.png';

		assert.strictEqual(ContentPolicy.toMeaningfulText(text), '');
		assert.throws(() => ContentPolicy.assertTopicContent(text, {
			minimumTopicContentLength: 1,
		}), /error:content-too-short/);
	});

	it('does not count zero-width characters or blank HTML entities as meaningful text', () => {
		const text = ContentPolicy.toMeaningfulText('&nbsp;&#160;&#xA0;&ZeroWidthSpace;\u200b\u200c\u200d\ufeff');
		assert.strictEqual(text, '');
	});

	it('rejects topic content shorter than the resolved rule', () => {
		assert.throws(() => ContentPolicy.assertTopicContent('短内容', {
			minimumTopicContentLength: 10,
		}), /error:content-too-short/);
	});

	it('allows disabled length rules', () => {
		assert.doesNotThrow(() => ContentPolicy.assertTopicContent('', {
			minimumTopicContentLength: 0,
		}));
	});
});
