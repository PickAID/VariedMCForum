'use strict';

const SocketPlugins = require.main.require('./src/socket.io/plugins');
const routeHelpers = require.main.require('./src/routes/helpers');
const validator = require.main.require('validator');

const plugin = module.exports;
const settings = require('./lib/settings');

const defaultWidgetData = Object.freeze(settings.getDefaults());

plugin.init = async function ({ router }) {
	SocketPlugins.variedmcUi = require('./lib/sockets');
	routeHelpers.setupAdminPageRoute(router, '/admin/plugins/variedmc-ui', require('./lib/controllers').renderAdminPage);
	await settings.get();
};

plugin.defineWidgets = async function (widgets) {
	widgets.push({
		widget: 'variedmcHomeHero',
		name: 'VariedMC Home Hero',
		description: 'Homepage carousel shell and recent-topics dock used by VariedMCForum.',
		content: buildWidgetForm(),
	});

	return widgets;
};

plugin.renderHomeHeroWidget = async function (widget) {
	const data = normalizeWidgetData(await settings.get());

	widget.html = await widget.req.app.renderAsync('widgets/variedmc-home-hero', data);
	return widget;
};

plugin.addAdminNavigation = async function (header) {
	header.plugins.push({
		route: '/plugins/variedmc-ui',
		icon: 'fa-images',
		name: 'VariedMC UI',
	});

	return header;
};

function normalizeWidgetData(data = {}) {
	const sourceSlides = Array.isArray(data.slides) && data.slides.length ? data.slides : defaultWidgetData.slides;
	const slides = sourceSlides.map((slide, index) => normalizeSlide(slide, index)).filter(Boolean);
	const autoRotateEnabled = data.autoRotate !== false;
	const autoRotateInterval = normalizeInterval(data.autoRotateInterval, defaultWidgetData.autoRotateInterval);

	return {
		slides,
		hasMultipleSlides: slides.length > 1,
		autoRotate: autoRotateEnabled,
		autoRotateAttr: escapeAttribute(autoRotateEnabled ? '1' : '0'),
		autoRotateInterval,
		autoRotateIntervalAttr: escapeAttribute(String(autoRotateInterval)),
		recentTitle: escapeText(data.recentTitle || defaultWidgetData.recentTitle),
		recentLinkUrl: escapeAttribute(data.recentLinkUrl || defaultWidgetData.recentLinkUrl),
		recentLinkLabel: escapeText(data.recentLinkLabel || defaultWidgetData.recentLinkLabel),
		tagsTitle: escapeText(data.tagsTitle || defaultWidgetData.tagsTitle),
		categoriesTitle: escapeText(data.categoriesTitle || defaultWidgetData.categoriesTitle),
	};
}

function normalizeSlide(slide, index) {
	const imageUrl = String(slide && slide.imageUrl || '').trim();
	if (!imageUrl) {
		return null;
	}

	const rawTitle = String(slide && slide.title || '').trim();
	const rawDescription = String(slide && slide.description || '').trim();

	return {
		index,
		active: index === 0,
		linkUrl: escapeAttribute(String(slide && slide.linkUrl || '').trim() || '#'),
		imageUrl: escapeAttribute(imageUrl),
		title: escapeText(rawTitle),
		description: escapeText(rawDescription),
		hasOverlay: !!(rawTitle || rawDescription),
		ariaLabel: escapeAttribute(rawTitle || `Carousel Slide ${index + 1}`),
		dotLabel: escapeAttribute(String(index + 1)),
	};
}

function escapeText(value) {
	return validator.escape(String(value || ''));
}

function escapeAttribute(value) {
	return validator.escape(String(value || ''));
}

function normalizeInterval(value, fallback) {
	const parsed = parseInt(value, 10);
	if (!Number.isFinite(parsed)) {
		return fallback;
	}

	return Math.min(60, Math.max(2, parsed));
}

function buildWidgetForm() {
	return `
		<div class="alert alert-light mb-0">
			This widget is repository-managed. Use ACP -> Plugins -> VariedMC UI to edit carousel slides and section titles.
		</div>
	`;
}
