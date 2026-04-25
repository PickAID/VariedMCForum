<div class="acp-page-container variedmc-ui-admin-page">
	<!-- IMPORT admin/partials/settings/header.tpl -->

	<div class="row m-0">
		<div class="col-12 px-0 d-flex flex-column gap-3">
			<div class="alert alert-light mb-0 variedmc-ui-admin-callout">
				这里管理首页头部轮播、最新动态区块文案和热门标签 / 板块标题。轮播图支持多张图片，顺序与这里的列表顺序一致，也支持直接在后台上传图片。
			</div>

			<div class="card">
				<div class="card-header d-flex justify-content-between align-items-center gap-2 flex-wrap">
					<div class="fw-semibold">轮播图</div>
					<button id="add-slide" type="button" class="btn btn-primary btn-sm">Add Slide</button>
				</div>
				<div class="card-body d-flex flex-column gap-3">
					<div class="form-text">
						每个 slide 至少需要一张图片。标题和描述可选，不填就保持纯图片轮播。
					</div>
					<div class="row g-3">
						<div class="col-lg-4">
							<div class="form-check form-switch">
								<input id="variedmc-auto-rotate" data-field="autoRotate" type="checkbox" class="form-check-input" />
								<label class="form-check-label" for="variedmc-auto-rotate">启用自动轮播</label>
							</div>
						</div>

						<div class="col-lg-4">
							<label class="form-label" for="variedmc-auto-rotate-interval">切换间隔（秒）</label>
							<input id="variedmc-auto-rotate-interval" data-field="autoRotateInterval" type="number" min="2" max="60" step="1" class="form-control" />
						</div>
					</div>
					<div id="variedmc-ui-slides-empty" class="alert alert-info hidden mb-0">
						当前没有可用 slide。保存时会自动回退到默认轮播图。
					</div>
					<div id="variedmc-ui-slides" class="d-flex flex-column gap-3"></div>
				</div>
			</div>

			<div class="card">
				<div class="card-header fw-semibold">区块标题</div>
				<div class="card-body d-flex flex-column gap-3">
					<div class="row g-3">
						<div class="col-lg-6">
							<label class="form-label" for="variedmc-recent-title">最新内容标题</label>
							<input id="variedmc-recent-title" data-field="recentTitle" type="text" class="form-control" />
						</div>

						<div class="col-lg-6">
							<label class="form-label" for="variedmc-recent-link-label">最新内容更多文本</label>
							<input id="variedmc-recent-link-label" data-field="recentLinkLabel" type="text" class="form-control" />
						</div>

						<div class="col-lg-6">
							<label class="form-label" for="variedmc-recent-link-url">最新内容更多链接</label>
							<input id="variedmc-recent-link-url" data-field="recentLinkUrl" type="text" class="form-control" />
						</div>

						<div class="col-lg-6">
							<label class="form-label" for="variedmc-tags-title">热门标签标题</label>
							<input id="variedmc-tags-title" data-field="tagsTitle" type="text" class="form-control" />
						</div>

						<div class="col-lg-6">
							<label class="form-label" for="variedmc-categories-title">板块标题</label>
							<input id="variedmc-categories-title" data-field="categoriesTitle" type="text" class="form-control" />
						</div>
					</div>
				</div>
			</div>

			<div class="d-flex justify-content-end">
				<button id="save" type="button" class="btn btn-primary">Save</button>
			</div>
		</div>
	</div>
</div>
