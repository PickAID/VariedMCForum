'use strict';

(function () {
	require(['markdown', 'components'], (markdown, components) => {
		async function initHljs() {
			if (window.hljs) {
				return;
			}
			console.debug('[plugin/markdown] Initializing highlight.js');
			let hljs;
			let list;
			if (config.markdown.hljsLanguages.includes('common')) {
				({ default: hljs} = await import(`highlight.js/lib/common`));
				list = 'common';
			} else if (config.markdown.hljsLanguages.includes('all')) {
				({ default: hljs} = await import(`highlight.js`));
				list = 'all';
			} else {
				({ default: hljs} = await import(`highlight.js/lib/core`));
				list = 'core';
			}

			console.debug(`[plugins/markdown] Loaded ${list} hljs library`);

			if (list !== 'all') {
				await Promise.all(config.markdown.hljsLanguages.map(async (language) => {
					if (['common', 'all'].includes(language)) {
						return;
					}

					console.debug(`[plugins/markdown] Loading ${language} support`);
					const { default: lang } = await import('../../node_modules/highlight.js/lib/languages/' + language + '.js');
					hljs.registerLanguage(language, lang);
				}));
			}
			window.hljs = hljs;
			markdown.buildAliasMap();
		}

		$(window).on('action:composer.enhanced', function (evt, data) {
			var textareaEl = data.postContainer.find('textarea');
			markdown.capturePaste(textareaEl);
			markdown.prepareFormattingTools();
		});

		$(window).on('action:composer.preview', {
			selector: '.composer .preview pre code',
		}, async (params) => {
			await initHljs();
			markdown.highlight(params);
		});

		$(window).on('action:posts.loaded action:topic.loaded action:posts.edited', async function (ev, data) {
			await initHljs();
			markdown.highlight(components.get('post/content').find('pre code'));
			markdown.enhanceCheckbox(ev, data);
			markdown.markExternalLinks();
		});
	});
}());

$(document).ready(function() {
	function initShikiThemeSwitcher() {
		let darkSkinList = $(`[component="skinSwitcher"] .dropdown-header`).eq(1).parent();
		
		if (darkSkinList.length === 0) {
			setTimeout(initShikiThemeSwitcher, 500);
			return;
		}

		function updateShikiTheme(isDark) {
			if (isDark) {
				document.body.classList.add("dark-theme-shiki");
				document.body.setAttribute("data-theme", "dark");
			} else {
				document.body.classList.remove("dark-theme-shiki");
				document.body.setAttribute("data-theme", "light");
			}
			
			$(".shiki").each(function() {
				const $shiki = $(this);
				if (isDark) {
					$shiki.addClass("dark-theme");
				} else {
					$shiki.removeClass("dark-theme");
				}
			});
		}

		function checkCurrentTheme() {
			return darkSkinList.find(".fa-check").length > darkSkinList.find(".invisible").length;
		}

		updateShikiTheme(checkCurrentTheme());

		$(`[component="skinSwitcher"] li`).click(function(e) {
			setTimeout(function() {
				const isDark = $(e.target).closest('li').parent().find(".dropdown-header").text().trim() === "Dark" ||
							 checkCurrentTheme();
				updateShikiTheme(isDark);
			}, 100);
		});

		$(document).on('action:skin.change', function(ev, data) {
			const isDark = data && data.skin && data.skin.includes('dark');
			updateShikiTheme(isDark);
		});

		const observer = new MutationObserver(function(mutations) {
			mutations.forEach(function(mutation) {
				if (mutation.type === 'attributes' && 
					(mutation.attributeName === 'class' || mutation.attributeName === 'data-bs-theme')) {
					const isDark = document.body.classList.contains('dark') || 
								 document.body.getAttribute('data-bs-theme') === 'dark' ||
								 checkCurrentTheme();
					updateShikiTheme(isDark);
				}
			});
		});

		observer.observe(document.body, {
			attributes: true,
			attributeFilter: ['class', 'data-bs-theme']
		});
	}

	function enhanceShikiBlocks() {
		$('.shiki').each(function() {
			const $block = $(this);
			const $pre = $block.find('pre').length ? $block.find('pre') : $block;
			
			if ($block.hasClass('line-numbers')) {
				$block.find('.line').each(function(index) {
					const $line = $(this);
					if (!$line.attr('data-line')) {
						$line.attr('data-line', index + 1);
					}
				});
			}

			$block.on('mouseenter', function() {
				if ($block.hasClass('has-focused-lines')) {
					$block.find('.line.blurred').removeClass('blurred-hover');
				}
			});

			$block.on('mouseleave', function() {
				if ($block.hasClass('has-focused-lines')) {
					$block.find('.line').addClass('blurred-hover');
				}
			});
		});
	}

	function initShikiFeatures() {
		enhanceShikiBlocks();
		
		$(document).on('DOMNodeInserted', function(e) {
			if ($(e.target).find('.shiki').length || $(e.target).hasClass('shiki')) {
				enhanceShikiBlocks();
			}
		});

		if (typeof MutationObserver !== 'undefined') {
			const observer = new MutationObserver(function(mutations) {
				mutations.forEach(function(mutation) {
					if (mutation.addedNodes.length) {
						$(mutation.addedNodes).find('.shiki').each(function() {
							enhanceShikiBlocks();
						});
					}
				});
			});

			observer.observe(document.body, {
				childList: true,
				subtree: true
			});
		}
	}

	initShikiThemeSwitcher();
	initShikiFeatures();
});
