(function () {
	'use strict';

	let carouselCleanup = null;

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
