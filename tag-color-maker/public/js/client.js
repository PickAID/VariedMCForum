'use strict';

$(document).ready(function () {
	console.log('Tag Color Maker plugin loaded');
	
	let tagColors = {};
	let styleElement = null;
	
	function loadTagColors() {
		$.get('/api/admin/plugins/tag-color-maker/settings', function(data) {
			if (data && data.tagColors) {
				try {
					tagColors = JSON.parse(data.tagColors);
					console.log('Loaded tag colors from settings:', tagColors);
				} catch (e) {
					console.log('Failed to parse tag colors, using defaults');
					setDefaultColors();
				}
			} else {
				console.log('No tag colors found, using defaults');
				setDefaultColors();
			}
			generateTagColorCSS();
		}).fail(function() {
			console.log('Failed to load settings, using defaults');
			setDefaultColors();
			generateTagColorCSS();
		});
	}
	
	function setDefaultColors() {
		tagColors = {
			'forge': { background: '#DFA86A', color: '#FAF4F3' },
			'neoforge': { background: '#E68C37', color: '#FFFFFF' },
			'fabric': { background: '#DBD0B4', color: '#111111' },
			'kubejs': { background: '#C186E6', color: '#FFFFFF' },
			'unsafe': { background: 'red', color: '#FFFFFF' }
		};
	}

	function generateTagColorCSS() {
		if (styleElement) {
			styleElement.remove();
		}
		
		if (!tagColors || Object.keys(tagColors).length === 0) {
			return;
		}
		
		let css = '';
		
		Object.keys(tagColors).forEach(function(tagName) {
			const colors = tagColors[tagName];
			
			css += `
[data-tag="${tagName}"] {
	background-color: ${colors.background} !important;
	color: ${colors.color} !important;
}

.tag-list [data-tag="${tagName}"] {
	background-color: ${colors.background} !important;
	color: ${colors.color} !important;
}

[data-tag="${tagName}"] .tag-topic-count {
	color: ${colors.color} !important;
}

.tags-container [data-tag="${tagName}"],
.tags [data-tag="${tagName}"] {
	background-color: ${colors.background} !important;
	color: ${colors.color} !important;
}

a[href*="/tags/${tagName}"] {
	background-color: ${colors.background} !important;
	color: ${colors.color} !important;
}

`;
		});
		
		styleElement = $('<style>').attr('type', 'text/css').attr('id', 'tag-color-maker-styles').html(css);
		$('head').append(styleElement);
		
		console.log('Generated tag color CSS for tags:', Object.keys(tagColors));
	}

	function applyTagColors() {
		if (!tagColors || Object.keys(tagColors).length === 0) {
			return;
		}
		
		$('[data-tag]').each(function() {
			const $tag = $(this);
			const tagName = $tag.data('tag');
			
			if (tagName && tagColors[tagName] && !$tag.hasClass('tag-colored')) {
				const colors = tagColors[tagName];
				
				$tag.addClass('tag-colored').css({
					'background-color': colors.background + ' !important',
					'color': colors.color + ' !important'
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
					$tag.css({
						'background-color': colors.background + ' !important',
						'color': colors.color + ' !important'
					}).addClass('tag-colored');
				}
			}
		});
	}

	loadTagColors();

	$(window).on('action:ajaxify.end', function () {
		setTimeout(function() {
			generateTagColorCSS();
			applyTagColors();
		}, 100);
	});

	$(document).on('DOMNodeInserted', function(e) {
		if (e.target.nodeType === 1 && (
			e.target.hasAttribute('data-tag') || 
			$(e.target).find('[data-tag]').length > 0
		)) {
			setTimeout(generateTagColorCSS, 100);
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
			setTimeout(generateTagColorCSS, 100);
		}
	});
	
	observer.observe(document.body, {
		childList: true,
		subtree: true
	});
	
	setInterval(generateTagColorCSS, 3000);
	
	window.reloadTagColors = function() {
		console.log('Reloading tag colors...');
		loadTagColors();
	};
}); 