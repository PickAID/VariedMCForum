'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { JSDOM } = require('jsdom');

describe('VariedMC UI theme bridge', () => {
	it('uses Bootstrap data-bs-theme without requiring the skin switcher', () => {
		const dom = new JSDOM('<!doctype html><html data-bs-theme="dark"><body></body></html>', {
			url: 'https://varied.test/',
		});

		loadThemeModule(dom.window);
		dom.window.VariedMCUiTheme.sync();

		assert(dom.window.document.body.classList.contains('dark-theme-fix'));
	});

	it('falls back to the NodeBB skin switcher state', () => {
		const dom = new JSDOM(`<!doctype html><html><body>
			<ul component="skinSwitcher">
				<li>
					<h6 class="dropdown-header">Dark</h6>
					<i class="fa fa-check"></i>
				</li>
			</ul>
		</body></html>`, { url: 'https://varied.test/' });

		loadThemeModule(dom.window);
		dom.window.VariedMCUiTheme.sync();

		assert(dom.window.document.body.classList.contains('dark-theme-fix'));
	});
});

function loadThemeModule(window) {
	const filename = path.join(__dirname, '..', 'public/js/client/theme.js');
	const context = {
		window,
		document: window.document,
		MutationObserver: window.MutationObserver,
	};

	vm.createContext(context);
	vm.runInContext(fs.readFileSync(filename, 'utf8'), context, { filename });
}
