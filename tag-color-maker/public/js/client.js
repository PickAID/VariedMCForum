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
	
	let styleElement = null;
	
	function loadTagColors() {
		$.get('/api/admin/plugins/tag-color-maker/settings', function(data) {
			if (data && data.tagColors) {
				try {
					const customColors = JSON.parse(data.tagColors);
					if (Object.keys(customColors).length > 0) {
						tagColors = customColors;
						console.log('Loaded custom tag colors:', customColors);
					}
				} catch (e) {
					console.log('Failed to parse custom colors, using defaults');
				}
			}
			generateTagColorCSS();
		}).fail(function() {
			console.log('Using default tag colors');
			generateTagColorCSS();
		});
	}

	function generateTagColorCSS() {
		if (styleElement) {
			styleElement.remove();
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

`;
		});
		
		styleElement = $('<style>').attr('type', 'text/css').html(css);
		$('head').append(styleElement);
		
		console.log('Generated tag color CSS for tags:', Object.keys(tagColors));
	}

	loadTagColors();

	$(window).on('action:ajaxify.end', function () {
		setTimeout(generateTagColorCSS, 200);
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
		loadTagColors();
	};
}); 