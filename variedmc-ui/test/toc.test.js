'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { JSDOM } = require('jsdom');

describe('VariedMC UI table of contents behavior', () => {
	it('sets a browser-safe sticky top offset for better TOC mode', () => {
		const dom = new JSDOM(`<!doctype html><html><body class="page-topic">
			<article style="height: 1000px;">
				<div class="markdown-toc"></div>
			</article>
		</body></html>`);
		const toc = dom.window.document.querySelector('.markdown-toc');
		Object.defineProperty(toc, 'clientHeight', { value: 180 });
		toc.getBoundingClientRect = () => ({ top: 0 });
		toc.parentElement.getBoundingClientRect = () => ({ top: -20, bottom: 500 });

		loadTocModule(dom.window);
		dom.window.VariedMCUiToc.sync();

		assert.strictEqual(toc.style.getPropertyValue('--vui-toc-top'), '-120px');
		assert(toc.classList.contains('better-toc'));
	});
});

function loadTocModule(window) {
	const filename = path.join(__dirname, '..', 'public/js/client/toc.js');
	const context = {
		window,
		document: window.document,
	};

	window.innerHeight = 800;
	window.getComputedStyle = () => ({ top: '0px' });
	window.requestAnimationFrame = callback => callback();

	vm.createContext(context);
	vm.runInContext(fs.readFileSync(filename, 'utf8'), context, { filename });
}
