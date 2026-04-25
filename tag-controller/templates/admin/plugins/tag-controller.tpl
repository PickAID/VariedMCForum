<div class="acp-page-container tag-controller-page">
	<!-- IMPORT admin/partials/settings/header.tpl -->

	<div class="tag-controller-layout">
		<div class="alert alert-light mb-0">
			Tag colors are now driven from the current NodeBB tag catalog. This page auto-loads existing tags so you only adjust colors here, instead of manually creating controller rows one by one.
		</div>

		<div class="d-flex align-items-center justify-content-between flex-wrap gap-2 tag-controller-toolbar">
			<div class="text-muted small">
				<span id="tag-controller-definition-count">0</span> supported tags
			</div>

			<div class="d-flex align-items-center gap-2">
				<input
					type="text"
					class="form-control form-control-sm"
					id="tag-controller-create-tag"
					placeholder="Create new tag"
				/>
				<button class="btn btn-light" id="create-tag" type="button">Add Tag</button>
				<input
					type="search"
					class="form-control form-control-sm"
					id="tag-controller-search"
					placeholder="Search tags"
				/>
				<button class="btn btn-light" id="reload-tags" type="button">Reload</button>
				<button class="btn btn-primary" id="save" type="button">Save</button>
			</div>
		</div>

		<div class="alert alert-info tag-controller-empty hidden mb-0" id="tag-controller-empty">
			No tags were discovered from the current NodeBB tag catalog.
		</div>

		<div class="tag-controller-list" id="tag-controller-list"></div>
	</div>
</div>
