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
		if (settings.enabled === 'on') {
			data.postData.content = processMarkdownToc(data.postData.content, settings);
		}
	}
	return data;
};

plugin.parseRaw = async (data) => {
	if (data) {
		const settings = await meta.settings.get('markdown-toc');
		if (settings.enabled === 'on') {
			data = processMarkdownToc(data, settings);
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

		const tocResult = toc(content, tocOptions);
		
		if (!tocResult.content) {
			return content.replace(new RegExp(escapeRegExp(tocMarker), 'gi'), '');
		}

		const tocTitle = settings.tocTitle || 'Table of Contents';
		const tocHtml = `<div class="markdown-toc">
<div class="toc-title">${tocTitle}</div>
<div class="toc-content">
${tocResult.content}
</div>
</div>`;

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
