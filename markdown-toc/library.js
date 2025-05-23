'use strict';

const toc = require('markdown-toc');
const meta = require.main.require('./src/meta');
const controllers = require('./lib/controllers');
const routeHelpers = require.main.require('./src/routes/helpers');

const plugin = {};

plugin.init = async (params) => {
	const { router } = params;
	routeHelpers.setupAdminPageRoute(router, '/admin/plugins/markdown-toc', controllers.renderAdminPage);
};

plugin.parsePost = async (data) => {
	if (data && data.postData && data.postData.content) {
		const settings = await meta.settings.get('markdown-toc');
		console.log('parsePost settings:', settings);
		if (settings.enabled === 'on') {
			const originalContent = data.postData.content;
			data.postData.content = processMarkdownToc(data.postData.content, settings);
			console.log('parsePost processed:', originalContent !== data.postData.content);
		}
	}
	return data;
};

plugin.parseRaw = async (data) => {
	if (data) {
		const settings = await meta.settings.get('markdown-toc');
		console.log('parseRaw settings:', settings);
		if (settings.enabled === 'on') {
			const originalData = data;
			data = processMarkdownToc(data, settings);
			console.log('parseRaw processed:', originalData !== data);
		}
	}
	return data;
};

plugin.registerFormatting = async (payload) => {
	const formatting = [
		{ 
			name: "toc", 
			className: "fa fa-list-ol", 
			title: "插入目录" 
		}
	];

	payload.options = payload.options.concat(formatting);
	return payload;
};

function processMarkdownToc(content, settings) {
	const tocMarker = settings.tocMarker || '[TOC]';
	console.log('Processing content with marker:', tocMarker);
	console.log('Content includes marker:', content.toLowerCase().includes(tocMarker.toLowerCase()));
	
	if (!content.toLowerCase().includes(tocMarker.toLowerCase())) {
		return content;
	}

	try {
		const tocOptions = {
			maxdepth: parseInt(settings.maxDepth) || 6,
			firsth1: settings.firsth1 === 'on',
			stripHeadingTags: settings.stripHeadingTags === 'on',
			bullets: settings.bullets || '*'
		};

		console.log('TOC options:', tocOptions);
		const tocResult = toc(content, tocOptions);
		console.log('TOC result:', tocResult);
		
		if (!tocResult.content) {
			console.log('No TOC content generated');
			return content.replace(new RegExp(escapeRegExp(tocMarker), 'gi'), '');
		}

		const tocTitle = settings.tocTitle || 'Table of Contents';
		const tocHtml = `<div class="markdown-toc">
<div class="toc-title">${tocTitle}</div>
<div class="toc-content">
${tocResult.content}
</div>
</div>`;

		console.log('Generated TOC HTML:', tocHtml);
		return content.replace(new RegExp(escapeRegExp(tocMarker), 'gi'), tocHtml);
	} catch (err) {
		console.error('Error processing markdown TOC:', err);
		return content.replace(new RegExp(escapeRegExp(tocMarker), 'gi'), '');
	}
}

function escapeRegExp(string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

plugin.addAdminNavigation = (header) => {
	header.plugins.push({
		route: '/plugins/markdown-toc',
		icon: 'fa-list-ol',
		name: 'Markdown TOC',
	});
	return header;
};

module.exports = plugin;
