'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { JSDOM } = require('jsdom');

describe('VariedMC UI homepage carousel behavior', () => {
	it('upgrades legacy ACP carousel markup into the configured multi-slide carousel', () => {
		const dom = new JSDOM(`<!doctype html><html><body>
			<div id="home_area" data-categories-title="所有板块">
				<a id="carousel" href="/topic/legacy"></a>
				<div id="recent_area">
					<div class="head"><h4>最新动态</h4></div>
				</div>
			</div>
			<div class="categories-list"></div>
			<div class="widget-shell"><div class="widget-topics-list" data-numtopics="5"><div>recent</div></div></div>
		</body></html>`);
		dom.window.config = {
			variedmcUi: {
				autoRotate: false,
				autoRotateInterval: 9,
				slides: [
					{ linkUrl: '/topic/1', imageUrl: '/assets/uploads/one.webp', title: 'One', description: 'First' },
					{ linkUrl: '/topic/2', imageUrl: '/assets/uploads/two.webp', title: 'Two', description: '' },
				],
			},
		};

		loadHomepageModule(dom.window);
		dom.window.VariedMCUiHomepage.run();

		const carousel = dom.window.document.querySelector('#carousel.variedmc-home-carousel');
		assert(carousel);
		assert.strictEqual(carousel.tagName, 'DIV');
		assert.strictEqual(carousel.dataset.autoRotate, '0');
		assert.strictEqual(carousel.dataset.autoRotateInterval, '9');
		assert.strictEqual(carousel.querySelectorAll('.variedmc-home-carousel__slide').length, 2);
		assert.strictEqual(carousel.querySelectorAll('.variedmc-home-carousel__dot').length, 2);
		assert.strictEqual(carousel.querySelector('.variedmc-home-carousel__slide').getAttribute('href'), '/topic/1');
		assert.strictEqual(carousel.querySelector('.variedmc-home-carousel__title').textContent, 'One');
	});

	it('retries recent topic placement when widgets render after the first page enhancement', async () => {
		const dom = new JSDOM(`<!doctype html><html><body>
			<div id="home_area">
				<a id="carousel" href="/topic/legacy"></a>
				<div id="recent_area"><div class="head"><h4>最新动态</h4></div></div>
			</div>
		</body></html>`);

		loadHomepageModule(dom.window);
		dom.window.VariedMCUiHomepage.run();
		assert(dom.window.document.querySelector('#recent_area').classList.contains('is-empty'));

		const widgetShell = dom.window.document.createElement('div');
		widgetShell.className = 'widget-shell';
		widgetShell.innerHTML = '<div class="widget-topics-list" data-numtopics="5"><div>recent</div></div>';
		dom.window.document.body.appendChild(widgetShell);
		await new Promise(resolve => dom.window.setTimeout(resolve, 0));

		assert(!dom.window.document.querySelector('#recent_area').classList.contains('is-empty'));
		assert(dom.window.document.querySelector('#recent_area .widget-topics-list[data-numtopics]'));
	});
});

function loadHomepageModule(window) {
	const filename = path.join(__dirname, '..', 'public/js/client/homepage.js');
	const context = {
		window,
		document: window.document,
		MutationObserver: window.MutationObserver,
	};

	vm.createContext(context);
	vm.runInContext(fs.readFileSync(filename, 'utf8'), context, { filename });
}
