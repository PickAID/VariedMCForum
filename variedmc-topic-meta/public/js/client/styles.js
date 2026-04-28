(function () {
	'use strict';

	const STYLE_ID = 'variedmc-topic-meta-runtime-style';

	window.VariedMCTopicMetaStyles = {
		ensure() {
			if (document.getElementById(STYLE_ID)) {
				return;
			}
			const style = document.createElement('style');
			style.id = STYLE_ID;
			style.textContent = `
				.variedmc-topic-meta-title-layout{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:.55rem;align-items:stretch;min-width:0}
				.variedmc-topic-meta-title-layout>.quick-search-container{grid-column:1}
				.variedmc-topic-meta-title-layout>.title{width:100%;height:100%;min-width:0;min-height:2.375rem}
				.variedmc-topic-meta-title-layout .variedmc-topic-meta-preview-panel{width:100%;height:100%;min-width:0;margin-bottom:0;border:1px solid var(--bs-border-color);border-radius:var(--bs-border-radius-sm,.25rem);background:var(--bs-body-bg);overflow:hidden}
				.variedmc-topic-meta-previewline{display:grid;align-content:center;height:100%;min-height:2.375rem;padding:.375rem .75rem;border:0;border-radius:inherit;background:transparent;box-shadow:none}
				.variedmc-topic-meta-preview{min-width:0;overflow:hidden;border:0;border-radius:inherit;background:transparent;box-shadow:none;color:var(--bs-body-color);font-size:.95rem;font-weight:600;line-height:1.35;text-overflow:ellipsis;white-space:nowrap;word-break:break-word}
				@media (max-width:767.98px){.variedmc-topic-meta-title-layout{grid-template-columns:minmax(0,1fr);gap:.4rem}.variedmc-topic-meta-title-layout>.title{grid-column:1;grid-row:2}.variedmc-topic-meta-title-layout .variedmc-topic-meta-preview-panel{grid-column:1;grid-row:1}.variedmc-topic-meta-title-layout>.quick-search-container{grid-column:1;grid-row:3}}
				.variedmc-topic-meta-shell{--vmtm-note-bg:rgba(var(--bs-body-color-rgb,33,37,41),.035);--vmtm-note-border:rgba(var(--bs-body-color-rgb,33,37,41),.12);display:grid;gap:.32rem}
				[data-bs-theme="dark"] .variedmc-topic-meta-shell,.skin-cyborg .variedmc-topic-meta-shell,.skin-darkly .variedmc-topic-meta-shell,.skin-quartz .variedmc-topic-meta-shell,.skin-slate .variedmc-topic-meta-shell,.skin-solar .variedmc-topic-meta-shell,.skin-superhero .variedmc-topic-meta-shell{--vmtm-note-bg:rgba(var(--bs-body-color-rgb,248,249,250),.07);--vmtm-note-border:rgba(var(--bs-body-color-rgb,248,249,250),.16)}
				.variedmc-topic-meta-note{display:grid;gap:.18rem;padding:.5rem .62rem;border:1px solid var(--vmtm-note-border);border-radius:.52rem;background:var(--vmtm-note-bg);font-size:.74rem;line-height:1.4}
				.variedmc-topic-meta-note-label{font-size:.7rem;font-weight:700;letter-spacing:.03em;color:var(--bs-secondary-color)}
				.variedmc-topic-meta-note-body{color:var(--bs-body-color)}
				.variedmc-topic-meta-inline-list{display:grid;gap:.24rem}
				.variedmc-topic-meta-inline-field{display:flex;gap:.5rem;align-items:flex-start;min-width:0}
				.variedmc-topic-meta-inline-label{flex:0 0 4.8rem;font-size:.75rem;font-weight:600;line-height:1.55;padding-top:.12rem;color:var(--bs-secondary-color)}
				.variedmc-topic-meta-inline-required{color:var(--bs-danger);margin-inline-start:.15rem}
				.variedmc-topic-meta-options{display:flex;flex-wrap:wrap;gap:.24rem;flex:1 1 auto;min-width:0}
				.variedmc-topic-meta-chip{display:inline-flex;align-items:center;min-height:1.52rem;padding:.08rem .42rem;border:1px solid var(--bs-border-color);border-radius:999px;background:var(--bs-body-bg);cursor:pointer;user-select:none;font-size:.74rem;font-weight:500;line-height:1.2;transition:border-color .12s ease,background-color .12s ease}
				.variedmc-topic-meta-chip.is-active{border-color:var(--bs-primary);background:rgba(var(--bs-primary-rgb),.12)}
			`;
			document.head.appendChild(style);
		},
	};
}());
