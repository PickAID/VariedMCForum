'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { JSDOM } = require('jsdom');

describe('VariedMC UI pinned topic title cleanup', () => {
	it('strips bracket labels only from recentCards pinned links', () => {
		const dom = new JSDOM(`<!doctype html><html><body>
			<div class="page-category">
				<div data-widget-area="header">
					<div class="recent-cards-plugin">
						<div class="recent-cards invisible overflow-hidden" style="width: 1px;">
							<div class="recent-card-container">
								<h6 class="topic-title"><a href="/topic/1">【置顶】论坛须知</a></h6>
							</div>
						</div>
					</div>
				</div>
			</div>
			<li component="category/topic" class="pinned">
				<h2 component="topic/header"><a href="/topic/2">【发帖必读】普通置顶</a></h2>
			</li>
		</body></html>`);

		loadPinnedModule(dom.window);
		dom.window.VariedMCUiPinnedTopics.run();

		assert.strictEqual(
			dom.window.document.querySelector('.recent-cards-plugin .topic-title a').textContent,
			'论坛须知'
		);
		assert.strictEqual(
			dom.window.document.querySelector('[component="category/topic"].pinned [component="topic/header"] a').textContent,
			'【发帖必读】普通置顶'
		);
		assert(
			dom.window.document.querySelector('.recent-cards-plugin').classList.contains('variedmc-pinned-rail')
		);
		assert(
			dom.window.document.querySelector('.recent-cards').classList.contains('invisible')
		);
	});
});

function loadPinnedModule(window) {
	const filename = path.join(__dirname, '..', 'public/js/client/pinned-topics.js');
	const context = {
		window,
		document: window.document,
	};

	vm.createContext(context);
	vm.runInContext(fs.readFileSync(filename, 'utf8'), context, { filename });
}
