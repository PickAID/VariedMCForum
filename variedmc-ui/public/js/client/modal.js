(function () {
	'use strict';

	let currentModal = null;
	let escHandler = null;

	function init() {
		document.addEventListener('click', onDocumentClick);
	}

	function onDocumentClick(event) {
		if (currentModal && event.target === currentModal) {
			close();
			return;
		}

		const link = event.target.closest('a[href]');
		const image = link && link.querySelector('img');
		if (!link || !image || !/\.(avif|gif|jpe?g|png|webp)(?:\?.*)?$/i.test(link.href)) {
			return;
		}

		event.preventDefault();
		open(link.href, image.alt || 'Image');
	}

	function open(src, alt) {
		close();

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
		escHandler = function (event) {
			if (event.key === 'Escape') {
				close();
			}
		};
		document.addEventListener('keydown', escHandler);
	}

	function close() {
		if (currentModal) {
			currentModal.remove();
			currentModal = null;
		}
		if (escHandler) {
			document.removeEventListener('keydown', escHandler);
			escHandler = null;
		}
	}

	window.VariedMCUiModal = { init };
}());
