'use strict';

const cheerio = require('cheerio');
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
	const $ = cheerio.load('<div class="markdown-toc"><div class="toc-title">' + (settings.tocTitle || 'Table of Contents') + '</div><div class="toc-content"></div></div>');
	
	let processedContent = content;
	let currentUl = null;
	let lastLevel = 0;
	
	titles.forEach(function (title) {
		const match = title.match(/<h([1-6])>(.*?)<\/h[1-6]>/);
		if (!match) return;
		
		const headingLevel = parseInt(match[1]);
		const headingText = match[2];
		
		if (headingLevel > maxDepth) return;
		
		let id = 'heading-' + ids.length;
		ids.push(id);
		
		processedContent = processedContent.replace(title, '<h' + headingLevel + ' id="' + id + '">' + headingText + '</h' + headingLevel + '>');
		
		const tocContent = $('.toc-content');
		
		if (!currentUl) {
			tocContent.append('<ul></ul>');
			currentUl = tocContent.find('ul').first();
			lastLevel = headingLevel;
		}
		
		if (headingLevel > lastLevel) {
			for (let i = lastLevel; i < headingLevel; i++) {
				if (currentUl.children('li').length === 0) {
					currentUl.append('<li></li>');
				}
				const lastLi = currentUl.children('li').last();
				if (lastLi.children('ul').length === 0) {
					lastLi.append('<ul></ul>');
				}
				currentUl = lastLi.children('ul').last();
			}
		} else if (headingLevel < lastLevel) {
			for (let i = lastLevel; i > headingLevel; i--) {
				currentUl = currentUl.parent().parent();
			}
		}
		
		currentUl.append('<li><a href="#' + id + '">' + headingText.replace(/<[^>]*>/g, '') + '</a></li>');
		lastLevel = headingLevel;
	});
	
	processedContent = processedContent.replace(tocRegexp, $.html());
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
