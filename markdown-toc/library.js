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
	let parentNode = '';
	let parentObject = {};
	const $ = cheerio.load('<div class="markdown-toc"><div class="toc-title">' + (settings.tocTitle || 'Table of Contents') + '</div><div class="toc-content"></div></div>');
	
	let processedContent = content;
	
	titles.forEach(function (title) {
		const str = title.replace(titleRegexp, '{"num":"$1","id":"$2"}');
		const object = JSON.parse(str);
		const headingLevel = parseInt(object.num);
		
		if (headingLevel > maxDepth) return;
		
		let id = object.id.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '-').toLowerCase();
		
		if (ids.indexOf(id) !== -1) {
			id = id + '-' + ids.length;
		}
		ids.push(id);
		
		processedContent = processedContent.replace(title, '<h' + object.num + ' id="' + id + '">' + object.id + '</h' + object.num + '>');
		const li = '<li><a href="#' + id + '">' + object.id + '</a></li>';
		let i = 1;
		
		if (!parentNode) {
			$('.toc-content').append('<ul></ul>');
			parentNode = $('.toc-content').children().first();
			while (i < headingLevel) {
				parentNode.append('<ul></ul>');
				parentNode = parentNode.children().last();
				i++;
			}
			parentNode.append(li);
			parentNode = parentNode.children().last();
		} else if (parentObject.num == headingLevel) {
			parentNode.append(li);
			parentNode = parentNode.children().last();
		} else {
			parentNode = $('.toc-content').children().first();
			while (i < headingLevel) {
				if (parentNode.children('ul').length === 0) {
					parentNode.append('<ul></ul>');
				}
				parentNode = parentNode.children('ul').last();
				i++;
			}
			parentNode.append(li);
		}
		parentObject = object;
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
