<div class="acp-page-container variedmc-topic-meta-page">
	<!-- IMPORT admin/partials/settings/header.tpl -->

	<div class="variedmc-topic-meta-layout">
		<div class="alert alert-light mb-0">
			为发帖 composer 提供版本 / 运行环境 / 主题选择，并按板块规则生成标题。规则会按“全局 -> 父板块 -> 子板块”递进，支持纯继承、继承后追加、本板块独立和隐藏面板四种模式。
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
						<code>{versions}</code>
						<code>{loaders}</code>
						<code>{themes}</code>
						<code>{versionsBlock}</code>
						<code>{loadersBlock}</code>
						<code>{themesBlock}</code>
						<code>{blocks}</code>
						<code>{meta}</code>
					</div>
				</div>

				<div class="variedmc-topic-meta-admin-grid">
					<div>
						<label class="form-label" for="variedmc-meta-versions">版本列表</label>
						<textarea id="variedmc-meta-versions" class="form-control" rows="6" data-field="versionsCatalog" placeholder="每行一个版本，例如 1.20.1"></textarea>
					</div>
					<div>
						<label class="form-label" for="variedmc-meta-loaders">运行环境列表</label>
						<textarea id="variedmc-meta-loaders" class="form-control" rows="6" data-field="loadersCatalog" placeholder="每行一个运行环境，例如 NeoForge"></textarea>
					</div>
					<div>
						<label class="form-label" for="variedmc-meta-themes">主题列表</label>
						<textarea id="variedmc-meta-themes" class="form-control" rows="6" data-field="themesCatalog" placeholder="每行一个主题，例如 KubeJS"></textarea>
					</div>
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
			<button id="save" type="button" class="btn btn-primary">Save</button>
		</div>
	</div>
</div>
