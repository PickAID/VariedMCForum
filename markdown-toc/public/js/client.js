'use strict';

$(document).ready(function () {
	console.log('NodeBB Markdown TOC plugin loaded');

	var MarkdownToc = {};

	$(window).on('action:composer.enhanced', function (evt, data) {
		MarkdownToc.prepareFormattingTools();
	});

	MarkdownToc.prepareFormattingTools = async function () {
		const [formatting, controls] = await app.require(['composer/formatting', 'composer/controls']);
		
		if (formatting && controls) {
			formatting.addButtonDispatch('toc', function (textarea, selectionStart, selectionEnd) {
				controls.insertIntoTextarea(textarea, '\n[TOC]\n');
			});
		}
	};

	function detectTheme() {
		const body = document.body;
		const html = document.documentElement;
		
		if (body.classList.contains('dark') || 
			html.getAttribute('data-theme') === 'dark' ||
			html.getAttribute('data-bs-theme') === 'dark') {
			return 'dark';
		}
		
		const linkElement = document.querySelector('link[href*="bootstrap"]');
		if (linkElement) {
			const href = linkElement.href.toLowerCase();
			if (href.includes('darkly') || href.includes('cyborg') || 
				href.includes('slate') || href.includes('superhero') ||
				href.includes('vapor') || href.includes('solar')) {
				return 'dark';
			}
		}
		
		const computedStyle = window.getComputedStyle(body);
		const bgColor = computedStyle.backgroundColor;
		if (bgColor) {
			const rgb = bgColor.match(/\d+/g);
			if (rgb && rgb.length >= 3) {
				const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
				return brightness < 128 ? 'dark' : 'light';
			}
		}
		
		return 'light';
	}

	function applyThemeStyles() {
		const theme = detectTheme();
		
		document.querySelectorAll('.markdown-toc').forEach(function(container) {
			container.classList.remove('theme-light', 'theme-dark');
			container.classList.add(`theme-${theme}`);
			
			const title = container.querySelector('.toc-title');
			if (title) {
				title.classList.remove('theme-light', 'theme-dark');
				title.classList.add(`theme-${theme}`);
			}
		});
	}

	function initTOC() {
		setTimeout(function() {
			applyThemeStyles();
		}, 50);
	}

	function initThemeWatcher() {
		const observer = new MutationObserver(function(mutations) {
			mutations.forEach(function(mutation) {
				if (mutation.type === 'attributes' && 
				   (mutation.attributeName === 'class' || 
					mutation.attributeName === 'data-theme' || 
					mutation.attributeName === 'data-bs-theme')) {
					setTimeout(applyThemeStyles, 50);
				}
			});
		});
		
		observer.observe(document.body, { attributes: true });
		observer.observe(document.documentElement, { attributes: true });
		
		const linkObserver = new MutationObserver(function(mutations) {
			mutations.forEach(function(mutation) {
				mutation.addedNodes.forEach(function(node) {
					if (node.nodeType === 1 && node.tagName === 'LINK' && 
						node.href && node.href.includes('bootstrap')) {
						setTimeout(applyThemeStyles, 100);
					}
				});
			});
		});
		
		linkObserver.observe(document.head, { childList: true });
	}

	initTOC();
	initThemeWatcher();

	$(window).on('action:ajaxify.end', function () {
		setTimeout(function() {
			applyThemeStyles();
		}, 100);
	});
}); 