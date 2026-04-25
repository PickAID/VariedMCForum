'use strict';
/* globals $, socket, define */

define('admin/plugins/tag-controller', ['alerts'], function (alerts) {
	const ACP = {};
	const CONTENT_WIDE_CLASS = 'tag-controller-content-wide';
	const RUNTIME_STYLE_ID = 'tag-controller-runtime-style';

	ACP.init = function () {
		ensureRuntimeStyles();
		enableWideLayout();
		bindEvents();
		loadSettings();
	};

	function ensureRuntimeStyles() {
		if (document.getElementById(RUNTIME_STYLE_ID)) {
			return;
		}

		const style = document.createElement('style');
		style.id = RUNTIME_STYLE_ID;
		style.textContent = `
			.admin #content.${CONTENT_WIDE_CLASS} {
				width: min(1880px, calc(100vw - 17rem)) !important;
				max-width: none !important;
				padding-inline: 0.75rem;
			}
			.acp-page-container.tag-controller-page {
				width: 100%;
				max-width: none;
				margin: 0;
			}
			.tag-controller-layout {
				display: flex;
				flex-direction: column;
				gap: 0.95rem;
				width: 100%;
			}
			.tag-controller-page .alert,
			.tag-controller-page .tag-controller-row,
			.tag-controller-page .tag-controller-toolbar,
			.tag-controller-page .tag-controller-surface-card {
				border: 1px solid var(--bs-border-color);
				border-radius: 0.72rem;
				box-shadow: none;
			}
			.tag-controller-page .alert {
				padding: 0.8rem 0.95rem;
				background: var(--bs-tertiary-bg);
			}
			.tag-controller-toolbar {
				padding: 0.78rem 0.9rem;
				background: var(--bs-body-bg);
			}
			.tag-controller-toolbar > .d-flex.align-items-center.gap-2 {
				flex: 1 1 auto;
				flex-wrap: wrap;
				justify-content: flex-end;
			}
			.tag-controller-toolbar .form-control,
			.tag-controller-toolbar .btn {
				height: 2.2rem;
			}
			.tag-controller-toolbar .form-control-sm {
				min-width: min(11.5rem, 100%);
			}
			#tag-controller-list,
			.tag-controller-list {
				display: grid;
				grid-template-columns: repeat(auto-fill, minmax(12.25rem, 1fr));
				gap: 0.58rem;
				width: 100%;
				align-items: start;
			}
			.tag-controller-row {
				min-width: 0;
				height: 100%;
				background: var(--bs-body-bg);
			}
			.tag-controller-row .card-body {
				padding: 0.62rem;
				height: 100%;
			}
			.tag-controller-row__layout {
				display: flex;
				flex-direction: column;
				gap: 0.52rem;
				min-width: 0;
				height: 100%;
			}
			.tag-controller-row__meta {
				display: flex;
				flex-direction: column;
				gap: 0.36rem;
				min-width: 0;
			}
			.tag-controller-row__meta > .form-label,
			.tag-controller-surface-card .form-label {
				margin-bottom: 0;
				font-size: 0.72rem;
				font-weight: 700;
				letter-spacing: 0.03em;
				text-transform: uppercase;
				color: var(--bs-secondary-color);
			}
			.tag-controller-row__meta-inline {
				display: grid;
				grid-template-columns: minmax(0, 1fr) auto;
				align-items: start;
				gap: 0.35rem;
				min-width: 0;
			}
			.tag-controller-row__tag {
				display: inline-flex;
				align-items: center;
				min-width: 0;
				max-width: 100%;
				padding: 0.3rem 0.5rem;
				border: 1px solid var(--bs-border-color-translucent, var(--bs-border-color));
				border-radius: 0.55rem;
				background: color-mix(in srgb, var(--bs-tertiary-bg) 86%, var(--bs-body-bg));
				color: var(--bs-emphasis-color);
				font-size: 0.86rem;
				font-weight: 800;
				line-height: 1.2;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}
			.tag-controller-row__status .badge {
				font-size: 0.64rem;
				padding: 0.2rem 0.34rem;
				border-radius: 0.42rem;
			}
			.tag-controller-row__surfaces {
				display: grid;
				grid-template-columns: repeat(2, minmax(0, 1fr));
				gap: 0.42rem;
				min-width: 0;
			}
			.tag-controller-surface-card {
				padding: 0.45rem;
				background: var(--bs-body-bg);
				display: flex;
				flex-direction: column;
				gap: 0.34rem;
				min-width: 0;
			}
			.tag-controller-surface-card__header {
				display: flex;
				flex-direction: column;
				align-items: flex-start;
				gap: 0.26rem;
				margin-bottom: 0;
				min-width: 0;
			}
			.tag-controller-surface-card__title {
				font-size: 0.62rem;
				font-weight: 700;
				text-transform: uppercase;
				letter-spacing: 0.05em;
				margin: 0;
				opacity: 0.82;
			}
			.tag-controller-color-grid {
				display: grid;
				grid-template-columns: repeat(2, minmax(0, 1fr));
				gap: 0.3rem;
			}
			.tag-controller-color-field {
				display: flex;
				flex-direction: column;
				gap: 0.15rem;
				margin: 0;
				min-width: 0;
			}
			.tag-controller-field-label {
				font-size: 0.6rem;
				font-weight: 700;
				letter-spacing: 0.05em;
				opacity: 0.82;
			}
			.tag-controller-preview-wrap {
				display: flex;
				align-items: center;
				width: 100%;
				margin: 0;
			}
			.tag-controller-preview {
				display: inline-flex;
				align-items: center;
				justify-content: flex-start;
				width: 100%;
				font-size: 0.69rem;
				line-height: 1.15;
				padding: 0.22rem 0.42rem;
				border-radius: 0.52rem;
				max-width: 100%;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}
			.tag-controller-color-field .form-control-color {
				height: 1.58rem;
				padding: 0.11rem;
				border-radius: 0.5rem;
				min-width: 100%;
			}
			@media (max-width: 991.98px) {
				.admin #content.${CONTENT_WIDE_CLASS} {
					width: calc(100vw - 1rem) !important;
				}
			}
			@media (max-width: 767.98px) {
				.admin #content.${CONTENT_WIDE_CLASS} {
					width: calc(100vw - 0.5rem) !important;
				}
				.tag-controller-toolbar .form-control-sm,
				.tag-controller-toolbar .btn {
					width: 100%;
				}
				#tag-controller-list,
				.tag-controller-list,
				.tag-controller-row__surfaces,
				.tag-controller-color-grid {
					grid-template-columns: 1fr;
				}
			}
		`;
		document.head.appendChild(style);
	}

	function enableWideLayout() {
		applyContentWidth();
		$(window)
			.off('resize.tagControllerWide')
			.on('resize.tagControllerWide', applyContentWidth);
		$(window)
			.off('action:ajaxify.start.tagControllerWide')
			.on('action:ajaxify.start.tagControllerWide', function () {
				$(window).off('resize.tagControllerWide');
				$('#content').removeClass(CONTENT_WIDE_CLASS).css({
					width: '',
					maxWidth: '',
					paddingInline: '',
				});
			});
	}

	function applyContentWidth() {
		const width = window.innerWidth < 768 ?
			'calc(100vw - 0.5rem)' :
			window.innerWidth < 992 ?
				'calc(100vw - 1rem)' :
				'min(1880px, calc(100vw - 17rem))';

		$('#content').addClass(CONTENT_WIDE_CLASS).css({
			width: width,
			maxWidth: 'none',
			paddingInline: '0.75rem',
		});
	}

	function bindEvents() {
		$('#reload-tags').on('click', loadSettings);
		$('#tag-controller-search').on('input', updateState);
		$('#create-tag').on('click', createTag);

		$('#save').on('click', saveSettings);

		$('#tag-controller-list').on('input change', 'input', function () {
			updateRowPreview($(this).closest('.tag-controller-row'));
			updateState();
		});
	}

	function loadSettings() {
		socket.emit('plugins.tagController.load', null, function (err, state) {
			if (err) {
				return alerts.error(getMessage(err));
			}

			renderRows(state.definitions || []);
			updateCounters(state);
			updateState();
		});
	}

	function saveSettings() {
		socket.emit('plugins.tagController.save', {
			definitions: collectDefinitions(),
		}, function (err, state) {
			if (err) {
				return alerts.error(getMessage(err));
			}

			renderRows(state.definitions || []);
			updateCounters(state);
			updateState();

			alerts.alert({
				type: 'success',
				alert_id: 'tag-controller-saved',
				title: 'Tag Controller Saved',
				message: 'Managed tag colors have been updated.',
				timeout: 4000,
			});
		});
	}

	function createTag() {
		const input = $('#tag-controller-create-tag');
		const tag = String(input.val() || '').trim();
		if (!tag) {
			return alerts.error('[[error:invalid-tag]]');
		}

		socket.emit('plugins.tagController.create', {
			tag,
		}, function (err, state) {
			if (err) {
				return alerts.error(getMessage(err));
			}

			input.val('');
			renderRows(state.definitions || []);
			updateCounters(state);
			updateState();

			alerts.alert({
				type: 'success',
				alert_id: 'tag-controller-created',
				title: 'Tag Created',
				message: 'The tag has been added to the shared tag catalog.',
				timeout: 4000,
			});
		});
	}

	function renderRows(definitions) {
		const list = $('#tag-controller-list');
		list.empty();

		if (!definitions.length) {
			applyRuntimeLayout();
			return;
		}

		definitions.forEach(function (definition) {
			appendRow(definition);
		});
		applyRuntimeLayout();
	}

	function appendRow(definition) {
		const row = $(buildRowMarkup(definition));
		$('#tag-controller-list').append(row);
		updateRowPreview(row);
	}

	function applyRuntimeLayout() {
		applyContentWidth();
		$('.acp-page-container.tag-controller-page').css({
			width: '100%',
			maxWidth: 'none',
			margin: '0',
		});
		$('.tag-controller-layout').css({
			display: 'flex',
			flexDirection: 'column',
			gap: '0.85rem',
			width: '100%',
		});
		$('#tag-controller-list').css({
			display: 'grid',
			gridTemplateColumns: 'repeat(auto-fill, minmax(12.25rem, 1fr))',
			gap: '0.58rem',
			width: '100%',
			alignItems: 'start',
		});
	}

	function collectDefinitions() {
		return $('#tag-controller-list .tag-controller-row').map(function () {
			const row = $(this);

			return {
				tag: row.find('[data-field="tag"]').val(),
				lightBgColor: row.find('[data-field="lightBgColor"]').val(),
				lightTextColor: row.find('[data-field="lightTextColor"]').val(),
				darkBgColor: row.find('[data-field="darkBgColor"]').val(),
				darkTextColor: row.find('[data-field="darkTextColor"]').val(),
			};
		}).get().filter(function (definition) {
			return String(definition.tag || '').trim().length > 0;
		});
	}

	function updateState() {
		const definitions = collectDefinitions();
		const query = String($('#tag-controller-search').val() || '').trim().toLowerCase();
		let visibleCount = 0;

		$('#tag-controller-list .tag-controller-row').each(function () {
			const row = $(this);
			const tag = String(row.find('[data-field="tag"]').val() || '').trim().toLowerCase();
			const matches = !query || tag.includes(query);
			row.toggleClass('hidden', !matches);
			if (matches) {
				visibleCount += 1;
			}
		});

		$('#tag-controller-empty').toggleClass('hidden', definitions.length > 0);
		$('#tag-controller-definition-count').text(query ? visibleCount : definitions.length);
	}

	function updateCounters(state) {
		if (!state) {
			return;
		}

		$('#tag-controller-definition-count').text((state.definitions || []).length);
	}

	function updateRowPreview(row) {
		const tag = String(row.find('[data-field="tag"]').val() || '').trim();
		const lightBgColor = String(row.find('[data-field="lightBgColor"]').val() || '#4B5563');
		const lightTextColor = String(row.find('[data-field="lightTextColor"]').val() || '#FFFFFF');
		const darkBgColor = String(row.find('[data-field="darkBgColor"]').val() || '#4B5563');
		const darkTextColor = String(row.find('[data-field="darkTextColor"]').val() || '#FFFFFF');
		const label = tag || 'preview';
		const lightSurface = row.find('.tag-controller-surface-card--light');
		const darkSurface = row.find('.tag-controller-surface-card--dark');
		const lightPreview = row.find('.tag-controller-preview-light');
		const darkPreview = row.find('.tag-controller-preview-dark');
		const tagLabel = row.find('.tag-controller-row__tag');

		tagLabel.text(label).attr('title', label);
		lightSurface.css({
			backgroundColor: lightBgColor,
			borderColor: lightBgColor,
			color: lightTextColor,
		});
		darkSurface.css({
			backgroundColor: darkBgColor,
			borderColor: darkBgColor,
			color: darkTextColor,
		});
		lightPreview.text(label);
		lightPreview.css({
			backgroundColor: lightBgColor,
			borderColor: lightBgColor,
			color: lightTextColor,
		});
		darkPreview.text(label);
		darkPreview.css({
			backgroundColor: darkBgColor,
			borderColor: darkBgColor,
			color: darkTextColor,
		});
	}

	function buildRowMarkup(definition) {
		const data = {
			tag: escapeAttribute(definition && definition.tag),
			topicCount: escapeAttribute(String((definition && definition.topicCount) || 0)),
			inCatalog: !!(definition && definition.inCatalog),
			lightBgColor: escapeAttribute((definition && (definition.lightBgColor || definition.bgColor)) || '#4B5563'),
			lightTextColor: escapeAttribute((definition && (definition.lightTextColor || definition.textColor)) || '#FFFFFF'),
			darkBgColor: escapeAttribute((definition && (definition.darkBgColor || definition.lightBgColor || definition.bgColor)) || '#4B5563'),
			darkTextColor: escapeAttribute((definition && (definition.darkTextColor || definition.lightTextColor || definition.textColor)) || '#FFFFFF'),
		};

		const tagStatus = data.inCatalog ?
			`<span class="badge text-bg-light border">${data.topicCount} topics</span>` :
			`<span class="badge text-bg-warning border">Saved only</span>`;

		return `
			<div class="card tag-controller-row">
				<div class="card-body">
					<div class="tag-controller-row__layout">
						<div class="tag-controller-row__meta">
							<label class="form-label">Tag</label>
							<input type="hidden" data-field="tag" value="${data.tag}" />
							<div class="tag-controller-row__meta-inline">
								<code class="tag-controller-row__tag" title="${data.tag}">${data.tag}</code>
								<div class="tag-controller-row__status">${tagStatus}</div>
							</div>
						</div>

						<div class="tag-controller-row__surfaces">
						<section class="tag-controller-surface-card tag-controller-surface-card--light">
							<div class="tag-controller-surface-card__header">
								<div class="tag-controller-surface-card__title">Light</div>
								<div class="tag-controller-preview-wrap">
									<span class="badge border tag-controller-preview tag-controller-preview-light">preview</span>
								</div>
							</div>
							<div class="tag-controller-color-grid">
								<label class="tag-controller-color-field">
									<span class="tag-controller-field-label">BG</span>
									<input type="color" class="form-control form-control-color w-100" data-field="lightBgColor" value="${data.lightBgColor}" />
								</label>
								<label class="tag-controller-color-field">
									<span class="tag-controller-field-label">TXT</span>
									<input type="color" class="form-control form-control-color w-100" data-field="lightTextColor" value="${data.lightTextColor}" />
								</label>
							</div>
						</section>

						<section class="tag-controller-surface-card tag-controller-surface-card--dark">
							<div class="tag-controller-surface-card__header">
								<div class="tag-controller-surface-card__title">Dark</div>
								<div class="tag-controller-preview-wrap">
									<span class="badge border tag-controller-preview tag-controller-preview-dark">preview</span>
								</div>
							</div>
							<div class="tag-controller-color-grid">
								<label class="tag-controller-color-field">
									<span class="tag-controller-field-label">BG</span>
									<input type="color" class="form-control form-control-color w-100" data-field="darkBgColor" value="${data.darkBgColor}" />
								</label>
								<label class="tag-controller-color-field">
									<span class="tag-controller-field-label">TXT</span>
									<input type="color" class="form-control form-control-color w-100" data-field="darkTextColor" value="${data.darkTextColor}" />
								</label>
							</div>
						</section>
						</div>
					</div>
				</div>
			</div>
		`;
	}

	function getMessage(err) {
		if (!err) {
			return '[[error:invalid-data]]';
		}

		return err.message || err;
	}

	function escapeAttribute(value) {
		return String(value || '')
			.replace(/&/g, '&amp;')
			.replace(/'/g, '&#39;')
			.replace(/"/g, '&quot;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');
	}

	return ACP;
});
