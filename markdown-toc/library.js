'use strict';

const cheerio = require('cheerio');
const meta = require.main.require('./src/meta');
const controllers = require('./lib/controllers');
const routeHelpers = require.main.require('./src/routes/helpers');
const slugify = require.main.require('./src/slugify');

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
	if (!content) return content;
	
	const tocMarker = settings.tocMarker || '[TOC]';
	const titleRegexp = /<h([1-6])>(.*?)<\/h[1-6]>/gm;
	const tocRegexp = new RegExp(escapeRegExp(tocMarker), 'gi');
	
	const titles = content.match(titleRegexp);
	const toc = content.match(tocRegexp);
	
	if (!titles || !titles.length || !toc || !toc.length) {
		return content;
	}
	
	const maxDepth = parseInt(settings.maxDepth) || 6;
	const ids = [];
	let processedContent = content;
	let tocHtml = '';
	
	// 生成目录HTML
	tocHtml += '<div class="markdown-toc">';
	tocHtml += '<div class="toc-title">' + (settings.tocTitle || 'Table of Contents') + '</div>';
	tocHtml += '<div class="toc-content"><ul>';
	
	titles.forEach(function (title) {
		const match = title.match(/<h([1-6])>(.*?)<\/h[1-6]>/);
		if (!match) return;
		
		const headingLevel = parseInt(match[1]);
		const headingText = match[2];
		
		if (headingLevel > maxDepth) return;
		
		// 生成唯一的ID
		let id = slugify(headingText.replace(/<[^>]*>/g, ''));
		
		if (!id) id = 'heading-' + ids.length;
		
		// 确保ID唯一
		let uniqueId = id;
		let counter = 1;
		while (ids.indexOf(uniqueId) !== -1) {
			uniqueId = id + '-' + counter;
			counter++;
		}
		ids.push(uniqueId);
		
		// 为标题添加ID
		const newTitle = '<h' + headingLevel + ' id="' + uniqueId + '">' + headingText + '</h' + headingLevel + '>';
		processedContent = processedContent.replace(title, newTitle);
		
		// 添加到目录
		const indent = '  '.repeat(headingLevel - 1);
		tocHtml += indent + '<li class="toc-h' + headingLevel + '"><a href="#' + uniqueId + '">' + headingText.replace(/<[^>]*>/g, '') + '</a></li>';
	});
	
	tocHtml += '</ul></div></div>';
	
	// 替换TOC标记
	processedContent = processedContent.replace(tocRegexp, tocHtml);
	return processedContent;
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
