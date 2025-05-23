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
						<input type="text" id="tocMarker" name="tocMarker" class="form-control" placeholder="[TOC]" value="[TOC]">
						<div class="form-text">在markdown中插入此标记来生成目录</div>
					</div>

					<div class="mb-3">
						<label class="form-label" for="tocTitle">目录标题</label>
						<input type="text" id="tocTitle" name="tocTitle" class="form-control" placeholder="Table of Contents" value="Table of Contents">
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
							<option value="6" selected>H6</option>
						</select>
						<div class="form-text">包含到此级别的所有标题</div>
					</div>
				</div>

				<div class="mb-4">
					<h5 class="fw-bold tracking-tight settings-header">高级选项</h5>

					<div class="form-check form-switch mb-3">
						<input type="checkbox" class="form-check-input" id="firsth1" name="firsth1" checked>
						<label for="firsth1" class="form-check-label">包含第一个H1标题</label>
						<div class="form-text">取消勾选可排除文档中的第一个H1标题</div>
					</div>

					<div class="form-check form-switch mb-3">
						<input type="checkbox" class="form-check-input" id="stripHeadingTags" name="stripHeadingTags" checked>
						<label for="stripHeadingTags" class="form-check-label">移除标题中的HTML标签</label>
						<div class="form-text">清理标题文本中的HTML标签</div>
					</div>

					<div class="form-check form-switch mb-3">
						<input type="checkbox" class="form-check-input" id="enableInSignatures" name="enableInSignatures">
						<label for="enableInSignatures" class="form-check-label">在用户签名中启用</label>
					</div>
				</div>

				<div class="mb-4">
					<h5 class="fw-bold tracking-tight settings-header">使用说明</h5>
					<div class="alert alert-info">
						<h6>如何使用：</h6>
						<ol>
							<li>在你的Markdown内容中插入 <code>[TOC]</code> 标记</li>
							<li>确保你的内容包含标题（# ## ### 等）</li>
							<li>目录会自动生成并替换 <code>[TOC]</code> 标记</li>
						</ol>
						<h6>示例：</h6>
						<pre><code># 主标题

[TOC]

## 第一章
内容...

### 1.1 小节
内容...

## 第二章
内容...</code></pre>
					</div>
				</div>
			</form>
		</div>

		<!-- IMPORT admin/partials/settings/toc.tpl -->
	</div>
</div> 