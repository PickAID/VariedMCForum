(function () {
	'use strict';

	let bootstrapped = false;
	let scrollScheduled = false;
	let resizeScheduled = false;
	let currentModal = null;
	let currentModalEscHandler = null;
	let carouselCleanup = null;

	function bootstrap() {
		if (bootstrapped) {
			runPageEnhancements();
			return;
		}

		bootstrapped = true;
		document.addEventListener('click', onDocumentClick);
		document.addEventListener('focusin', onFocusIn);
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onResize, { passive: true });

		if (window.jQuery) {
			window.jQuery(window).on('action:ajaxify.end', function () {
				window.setTimeout(runPageEnhancements, 0);
			});
		}

		runPageEnhancements();
	}

	function runPageEnhancements() {
		mergeLoggedInMenu();
		syncMobileBodyClass();
		syncDarkThemeFix();
		enforceFullnameLimit();
		enhanceHomePage();
		initHomeCarousel();
		syncBetterToc();
	}

	function onDocumentClick(event) {
		const skinSwitcherItem = event.target.closest('[component="skinSwitcher"] li');
		if (skinSwitcherItem) {
			window.setTimeout(syncDarkThemeFix, 50);
		}

		if (currentModal && event.target === currentModal) {
			closeModal();
			return;
		}

		const link = event.target.closest('a[href]');
		if (!link) {
			return;
		}

		const image = link.querySelector('img');
		if (!image) {
			return;
		}

		if (!/\.(avif|gif|jpe?g|png|webp)(?:\?.*)?$/i.test(link.href)) {
			return;
		}

		event.preventDefault();
		openModal(link.href, image.alt || 'Image');
	}

	function onFocusIn(event) {
		if (event.target && event.target.id === 'fullname') {
			applyFullnameLimit(event.target);
		}
	}

	function onScroll() {
		if (scrollScheduled) {
			return;
		}

		scrollScheduled = true;
		window.requestAnimationFrame(function () {
			scrollScheduled = false;
			syncBetterToc();
		});
	}

	function onResize() {
		if (resizeScheduled) {
			return;
		}

		resizeScheduled = true;
		window.requestAnimationFrame(function () {
			resizeScheduled = false;
			syncMobileBodyClass();
			syncBetterToc();
		});
	}

	function openModal(src, alt) {
		closeModal();

		const overlay = document.createElement('div');
		overlay.className = 'image-modal-overlay';
		overlay.style.display = 'flex';

		const content = document.createElement('div');
		content.className = 'image-modal-content';

		const img = document.createElement('img');
		img.src = src;
		img.alt = alt || 'Image';
		img.className = 'modal-image';

		content.appendChild(img);
		overlay.appendChild(content);
		document.body.appendChild(overlay);

		currentModal = overlay;
		currentModalEscHandler = function (event) {
			if (event.key === 'Escape') {
				closeModal();
			}
		};

		document.addEventListener('keydown', currentModalEscHandler);
	}

	function closeModal() {
		if (currentModal) {
			currentModal.remove();
			currentModal = null;
		}

		if (currentModalEscHandler) {
			document.removeEventListener('keydown', currentModalEscHandler);
			currentModalEscHandler = null;
		}
	}

	function mergeLoggedInMenu() {
		const loggedInMenu = document.querySelector('#logged-in-menu');
		const mainNav = document.querySelector('#main-nav');

		if (!loggedInMenu || !mainNav) {
			return;
		}

		while (loggedInMenu.firstElementChild) {
			const item = loggedInMenu.firstElementChild;
			if (item.id === 'user_label') {
				mainNav.prepend(item);
			} else {
				mainNav.append(item);
			}
		}
	}

	function enhanceHomePage() {
		const homeArea = document.querySelector('#home_area');
		destroyHomeCarousel();

		if (!homeArea) {
			return;
		}

		const recentArea = document.querySelector('#recent_area');
		const recentWidget = findRecentTopicsWidget();

		const categoriesList = document.querySelector('.categories-list');
		if (categoriesList && !categoriesList.querySelector('.variedmc-home-categories-heading')) {
			const wrapper = document.createElement('div');
			wrapper.className = 'variedmc-home-categories-heading';

			const heading = document.createElement('h4');
			heading.textContent = homeArea.dataset.categoriesTitle || '所有板块';

			const divider = document.createElement('hr');
			wrapper.appendChild(heading);
			wrapper.appendChild(divider);
			categoriesList.prepend(wrapper);
		}

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

	function initHomeCarousel() {
		const carousel = document.querySelector('#carousel.variedmc-home-carousel');
		if (!carousel) {
			return;
		}

		const slides = Array.from(carousel.querySelectorAll('.variedmc-home-carousel__slide'));
		const dots = Array.from(carousel.querySelectorAll('.variedmc-home-carousel__dot'));
		const previousButton = carousel.querySelector('[data-action="prev-slide"]');
		const nextButton = carousel.querySelector('[data-action="next-slide"]');
		const autoRotateEnabled = carousel.dataset.autoRotate !== '0';
		const autoRotateInterval = normalizeCarouselInterval(carousel.dataset.autoRotateInterval);
		let currentIndex = slides.findIndex(slide => slide.classList.contains('is-active'));
		let intervalId = null;

		if (!slides.length) {
			return;
		}

		if (currentIndex < 0) {
			currentIndex = 0;
		}

		function setActiveSlide(nextIndex) {
			currentIndex = (nextIndex + slides.length) % slides.length;

			slides.forEach(function (slide, index) {
				const active = index === currentIndex;
				slide.classList.toggle('is-active', active);
				slide.setAttribute('aria-hidden', active ? 'false' : 'true');
				slide.tabIndex = active ? 0 : -1;
			});

			dots.forEach(function (dot, index) {
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
			intervalId = window.setInterval(function () {
				setActiveSlide(currentIndex + 1);
			}, autoRotateInterval);
		}

		function goPrevious() {
			setActiveSlide(currentIndex - 1);
			startAutoRotation();
		}

		function goNext() {
			setActiveSlide(currentIndex + 1);
			startAutoRotation();
		}

		function onDotClick(event) {
			const targetIndex = parseInt(event.currentTarget.getAttribute('data-slide-to'), 10);
			if (!Number.isFinite(targetIndex)) {
				return;
			}

			setActiveSlide(targetIndex);
			startAutoRotation();
		}

		function onFocusOut() {
			if (!carousel.contains(document.activeElement)) {
				startAutoRotation();
			}
		}

		function onVisibilityChange() {
			if (document.hidden) {
				stopAutoRotation();
			} else {
				startAutoRotation();
			}
		}

		setActiveSlide(currentIndex);

		if (previousButton) {
			previousButton.addEventListener('click', goPrevious);
		}

		if (nextButton) {
			nextButton.addEventListener('click', goNext);
		}

		dots.forEach(function (dot) {
			dot.addEventListener('click', onDotClick);
		});

		carousel.addEventListener('mouseenter', stopAutoRotation);
		carousel.addEventListener('mouseleave', startAutoRotation);
		carousel.addEventListener('focusin', stopAutoRotation);
		carousel.addEventListener('focusout', onFocusOut);
		document.addEventListener('visibilitychange', onVisibilityChange);

		startAutoRotation();

		carouselCleanup = function () {
			stopAutoRotation();

			if (previousButton) {
				previousButton.removeEventListener('click', goPrevious);
			}

			if (nextButton) {
				nextButton.removeEventListener('click', goNext);
			}

			dots.forEach(function (dot) {
				dot.removeEventListener('click', onDotClick);
			});

			carousel.removeEventListener('mouseenter', stopAutoRotation);
			carousel.removeEventListener('mouseleave', startAutoRotation);
			carousel.removeEventListener('focusin', stopAutoRotation);
			carousel.removeEventListener('focusout', onFocusOut);
			document.removeEventListener('visibilitychange', onVisibilityChange);
			carouselCleanup = null;
		};
	}

	function destroyHomeCarousel() {
		if (carouselCleanup) {
			carouselCleanup();
		}
	}

	function normalizeCarouselInterval(value) {
		const parsedSeconds = parseInt(value, 10);
		if (!Number.isFinite(parsedSeconds)) {
			return 6000;
		}

		return Math.min(60000, Math.max(2000, parsedSeconds * 1000));
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

	function syncDarkThemeFix() {
		const root = document.querySelector('[component="skinSwitcher"]');
		if (!root) {
			return;
		}

		const darkHeader = Array.from(root.querySelectorAll('.dropdown-header'))
			.find(node => node.textContent.trim().toLowerCase() === 'dark');

		if (!darkHeader || !darkHeader.parentElement) {
			return;
		}

		const darkGroup = darkHeader.parentElement;
		const checkedCount = darkGroup.querySelectorAll('.fa-check').length;
		const hiddenCount = darkGroup.querySelectorAll('.invisible').length;
		document.body.classList.toggle('dark-theme-fix', checkedCount > hiddenCount);
	}

	function syncMobileBodyClass() {
		document.body.classList.toggle('mobile-bb', window.matchMedia('(max-width: 991px)').matches || isMobileUserAgent());
	}

	function enforceFullnameLimit() {
		const fullname = document.getElementById('fullname');
		if (fullname) {
			applyFullnameLimit(fullname);
		}
	}

	function applyFullnameLimit(input) {
		input.maxLength = 11;
		const trimValue = function () {
			input.value = String(input.value || '').slice(0, 11);
		};

		trimValue();
		input.removeEventListener('input', input._variedmcTrimHandler);
		input.removeEventListener('change', input._variedmcTrimHandler);
		input._variedmcTrimHandler = trimValue;
		input.addEventListener('input', input._variedmcTrimHandler);
		input.addEventListener('change', input._variedmcTrimHandler);
	}

	function syncBetterToc() {
		const toc = document.querySelector('.markdown-toc');
		if (!toc || !document.body.classList.contains('page-topic')) {
			return;
		}

		toc.style.setProperty('--height', `${toc.clientHeight}px`);
		toc.classList.toggle('better-toc', isStickyActive(toc));
	}

	function isMobileUserAgent() {
		const userAgent = navigator.userAgent || '';
		return /Android|iPad|iPhone|iPod|Symbian/i.test(userAgent);
	}

	function isStickyActive(element) {
		const rect = element.getBoundingClientRect();
		const computedStyle = window.getComputedStyle(element);
		const stickyThreshold = parseFloat(computedStyle.top) || 0;
		const parent = element.parentElement;

		if (!parent) {
			return false;
		}

		const parentRect = parent.getBoundingClientRect();
		return rect.top <= stickyThreshold && parentRect.bottom > 0 && parentRect.top < window.innerHeight;
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', bootstrap);
	} else {
		bootstrap();
	}
})();
