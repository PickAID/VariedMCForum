'use strict';

$(document).ready(function () {
	let tagColors = {};
	let styleElement = null;
	
	function loadTagColors() {
		const defaultColors = {
			'forge': { background: '#DFA86A', color: '#FAF4F3' },
			'neoforge': { background: '#E68C37', color: '#FFFFFF' },
			'fabric': { background: '#DBD0B4', color: '#111111' },
			'kubejs': { background: '#C186E6', color: '#FFFFFF' },
			'unsafe': { background: 'red', color: '#FFFFFF' }
		};
		
		if (window.tagColors) {
			tagColors = window.tagColors;
		} else {
			tagColors = defaultColors;
		}
		
		generateTagColorCSS();
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
	}

	loadTagColors();

	$(window).on('action:ajaxify.end', function () {
		setTimeout(generateTagColorCSS, 100);
	});
	
	window.reloadTagColors = function() {
		loadTagColors();
	};
}); 