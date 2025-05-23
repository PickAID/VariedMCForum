<div class="acp-page-container">
	<!-- IMPORT admin/partials/settings/header.tpl -->

	<div class="row m-0">
		<div id="spy-container" class="col-12 col-md-8 px-0 mb-4" tabindex="0">
			<form role="form" class="markdown-toc-settings">
				<div class="mb-4">
					<h5 class="fw-bold tracking-tight settings-header">基本设置</h5>

					<div class="form-check form-switch mb-3">
						<input type="checkbox" class="form-check-input" id="enabled" name="enabled">
						<label for="enabled" class="form-check-label">启用Markdown目录</label>
					</div>

					<div class="mb-3">
						<label class="form-label" for="tocMarker">目录标记</label>
						<input type="text" id="tocMarker" name="tocMarker" class="form-control" placeholder="[TOC]">
						<div class="form-text">在markdown中插入此标记来生成目录</div>
					</div>

					<div class="mb-3">
						<label class="form-label" for="tocTitle">目录标题</label>
						<input type="text" id="tocTitle" name="tocTitle" class="form-control" placeholder="Table of Contents">
					</div>

					<div class="mb-3">
						<label class="form-label" for="bullets">列表符号</label>
						<select id="bullets" name="bullets" class="form-select">
							<option value="*">* (星号)</option>
							<option value="-">- (短横线)</option>
							<option value="+">+ (加号)</option>
						</select>
					</div>
				</div>

				<div class="mb-4">
					<h5 class="fw-bold tracking-tight settings-header">标题级别设置</h5>

					<div class="mb-3">
						<label class="form-label" for="maxDepth">最大标题级别</label>
						<select id="maxDepth" name="maxDepth" class="form-select">
							<option value="1">H1</option>
							<option value="2">H2</option>
							<option value="3">H3</option>
							<option value="4">H4</option>
							<option value="5">H5</option>
							<option value="6">H6</option>
						</select>
						<div class="form-text">包含到此级别的所有标题</div>
					</div>
				</div>

				<div class="mb-4">
					<h5 class="fw-bold tracking-tight settings-header">高级选项</h5>

					<div class="form-check form-switch mb-3">
						<input type="checkbox" class="form-check-input" id="firsth1" name="firsth1">
						<label for="firsth1" class="form-check-label">包含第一个H1标题</label>
					</div>

					<div class="form-check form-switch mb-3">
						<input type="checkbox" class="form-check-input" id="stripHeadingTags" name="stripHeadingTags">
						<label for="stripHeadingTags" class="form-check-label">移除标题中的HTML标签</label>
					</div>
				</div>

				<div class="mb-4">
					<h5 class="fw-bold tracking-tight settings-header">使用说明</h5>
					<div class="alert alert-info">
						<p><strong>使用方法：</strong></p>
						<ol>
							<li>在编辑器中点击目录按钮或手动输入 <code>[TOC]</code></li>
							<li>确保内容包含标题（# ## ### 等）</li>
							<li>发布后目录会自动生成</li>
						</ol>
					</div>
				</div>
			</form>
		</div>

		<!-- IMPORT admin/partials/settings/toc.tpl -->
	</div>
</div> 