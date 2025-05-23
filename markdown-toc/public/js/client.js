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
		const tocContainers = document.querySelectorAll('.markdown-toc');
		
		tocContainers.forEach(container => {
			container.classList.remove('theme-light', 'theme-dark');
			container.classList.add(`theme-${theme}`);
		});
	}

	function initTOC() {
		applyThemeStyles();
		
		const observer = new MutationObserver(function(mutations) {
			mutations.forEach(function(mutation) {
				if (mutation.type === 'attributes' && 
					(mutation.attributeName === 'class' || 
					 mutation.attributeName === 'data-theme' || 
					 mutation.attributeName === 'data-bs-theme')) {
					applyThemeStyles();
				}
			});
		});
		
		observer.observe(document.body, { attributes: true });
		observer.observe(document.documentElement, { attributes: true });
	}

	initTOC();

	$(window).on('action:ajaxify.end', function () {
		setTimeout(function() {
			applyThemeStyles();
		}, 100);
	});
}); 