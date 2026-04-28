<div class="acp-page-container variedmc-topic-meta-page">
	<!-- IMPORT admin/partials/settings/header.tpl -->

	<div class="variedmc-topic-meta-layout">
		<div class="alert alert-light mb-0">
			为发帖 composer 提供版本 / 运行环境 / 自定义 meta 列表，并按板块规则生成标题。规则会按“全局 -> 父板块 -> 子板块”递进，支持纯继承、继承后追加、本板块独立和隐藏面板四种模式。
		</div>

		<div class="card">
			<div class="card-header fw-semibold">全局选项池</div>
			<div class="card-body d-flex flex-column gap-3">
				<div>
					<label class="form-label" for="variedmc-meta-title-template">默认标题模板</label>
					<input id="variedmc-meta-title-template" type="text" class="form-control" data-field="defaultTitleTemplate" placeholder="{blocks} {title}" />
					<div class="form-text">
						可用占位符:
						<code>{title}</code>
						<code>{block:versions}</code>
						<code>{value:versions}</code>
						<code>{block:loaders}</code>
						<code>{value:loaders}</code>
						<code>{versions}</code>
						<code>{loaders}</code>
						<code>{themes}</code>
						<code>{versionsBlock}</code>
						<code>{loadersBlock}</code>
						<code>{themesBlock}</code>
						<code>{blocks}</code>
						<code>{meta}</code>
						<code>{block:selectionKey}</code>
						<code>{value:selectionKey}</code>
						<code>{label:selectionKey}</code>
						。字段级占位符也支持 <code>{block:topic.primary}</code> 这种模块字段路径。
					</div>
				</div>

				<div class="variedmc-topic-meta-admin-grid">
					<div>
						<div class="d-flex align-items-center justify-content-between gap-2">
							<label class="form-label" for="variedmc-meta-versions">版本列表</label>
							<label class="form-check-label small d-inline-flex align-items-center gap-1">
								<input type="checkbox" class="form-check-input m-0" data-field="versionEnabled" checked />
								启用
							</label>
						</div>
						<textarea id="variedmc-meta-versions" class="form-control" rows="6" data-field="versionsCatalog" placeholder="每行一个版本，例如 1.20.1"></textarea>
					</div>
					<div>
						<div class="d-flex align-items-center justify-content-between gap-2">
							<label class="form-label" for="variedmc-meta-loaders">运行环境列表</label>
							<label class="form-check-label small d-inline-flex align-items-center gap-1">
								<input type="checkbox" class="form-check-input m-0" data-field="loaderEnabled" checked />
								启用
							</label>
						</div>
						<textarea id="variedmc-meta-loaders" class="form-control" rows="6" data-field="loadersCatalog" placeholder="每行一个运行环境，例如 NeoForge"></textarea>
					</div>
				</div>

				<div class="variedmc-topic-meta-list-editor">
					<div class="d-flex justify-content-between align-items-center gap-2 flex-wrap">
						<div>
							<div class="fw-semibold">自定义 meta 列表</div>
							<div class="form-text">每个列表会在 composer 和搜索筛选中成为一个独立区块，例如“主题”“技能”“内容类型”。</div>
						</div>
						<button id="variedmc-topic-meta-add-list" type="button" class="btn btn-light btn-sm">新增列表</button>
					</div>
					<div id="variedmc-topic-meta-lists" class="variedmc-topic-meta-list-grid"></div>
				</div>
			</div>
		</div>

		<div class="card">
			<div class="card-header d-flex flex-column gap-2">
				<div class="d-flex justify-content-between align-items-center gap-2 flex-wrap">
					<div>
						<div class="fw-semibold">板块规则</div>
						<div class="text-muted small">
							当前显示 <span id="variedmc-topic-meta-category-count">0</span> 个板块，默认折叠
						</div>
					</div>

					<div class="variedmc-topic-meta-toolbar">
						<input
							type="search"
							class="form-control form-control-sm"
							id="variedmc-topic-meta-search"
							placeholder="搜索板块 / CID / 已配置 meta"
						/>
						<button id="variedmc-topic-meta-expand-all" type="button" class="btn btn-light btn-sm">展开全部</button>
						<button id="variedmc-topic-meta-collapse-all" type="button" class="btn btn-light btn-sm">收起全部</button>
					</div>
				</div>
			</div>
			<div class="card-body d-flex flex-column gap-2">
				<div id="variedmc-topic-meta-empty" class="alert alert-info mb-0 hidden">
					没有匹配到板块。
				</div>
				<div id="variedmc-topic-meta-categories" class="d-flex flex-column gap-2"></div>
			</div>
		</div>

		<div class="d-flex justify-content-end">
			<button type="button" class="btn btn-primary" data-action="save-topic-meta">Save</button>
		</div>
	</div>
</div>
