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
}); 