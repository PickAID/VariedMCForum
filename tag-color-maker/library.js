'use strict';

const cheerio = require('cheerio');
const meta = require.main.require('./src/meta');
const controllers = require('./lib/controllers');
const routeHelpers = require.main.require('./src/routes/helpers');

const plugin = {};

const defaultTagColors = {
	forge: { background: '#DFA86A', color: '#FAF4F3' },
	neoforge: { background: '#E68C37', color: '#FFFFFF' },
	fabric: { background: '#DBD0B4', color: '#111111' },
	kubejs: { background: '#C186E6', color: '#FFFFFF' },
	unsafe: { background: 'red', color: '#FFFFFF' }
};

plugin.init = async (params) => {
	const { router } = params;
	routeHelpers.setupAdminPageRoute(router, '/admin/plugins/tag-color-maker', controllers.renderAdminPage);
	
	await initializeDefaultColors();
};

async function initializeDefaultColors() {
	const settings = await meta.settings.get('tag-color-maker');
	if (!settings.initialized) {
		await meta.settings.set('tag-color-maker', {
			...settings,
			tagColors: JSON.stringify(defaultTagColors),
			initialized: 'true'
		});
	}
}

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
		
		let id = headingText
			.replace(/<[^>]*>/g, '')
			.replace(/[^a-zA-Z0-9\u4e00-\u9fa5\s]/g, '')
			.replace(/\s+/g, '-')
			.toLowerCase();
		
		if (!id) id = 'heading-' + ids.length;
		
		if (ids.indexOf(id) !== -1) {
			id = id + '-' + ids.length;
		}
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
		
		currentUl.append('<li><a href="#' + id + '">' + headingText + '</a></li>');
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
		route: '/plugins/tag-color-maker',
		icon: 'fa-tags',
		name: '标签颜色管理',
	});
	return header;
};

plugin.addTagColors = async (data) => {
	const settings = await meta.settings.get('tag-color-maker');
	let tagColors = {};
	
	try {
		tagColors = JSON.parse(settings.tagColors || '{}');
	} catch (e) {
		tagColors = defaultTagColors;
	}
	
	let css = '';
	
	Object.keys(tagColors).forEach(tag => {
		const colors = tagColors[tag];
		css += `
[data-tag="${tag}"],
.tag[data-tag="${tag}"],
.tag-item[data-tag="${tag}"],
.badge[data-tag="${tag}"] {
    background-color: ${colors.background} !important;
    color: ${colors.color} !important;
    border-color: ${colors.background} !important;
}

.tag-list [data-tag="${tag}"],
.tags-container [data-tag="${tag}"] {
    background-color: ${colors.background} !important;
    color: ${colors.color} !important;
}

[data-tag="${tag}"] .tag-topic-count,
[data-tag="${tag}"] a,
[data-tag="${tag}"] span {
    color: ${colors.color} !important;
}

.tag-item[data-tag="${tag}"] a:hover {
    color: ${colors.color} !important;
    opacity: 0.8;
}
`;
	});
	
	if (css) {
		data.templateData.customCSS = (data.templateData.customCSS || '') + css;
		data.templateData.tagColorsData = JSON.stringify(tagColors);
	}
	
	return data;
};

plugin.addTagColorsToHead = async (data) => {
	const settings = await meta.settings.get('tag-color-maker');
	let tagColors = {};
	
	try {
		tagColors = JSON.parse(settings.tagColors || '{}');
	} catch (e) {
		tagColors = defaultTagColors;
	}
	
	data.templateData.tagColors = JSON.stringify(tagColors);
	return data;
};

module.exports = plugin;
