(function () {
	'use strict';

	let carouselCleanup = null;
	const defaultSlide = {
		linkUrl: '/topic/11',
		imageUrl: '/assets/uploads/system/carousel.webp',
		title: '',
		description: '',
	};

	function run() {
		enhanceHomePage();
		initCarousel();
	}

	function enhanceHomePage() {
		const homeArea = document.querySelector('#home_area');
		destroyCarousel();
		if (!homeArea) {
			return;
		}

		upgradeLegacyCarousel(homeArea);
		injectCategoriesHeading(homeArea);
		const recentArea = document.querySelector('#recent_area');
		const recentWidget = findRecentTopicsWidget();
		if (!recentArea) {
			return;
		}
		if (!recentWidget) {
			recentArea.classList.add('is-empty');
			return;
		}
		recentArea.classList.remove('is-empty');
		if (recentWidget.parentElement !== recentArea) {
			recentArea.appendChild(recentWidget);
		}
	}

	function injectCategoriesHeading(homeArea) {
		const categoriesList = document.querySelector('.categories-list');
		if (!categoriesList || categoriesList.querySelector('.variedmc-home-categories-heading')) {
			return;
		}

		const wrapper = document.createElement('div');
		wrapper.className = 'variedmc-home-categories-heading';

		const heading = document.createElement('h4');
		heading.textContent = homeArea.dataset.categoriesTitle || '所有板块';

		const divider = document.createElement('hr');
		wrapper.appendChild(heading);
		wrapper.appendChild(divider);
		categoriesList.prepend(wrapper);
	}

	function findRecentTopicsWidget() {
		const mounted = document.querySelector('#recent_area #recent_topics');
		if (mounted) {
			return mounted.parentElement;
		}

		const recentTopicsList = document.querySelector('.widget-topics-list[data-numtopics]');
		if (!recentTopicsList) {
			return null;
		}
		if (recentTopicsList.id !== 'recent_topics') {
			recentTopicsList.id = 'recent_topics';
		}
		return recentTopicsList.parentElement;
	}

	function upgradeLegacyCarousel(homeArea) {
		const legacyCarousel = homeArea.querySelector('#carousel:not(.variedmc-home-carousel)');
		if (!legacyCarousel) {
			return;
		}

		const config = getPublicConfig();
		const slides = normalizeSlides(config.slides, legacyCarousel);
		const carousel = buildCarousel({
			slides,
			autoRotate: normalizeBoolean(config.autoRotate, true),
			autoRotateInterval: normalizeIntervalSeconds(config.autoRotateInterval, 6),
		});

		legacyCarousel.replaceWith(carousel);
	}

	function getPublicConfig() {
		return window.config && window.config.variedmcUi && typeof window.config.variedmcUi === 'object' ?
			window.config.variedmcUi :
			{};
	}

	function normalizeSlides(slides, legacyCarousel) {
		const fallbackLink = getTrimmedString(legacyCarousel.getAttribute('href')) || defaultSlide.linkUrl;
		const normalized = Array.isArray(slides) ?
			slides.map(slide => normalizeSlideConfig(slide, fallbackLink)).filter(Boolean) :
			[];

		if (normalized.length) {
			return normalized;
		}

		return [{
			...defaultSlide,
			linkUrl: fallbackLink,
			imageUrl: getLegacyBackgroundImage(legacyCarousel) || defaultSlide.imageUrl,
		}];
	}

	function normalizeSlideConfig(slide, fallbackLink) {
		if (!slide || typeof slide !== 'object') {
			return null;
		}

		const imageUrl = getTrimmedString(slide.imageUrl || slide.src || slide.image);
		if (!imageUrl) {
			return null;
		}

		return {
			linkUrl: getTrimmedString(slide.linkUrl || slide.topicUrl || slide.url || slide.href) || fallbackLink || '#',
			imageUrl,
			title: getTrimmedString(slide.title || slide.label || slide.alt),
			description: getTrimmedString(slide.description || slide.caption || slide.subtitle),
		};
	}

	function buildCarousel({ slides, autoRotate, autoRotateInterval }) {
		const carousel = document.createElement('div');
		carousel.id = 'carousel';
		carousel.className = 'variedmc-home-carousel';
		carousel.dataset.autoRotate = autoRotate ? '1' : '0';
		carousel.dataset.autoRotateInterval = String(autoRotateInterval);

		const viewport = document.createElement('div');
		viewport.className = 'variedmc-home-carousel__viewport';
		slides.forEach((slide, index) => viewport.appendChild(buildSlide(slide, index)));
		carousel.appendChild(viewport);

		if (slides.length > 1) {
			carousel.appendChild(buildControl('prev-slide', 'Previous slide', '‹', 'variedmc-home-carousel__control--prev'));
			carousel.appendChild(buildControl('next-slide', 'Next slide', '›', 'variedmc-home-carousel__control--next'));
			carousel.appendChild(buildDots(slides));
		}

		return carousel;
	}

	function buildSlide(slide, index) {
		const hasOverlay = !!(slide.title || slide.description);
		const anchor = document.createElement('a');
		anchor.className = `variedmc-home-carousel__slide${index === 0 ? ' is-active' : ''}${hasOverlay ? ' has-overlay' : ''}`;
		anchor.href = slide.linkUrl || '#';
		anchor.dataset.slideIndex = String(index);
		anchor.setAttribute('aria-label', slide.title || `Carousel Slide ${index + 1}`);
		setBackgroundImage(anchor, slide.imageUrl);

		if (hasOverlay) {
			const overlay = document.createElement('span');
			overlay.className = 'variedmc-home-carousel__overlay';
			if (slide.title) {
				const title = document.createElement('strong');
				title.className = 'variedmc-home-carousel__title';
				title.textContent = slide.title;
				overlay.appendChild(title);
			}
			if (slide.description) {
				const description = document.createElement('span');
				description.className = 'variedmc-home-carousel__description';
				description.textContent = slide.description;
				overlay.appendChild(description);
			}
			anchor.appendChild(overlay);
		} else {
			const hiddenLabel = document.createElement('span');
			hiddenLabel.className = 'visually-hidden';
			hiddenLabel.textContent = `Carousel Slide ${index + 1}`;
			anchor.appendChild(hiddenLabel);
		}

		return anchor;
	}

	function buildControl(action, label, symbol, modifierClass) {
		const button = document.createElement('button');
		button.type = 'button';
		button.className = `variedmc-home-carousel__control ${modifierClass}`;
		button.dataset.action = action;
		button.setAttribute('aria-label', label);

		const icon = document.createElement('span');
		icon.setAttribute('aria-hidden', 'true');
		icon.textContent = symbol;
		button.appendChild(icon);

		return button;
	}

	function buildDots(slides) {
		const dots = document.createElement('div');
		dots.className = 'variedmc-home-carousel__dots';
		dots.setAttribute('role', 'tablist');
		dots.setAttribute('aria-label', 'Carousel Pagination');

		slides.forEach((slide, index) => {
			const dot = document.createElement('button');
			dot.type = 'button';
			dot.className = `variedmc-home-carousel__dot${index === 0 ? ' is-active' : ''}`;
			dot.dataset.slideTo = String(index);
			dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
			dots.appendChild(dot);
		});

		return dots;
	}

	function getLegacyBackgroundImage(legacyCarousel) {
		const inlineBackground = extractBackgroundUrl(legacyCarousel.style && legacyCarousel.style.backgroundImage);
		if (inlineBackground) {
			return inlineBackground;
		}
		if (typeof window.getComputedStyle !== 'function') {
			return '';
		}

		return extractBackgroundUrl(window.getComputedStyle(legacyCarousel).backgroundImage);
	}

	function extractBackgroundUrl(backgroundImage) {
		const match = String(backgroundImage || '').match(/^url\(["']?(.+?)["']?\)$/);
		return match ? match[1] : '';
	}

	function setBackgroundImage(element, imageUrl) {
		element.style.backgroundImage = `url("${escapeCssString(imageUrl)}")`;
	}

	function escapeCssString(value) {
		return String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\A ');
	}

	function getTrimmedString(value) {
		return String(value || '').trim();
	}

	function normalizeBoolean(value, fallback) {
		if (typeof value === 'boolean') {
			return value;
		}
		if (typeof value === 'number') {
			return value !== 0;
		}
		if (typeof value === 'string') {
			const normalized = value.trim().toLowerCase();
			if (['1', 'true', 'on', 'yes'].includes(normalized)) {
				return true;
			}
			if (['0', 'false', 'off', 'no'].includes(normalized)) {
				return false;
			}
		}
		return fallback;
	}

	function normalizeIntervalSeconds(value, fallback) {
		const seconds = parseInt(value, 10);
		if (!Number.isFinite(seconds)) {
			return fallback;
		}

		return Math.min(60, Math.max(2, seconds));
	}

	function initCarousel() {
		const carousel = document.querySelector('#carousel.variedmc-home-carousel');
		if (!carousel) {
			return;
		}

		const slides = Array.from(carousel.querySelectorAll('.variedmc-home-carousel__slide'));
		const dots = Array.from(carousel.querySelectorAll('.variedmc-home-carousel__dot'));
		const previousButton = carousel.querySelector('[data-action="prev-slide"]');
		const nextButton = carousel.querySelector('[data-action="next-slide"]');
		const autoRotateEnabled = carousel.dataset.autoRotate !== '0';
		const intervalMs = normalizeInterval(carousel.dataset.autoRotateInterval);
		let currentIndex = Math.max(0, slides.findIndex(slide => slide.classList.contains('is-active')));
		let intervalId = null;

		if (!slides.length) {
			return;
		}

		function setActiveSlide(nextIndex) {
			currentIndex = (nextIndex + slides.length) % slides.length;
			slides.forEach((slide, index) => {
				const active = index === currentIndex;
				slide.classList.toggle('is-active', active);
				slide.setAttribute('aria-hidden', active ? 'false' : 'true');
				slide.tabIndex = active ? 0 : -1;
			});
			dots.forEach((dot, index) => {
				const active = index === currentIndex;
				dot.classList.toggle('is-active', active);
				dot.setAttribute('aria-pressed', active ? 'true' : 'false');
			});
		}

		function stopAutoRotation() {
			if (intervalId) {
				window.clearInterval(intervalId);
				intervalId = null;
			}
		}

		function startAutoRotation() {
			if (!autoRotateEnabled || slides.length <= 1) {
				return;
			}
			stopAutoRotation();
			intervalId = window.setInterval(() => setActiveSlide(currentIndex + 1), intervalMs);
		}

		const goPrevious = () => {
			setActiveSlide(currentIndex - 1);
			startAutoRotation();
		};
		const goNext = () => {
			setActiveSlide(currentIndex + 1);
			startAutoRotation();
		};
		const onDotClick = event => {
			setActiveSlide(parseInt(event.currentTarget.getAttribute('data-slide-to'), 10) || 0);
			startAutoRotation();
		};
		const onVisibilityChange = () => {
			if (document.hidden) {
				stopAutoRotation();
			} else {
				startAutoRotation();
			}
		};

		setActiveSlide(currentIndex);
		if (previousButton) previousButton.addEventListener('click', goPrevious);
		if (nextButton) nextButton.addEventListener('click', goNext);
		dots.forEach(dot => dot.addEventListener('click', onDotClick));
		carousel.addEventListener('mouseenter', stopAutoRotation);
		carousel.addEventListener('mouseleave', startAutoRotation);
		carousel.addEventListener('focusin', stopAutoRotation);
		carousel.addEventListener('focusout', startAutoRotation);
		document.addEventListener('visibilitychange', onVisibilityChange);
		startAutoRotation();

		carouselCleanup = function () {
			stopAutoRotation();
			if (previousButton) previousButton.removeEventListener('click', goPrevious);
			if (nextButton) nextButton.removeEventListener('click', goNext);
			dots.forEach(dot => dot.removeEventListener('click', onDotClick));
			carousel.removeEventListener('mouseenter', stopAutoRotation);
			carousel.removeEventListener('mouseleave', startAutoRotation);
			carousel.removeEventListener('focusin', stopAutoRotation);
			carousel.removeEventListener('focusout', startAutoRotation);
			document.removeEventListener('visibilitychange', onVisibilityChange);
			carouselCleanup = null;
		};
	}

	function destroyCarousel() {
		if (carouselCleanup) {
			carouselCleanup();
		}
	}

	function normalizeInterval(value) {
		const seconds = parseInt(value, 10);
		return Number.isFinite(seconds) ? Math.min(60000, Math.max(2000, seconds * 1000)) : 6000;
	}

	window.VariedMCUiHomepage = { run };
}());
