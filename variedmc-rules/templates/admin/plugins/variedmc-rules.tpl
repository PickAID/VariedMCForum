<div class="acp-page-container variedmc-rules-admin-page">
	<!-- IMPORT admin/partials/settings/header.tpl -->

	<div class="variedmc-rules-admin-layout">
		<section class="card">
			<div class="card-header d-flex align-items-center justify-content-between gap-2 flex-wrap">
				<div>
					<div class="fw-semibold">全局默认规则</div>
					<div class="text-muted small">默认关闭留痕，只在指定板块启用。</div>
				</div>
				<button id="save" class="btn btn-primary btn-sm" type="button">Save</button>
			</div>
			<div class="card-body variedmc-rules-grid">
				<label class="form-check form-switch">
					<input class="form-check-input" type="checkbox" data-field="enabled" />
					<span class="form-check-label">启用 VariedMC Rules</span>
				</label>
				<label class="form-check form-switch">
					<input class="form-check-input" type="checkbox" data-field="traceRequired" />
					<span class="form-check-label">默认留痕板块</span>
				</label>
				<div>
					<label class="form-label">删除策略</label>
					<select class="form-select" data-field="deletePolicy">
						<option value="normal">普通</option>
						<option value="request-after-grace">宽限后申请删除</option>
						<option value="request-only">总是申请删除</option>
						<option value="locked">仅管理删除</option>
					</select>
				</div>
				<div>
					<label class="form-label">删除宽限小时</label>
					<input class="form-control" type="number" min="0" step="0.5" data-field="deleteGraceHours" />
				</div>
				<div>
					<label class="form-label">主楼最少字数</label>
					<input class="form-control" type="number" min="0" step="1" data-field="minimumTopicContentLength" />
				</div>
				<div>
					<label class="form-label">扣信誉预设</label>
					<input class="form-control" type="text" data-field="reputationPresets" placeholder="-5,-10,-20" />
				</div>
			</div>
		</section>

		<section class="card">
			<div class="card-header d-flex align-items-center justify-content-between gap-2 flex-wrap">
				<div>
					<div class="fw-semibold">板块规则</div>
					<div class="text-muted small">每个板块可继承、延伸、独立或禁用。</div>
				</div>
				<input id="variedmc-rules-category-search" class="form-control form-control-sm" type="search" placeholder="Search category" />
			</div>
			<div class="card-body">
				<div id="variedmc-rules-categories" class="variedmc-rules-category-list"></div>
			</div>
		</section>
	</div>
</div>
