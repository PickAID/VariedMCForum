<div id="home_area" data-categories-title="{categoriesTitle}">
	<div id="carousel" class="variedmc-home-carousel" data-auto-rotate="{autoRotateAttr}" data-auto-rotate-interval="{autoRotateIntervalAttr}">
		<div class="variedmc-home-carousel__viewport">
			{{{ each slides }}}
			<a class="variedmc-home-carousel__slide{{{ if ./active }}} is-active{{{ end }}}{{{ if ./hasOverlay }}} has-overlay{{{ end }}}" href="{./linkUrl}" data-slide-index="{./index}" aria-label="{./ariaLabel}"{{{ if ./imageUrl }}} style="background-image: url('{./imageUrl}');"{{{ end }}}>
				{{{ if ./hasOverlay }}}
				<span class="variedmc-home-carousel__overlay">
					{{{ if ./title }}}
					<strong class="variedmc-home-carousel__title">{./title}</strong>
					{{{ end }}}
					{{{ if ./description }}}
					<span class="variedmc-home-carousel__description">{./description}</span>
					{{{ end }}}
				</span>
				{{{ else }}}
				<span class="visually-hidden">{./ariaLabel}</span>
				{{{ end }}}
			</a>
			{{{ end }}}
		</div>

		{{{ if hasMultipleSlides }}}
		<button type="button" class="variedmc-home-carousel__control variedmc-home-carousel__control--prev" data-action="prev-slide" aria-label="Previous slide">
			<span aria-hidden="true">&lsaquo;</span>
		</button>
		<button type="button" class="variedmc-home-carousel__control variedmc-home-carousel__control--next" data-action="next-slide" aria-label="Next slide">
			<span aria-hidden="true">&rsaquo;</span>
		</button>
		<div class="variedmc-home-carousel__dots" role="tablist" aria-label="Carousel Pagination">
			{{{ each slides }}}
			<button type="button" class="variedmc-home-carousel__dot{{{ if ./active }}} is-active{{{ end }}}" data-slide-to="{./index}" aria-label="Go to slide {./dotLabel}"></button>
			{{{ end }}}
		</div>
		{{{ end }}}
	</div>

	<div id="recent_area">
		<div class="head">
			<h4>{recentTitle}</h4>
			<a class="topic-title fw-semibold fs-6 text-reset text-break d-block" href="{recentLinkUrl}">{recentLinkLabel}</a>
		</div>
	</div>
</div>
<div id="variedmc-hot-tags-header" class="variedmc-home-hot-tags-header">
	<h4>{tagsTitle}</h4>
	<hr />
</div>
