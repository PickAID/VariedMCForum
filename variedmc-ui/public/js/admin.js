'use strict';
/* globals $, socket, define */

define('admin/plugins/variedmc-ui', ['alerts', 'uploader'], function (alerts, uploader) {
	const ACP = {};

	ACP.init = function () {
		bindEvents();
		loadSettings();
	};

	function bindEvents() {
		$('#save').on('click', saveSettings);
		$('[data-field="autoRotate"]').on('change', updateRotationFieldState);
		$('#add-slide').on('click', function () {
			appendSlide({});
			updateSlideState();
		});

		$('#variedmc-ui-slides').on('click', '[data-action="remove-slide"]', function () {
			$(this).closest('.variedmc-ui-slide').remove();
			updateSlideState();
		});

		$('#variedmc-ui-slides').on('click', '[data-action="move-up"]', function () {
			const card = $(this).closest('.variedmc-ui-slide');
			const previous = card.prev('.variedmc-ui-slide');
			if (previous.length) {
				card.insertBefore(previous);
				updateSlideState();
			}
		});

		$('#variedmc-ui-slides').on('click', '[data-action="move-down"]', function () {
			const card = $(this).closest('.variedmc-ui-slide');
			const next = card.next('.variedmc-ui-slide');
			if (next.length) {
				card.insertAfter(next);
				updateSlideState();
			}
		});

		$('#variedmc-ui-slides').on('click', '[data-action="upload-slide-image"]', function () {
			const card = $(this).closest('.variedmc-ui-slide');
			uploadSlideImage(card);
		});

		$('#variedmc-ui-slides').on('input change', '[data-slide-field="imageUrl"]', function () {
			updateSlidePreview($(this).closest('.variedmc-ui-slide'));
		});
	}

	function loadSettings() {
		socket.emit('plugins.variedmcUi.load', null, function (err, settings) {
			if (err) {
				return alerts.error(getMessage(err));
			}

			fillForm(settings || {});
		});
	}

	function saveSettings() {
		socket.emit('plugins.variedmcUi.save', collectForm(), function (err, settings) {
			if (err) {
				return alerts.error(getMessage(err));
			}

			fillForm(settings || {});

			alerts.alert({
				type: 'success',
				alert_id: 'variedmc-ui-saved',
				title: 'VariedMC UI Saved',
				message: 'Homepage hero settings have been updated.',
				timeout: 4000,
			});
		});
	}

	function fillForm(settings) {
		$('[data-field="autoRotate"]').prop('checked', settings.autoRotate !== false);
		$('[data-field="autoRotateInterval"]').val(String(settings.autoRotateInterval || 6));
		$('[data-field="recentTitle"]').val(String(settings.recentTitle || ''));
		$('[data-field="recentLinkUrl"]').val(String(settings.recentLinkUrl || ''));
		$('[data-field="recentLinkLabel"]').val(String(settings.recentLinkLabel || ''));
		$('[data-field="tagsTitle"]').val(String(settings.tagsTitle || ''));
		$('[data-field="categoriesTitle"]').val(String(settings.categoriesTitle || ''));
		updateRotationFieldState();
		renderSlides(settings.slides || []);
	}

	function renderSlides(slides) {
		const container = $('#variedmc-ui-slides');
		container.empty();

		(slides || []).forEach(function (slide) {
			appendSlide(slide);
		});

		updateSlideState();
	}

	function appendSlide(slide) {
		const card = $(buildSlideMarkup(slide));
		$('#variedmc-ui-slides').append(card);
		updateSlidePreview(card);
	}

	function collectForm() {
		return {
			slides: collectSlides(),
			autoRotate: $('[data-field="autoRotate"]').is(':checked'),
			autoRotateInterval: String($('[data-field="autoRotateInterval"]').val() || '').trim(),
			recentTitle: String($('[data-field="recentTitle"]').val() || '').trim(),
			recentLinkUrl: String($('[data-field="recentLinkUrl"]').val() || '').trim(),
			recentLinkLabel: String($('[data-field="recentLinkLabel"]').val() || '').trim(),
			tagsTitle: String($('[data-field="tagsTitle"]').val() || '').trim(),
			categoriesTitle: String($('[data-field="categoriesTitle"]').val() || '').trim(),
		};
	}

	function collectSlides() {
		return $('#variedmc-ui-slides .variedmc-ui-slide').map(function () {
			const card = $(this);
			return {
				imageUrl: String(card.find('[data-slide-field="imageUrl"]').val() || '').trim(),
				linkUrl: String(card.find('[data-slide-field="linkUrl"]').val() || '').trim(),
				title: String(card.find('[data-slide-field="title"]').val() || '').trim(),
				description: String(card.find('[data-slide-field="description"]').val() || '').trim(),
			};
		}).get().filter(function (slide) {
			return slide.imageUrl.length > 0;
		});
	}

	function updateSlideState() {
		const cards = $('#variedmc-ui-slides .variedmc-ui-slide');

		cards.each(function (index) {
			const card = $(this);
			card.find('.variedmc-ui-slide-index').text(String(index + 1));
			card.find('[data-action="move-up"]').prop('disabled', index === 0);
			card.find('[data-action="move-down"]').prop('disabled', index === cards.length - 1);
		});

		$('#variedmc-ui-slides-empty').toggleClass('hidden', cards.length > 0);
	}

	function updateRotationFieldState() {
		const enabled = $('[data-field="autoRotate"]').is(':checked');
		$('[data-field="autoRotateInterval"]').prop('disabled', !enabled);
	}

	function uploadSlideImage(card) {
		uploader.show({
			title: '上传轮播图片',
			description: '上传后会自动填入图片地址并显示预览。',
			route: `${config.relative_path}/api/admin/upload/file`,
			params: {
				folder: 'files',
			},
			accept: 'image/*',
		}, function (imageUrl) {
			card.find('[data-slide-field="imageUrl"]').val(String(imageUrl || '').trim());
			updateSlidePreview(card);
		});
	}

	function updateSlidePreview(card) {
		const imageUrl = String(card.find('[data-slide-field="imageUrl"]').val() || '').trim();
		const preview = card.find('[data-role="slide-preview"]');
		const empty = card.find('[data-role="slide-preview-empty"]');

		if (!imageUrl) {
			preview.addClass('hidden').attr('src', '');
			empty.removeClass('hidden');
			return;
		}

		preview.removeClass('hidden').attr('src', imageUrl);
		empty.addClass('hidden');
	}

	function buildSlideMarkup(slide) {
		const data = {
			imageUrl: escapeHtml(slide && slide.imageUrl),
			linkUrl: escapeHtml(slide && (slide.linkUrl || slide.topicUrl)),
			title: escapeHtml(slide && slide.title),
			description: escapeHtml(slide && slide.description),
		};

		return `
			<div class="card variedmc-ui-slide variedmc-ui-slide-card">
				<div class="card-header d-flex justify-content-between align-items-center gap-2 flex-wrap">
					<div class="fw-semibold">Slide <span class="variedmc-ui-slide-index">1</span></div>
					<div class="d-flex align-items-center gap-2">
						<button type="button" class="btn btn-light btn-sm" data-action="move-up">Up</button>
						<button type="button" class="btn btn-light btn-sm" data-action="move-down">Down</button>
						<button type="button" class="btn btn-outline-danger btn-sm" data-action="remove-slide">Remove</button>
					</div>
				</div>
				<div class="card-body d-flex flex-column gap-3">
					<div>
						<label class="form-label">图片</label>
						<div class="input-group">
							<input type="text" class="form-control" data-slide-field="imageUrl" value="${data.imageUrl}" placeholder="/assets/uploads/files/carousel.webp" />
							<button type="button" class="btn btn-light" data-action="upload-slide-image">上传图片</button>
						</div>
						<div class="form-text">可以直接粘贴 URL，也可以上传图片后自动回填。</div>
						<div class="mt-2 border rounded p-2 bg-body-tertiary">
							<div class="small text-muted" data-role="slide-preview-empty">还没有图片预览</div>
							<img class="img-fluid rounded hidden" data-role="slide-preview" alt="Slide preview" />
						</div>
					</div>

					<div>
						<label class="form-label">跳转链接</label>
						<input type="text" class="form-control" data-slide-field="linkUrl" value="${data.linkUrl}" placeholder="/topic/11" />
					</div>

					<div class="row g-3">
						<div class="col-lg-6">
							<label class="form-label">标题</label>
							<input type="text" class="form-control" data-slide-field="title" value="${data.title}" placeholder="可选，显示在图片底部" />
						</div>

						<div class="col-lg-6">
							<label class="form-label">描述</label>
							<input type="text" class="form-control" data-slide-field="description" value="${data.description}" placeholder="可选，显示在标题下方" />
						</div>
					</div>
				</div>
			</div>
		`;
	}

	function escapeHtml(value) {
		return String(value || '')
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	function getMessage(err) {
		if (!err) {
			return '[[error:invalid-data]]';
		}

		return err.message || err;
	}

	return ACP;
});
