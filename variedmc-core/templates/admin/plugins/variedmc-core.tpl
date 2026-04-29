<div class="acp-page-container variedmc-core-page">
	<!-- IMPORT admin/partials/settings/header.tpl -->

	<div class="row m-0">
		<div class="col-12 px-0 d-flex flex-column gap-3">
			<div class="alert alert-light mb-0">
				这里管理 VariedMC 的核心行为开关。默认保持当前生产体验。
			</div>

			<div class="card">
				<div class="card-header fw-semibold">板块置顶</div>
				<div class="card-body">
					<div class="form-check form-switch">
						<input id="variedmc-core-inherit-pinned-topics" class="form-check-input" type="checkbox" data-field="inheritPinnedTopics" />
						<label class="form-check-label" for="variedmc-core-inherit-pinned-topics">子板块显示父级置顶帖</label>
					</div>
					<div class="form-text">
						启用后，子板块会显示父级链上的置顶帖入口；关闭后只显示当前板块自己的置顶帖。
					</div>
				</div>
			</div>

			<div class="d-flex justify-content-end">
				<button id="save" type="button" class="btn btn-primary" data-action="save-core">Save</button>
			</div>
		</div>
	</div>
</div>
