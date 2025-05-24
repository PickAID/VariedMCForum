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
		
		return 'light';
	}

	function applyThemeStyles() {
		const theme = detectTheme();
		
		document.querySelectorAll('.markdown-toc').forEach(function(container) {
			if (!container.classList.contains(`theme-${theme}`)) {
				container.classList.remove('theme-light', 'theme-dark');
				container.classList.add(`theme-${theme}`);
				
				const title = container.querySelector('.toc-title');
				if (title) {
					title.classList.remove('theme-light', 'theme-dark');
					title.classList.add(`theme-${theme}`);
				}
			}
		});
	}

	setTimeout(applyThemeStyles, 100);

	$(window).on('action:ajaxify.end', function () {
		setTimeout(applyThemeStyles, 200);
	});

	const observer = new MutationObserver(function(mutations) {
		let shouldUpdate = false;
		mutations.forEach(function(mutation) {
			if (mutation.type === 'attributes' && 
			   (mutation.attributeName === 'class' || 
				mutation.attributeName === 'data-theme' || 
				mutation.attributeName === 'data-bs-theme')) {
				shouldUpdate = true;
			}
		});
		if (shouldUpdate) {
			setTimeout(applyThemeStyles, 100);
		}
	});
	
	observer.observe(document.body, { attributes: true });
	observer.observe(document.documentElement, { attributes: true });
}); 