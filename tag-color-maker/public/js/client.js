'use strict';

$(document).ready(function () {
	console.log('Tag Color Maker plugin loaded');
	
	let tagColors = {
		'forge': { background: '#DFA86A', color: '#FAF4F3' },
		'neoforge': { background: '#E68C37', color: '#FFFFFF' },
		'fabric': { background: '#DBD0B4', color: '#111111' },
		'kubejs': { background: '#C186E6', color: '#FFFFFF' },
		'unsafe': { background: 'red', color: '#FFFFFF' }
	};
	
	function loadTagColors() {
		if (typeof app !== 'undefined' && app.user && app.user.isAdmin) {
			$.get('/api/admin/plugins/tag-color-maker/settings', function(data) {
				if (data && data.tagColors) {
					try {
						const customColors = JSON.parse(data.tagColors);
						tagColors = Object.assign(tagColors, customColors);
						console.log('Loaded custom tag colors:', customColors);
					} catch (e) {
						console.log('Failed to parse custom colors, using defaults');
					}
				}
				applyTagColors();
			}).fail(function() {
				console.log('Using default tag colors');
				applyTagColors();
			});
		} else {
			applyTagColors();
		}
	}

	function applyTagColors() {
		if (!tagColors || Object.keys(tagColors).length === 0) {
			return;
		}
		
		console.log('Applying tag colors:', tagColors);
		
		$('[data-tag]').each(function() {
			const $tag = $(this);
			const tagName = $tag.data('tag');
			
			if (tagName && tagColors[tagName] && !$tag.hasClass('tag-colored')) {
				const colors = tagColors[tagName];
				
				$tag.addClass('tag-colored').css({
					'background-color': colors.background + ' !important',
					'color': colors.color + ' !important',
					'border-color': colors.background + ' !important'
				});
				
				$tag.find('.tag-topic-count, a, span').css({
					'color': colors.color + ' !important'
				});
			}
		});
		
		$('.tag-list [data-tag], .tags-container [data-tag], .tags [data-tag]').each(function() {
			const $tag = $(this);
			const tagName = $tag.data('tag');
			
			if (tagName && tagColors[tagName] && !$tag.hasClass('tag-colored')) {
				const colors = tagColors[tagName];
				$tag.addClass('tag-colored').css({
					'background-color': colors.background + ' !important',
					'color': colors.color + ' !important',
					'border-color': colors.background + ' !important'
				});
				
				$tag.find('a, span, .tag-topic-count').css({
					'color': colors.color + ' !important'
				});
			}
		});
		
		$('a[href*="/tags/"]').each(function() {
			const $tag = $(this);
			const href = $tag.attr('href');
			if (href && !$tag.hasClass('tag-colored')) {
				const tagName = href.split('/tags/')[1];
				
				if (tagName && tagColors[tagName]) {
					const colors = tagColors[tagName];
					$tag.addClass('tag-colored').css({
						'background-color': colors.background + ' !important',
						'color': colors.color + ' !important',
						'border-color': colors.background + ' !important'
					});
				}
			}
		});
		
		$('.badge[data-tag]').each(function() {
			const $tag = $(this);
			const tagName = $tag.data('tag');
			
			if (tagName && tagColors[tagName]) {
				const colors = tagColors[tagName];
				$tag.addClass('tag-colored').css({
					'background-color': colors.background + ' !important',
					'color': colors.color + ' !important',
					'border-color': colors.background + ' !important'
				});
			}
		});
	}

	loadTagColors();

	$(window).on('action:ajaxify.end', function () {
		setTimeout(applyTagColors, 200);
	});

	$(document).on('DOMNodeInserted', function(e) {
		if (e.target.nodeType === 1 && (
			e.target.hasAttribute('data-tag') || 
			$(e.target).find('[data-tag]').length > 0
		)) {
			setTimeout(applyTagColors, 100);
		}
	});

	const observer = new MutationObserver(function(mutations) {
		let hasNewTags = false;
		mutations.forEach(function(mutation) {
			if (mutation.type === 'childList') {
				mutation.addedNodes.forEach(function(node) {
					if (node.nodeType === 1 && (
						node.hasAttribute('data-tag') || 
						(node.querySelector && node.querySelector('[data-tag]')) ||
						(node.tagName === 'A' && node.href && node.href.includes('/tags/'))
					)) {
						hasNewTags = true;
					}
				});
			}
		});
		if (hasNewTags) {
			setTimeout(applyTagColors, 100);
		}
	});
	
	observer.observe(document.body, {
		childList: true,
		subtree: true
	});
	
	setInterval(applyTagColors, 2000);
	
	window.reloadTagColors = function() {
		loadTagColors();
	};
}); 