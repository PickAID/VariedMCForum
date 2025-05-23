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
	if (!data || !data.postData || !data.postData.content) {
		return data;
	}

	const settings = await meta.settings.get('markdown-toc');
	
	if (settings.enabled !== 'on') {
		return data;
	}

	data.postData.content = await processMarkdownToc(data.postData.content, settings);
	return data;
};

plugin.parseSignature = async (data) => {
	if (!data || !data.userData || !data.userData.signature) {
		return data;
	}

	const settings = await meta.settings.get('markdown-toc');
	
	if (settings.enabled !== 'on' || settings.enableInSignatures !== 'on') {
		return data;
	}

	data.userData.signature = await processMarkdownToc(data.userData.signature, settings);
	return data;
};

async function processMarkdownToc(content, settings) {
	const tocMarker = settings.tocMarker || '[TOC]';
	
	if (!content.includes(tocMarker)) {
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
			return content.replace(tocMarker, '');
		}

		const tocTitle = settings.tocTitle || 'Table of Contents';
		let tocHtml = `<div class="markdown-toc">
			<div class="toc-title">${tocTitle}</div>
			<div class="toc-content">
${tocResult.content}
			</div>
		</div>`;

		return content.replace(tocMarker, tocHtml);
	} catch (err) {
		console.error('Error processing markdown TOC:', err);
		return content.replace(tocMarker, '');
	}
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
