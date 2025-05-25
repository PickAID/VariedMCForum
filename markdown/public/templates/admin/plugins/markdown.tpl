<div class="acp-page-container">
	<!-- IMPORT admin/partials/settings/header.tpl -->

	<div class="row m-0">
		<div id="spy-container" class="col-12 col-md-8 px-0 mb-4" tabindex="0">
			<form class="form markdown-settings">
				<div class="mb-4">
					<h5 class="fw-bold tracking-tight settings-header">Parser</h5>

					<div class="mb-3 form-check form-switch">
						<input type="checkbox" class="form-check-input" name="xhtmlOut" id="xhtmlOut" />
						<label class="form-check-label" for="xhtmlOut">
							Use '/' to close single tags (<code>&lt;br /&gt;</code>)
						</label>
					</div>
					<div class="mb-3 form-check form-switch">
						<input type="checkbox" class="form-check-input" name="breaks" id="breaks" />
						<label class="form-check-label" for="breaks">
							Treat newlines as single line breaks
						</label>
					</div>
					<div class="mb-3 form-check form-switch">
						<input type="checkbox" class="form-check-input" name="typographer" id="typographer" />
						<label class="form-check-label" for="typographer">
							Enable smartypants and other sweet transforms (e.g. <code>(c)</code> &rarr; <code>&copy;</code>)
						</label>
					</div>
					<div class="mb-3 form-check form-switch">
						<input type="checkbox" class="form-check-input" name="multimdTables" id="multimdTables" />
						<label class="form-check-label" for="multimdTables">
							Allow advanced table syntax
						</label>
					</div>

					<div class="mb-3 form-check form-switch">
						<input type="checkbox" class="form-check-input" name="linkify" id="linkify" />
						<label class="form-check-label" for="linkify">
							Autoconvert url-like texts to links
						</label>
					</div>
					<div class="mb-3 form-check form-switch">
						<input type="checkbox" class="form-check-input" name="allowRTLO" id="allowRTLO" />
						<label class="form-check-label" for="allowRTLO">
							Allow RTL override unicode in link content
						</label>
					</div>
					<div class="mb-3 form-check form-switch">
						<input type="checkbox" class="form-check-input" name="checkboxes" id="checkboxes" />
						<label class="form-check-label" for="checkboxes">
							Interpret <code>[ ]</code> and <code>[x]</code> as checkboxes
						</label>
					</div>
				</div>

				<div class="mb-4">
					<h5 class="fw-bold tracking-tight settings-header">External Links</h5>

					<div class="mb-3 form-check form-switch">
						<input type="checkbox" class="form-check-input" name="externalMark" id="externalMark" />
						<label class="form-check-label" for="externalMark">
							Append a <i class="fa fa-external-link small"></i> to all external links
						</label>
					</div>
					<div class="mb-3 form-check form-switch">
						<input type="checkbox" class="form-check-input" name="externalBlank" id="externalBlank" />
						<label class="form-check-label" for="externalBlank">
							Open external links in a new tab/window
						</label>
					</div>
					<div class="mb-3 form-check form-switch">
						<input type="checkbox" class="form-check-input" name="nofollow" id="nofollow" />
						<label class="form-check-label" for="nofollow">
							Tell web crawlers that external links are not to be followed
						</label>
					</div>
				</div>

				<div class="mb-4">
					<h5 class="fw-bold tracking-tight settings-header">Code Formatting</h5>

					<div class="mb-3 form-check form-switch">
						<input type="checkbox" class="form-check-input" name="highlight" id="highlight" />
						<label class="form-check-label" for="highlight">
							Automatically detect and highlight code blocks
						</label>
					</div>

					<div class="mb-3 form-check form-switch">
						<input type="checkbox" class="form-check-input" name="useShiki" id="useShiki" />
						<label class="form-check-label" for="useShiki">
							Use Shiki for syntax highlighting (VitePress-style features)
						</label>
						<p class="form-text">
							Enables advanced features like line highlighting, focus, diff markers, and better syntax highlighting
						</p>
					</div>

					<div class="mb-3">
						<label class="form-label" for="highlightTheme">Light theme for highlighted code blocks</label>
						<select class="form-select" name="highlightTheme" id="highlightTheme">
							<option value="github-light">GitHub Light</option>
							<option value="github-dark">GitHub Dark</option>
							<option value="vitesse-light">Vitesse Light</option>
							<option value="vitesse-dark">Vitesse Dark</option>
							<option value="one-light">One Light</option>
							<option value="one-dark-pro">One Dark Pro</option>
							<option value="material-theme-lighter">Material Theme Lighter</option>
							<option value="material-theme-darker">Material Theme Darker</option>
							{{{ each themes }}}
							<option value="{@value}">{@value}</option>
							{{{ end }}}
						</select>
					</div>

					<div class="mb-3">
						<label class="form-label" for="highlightDarkTheme">Dark theme for highlighted code blocks</label>
						<select class="form-select" name="highlightDarkTheme" id="highlightDarkTheme">
							<option value="github-dark">GitHub Dark</option>
							<option value="github-light">GitHub Light</option>
							<option value="vitesse-dark">Vitesse Dark</option>
							<option value="vitesse-light">Vitesse Light</option>
							<option value="one-dark-pro">One Dark Pro</option>
							<option value="one-light">One Light</option>
							<option value="material-theme-darker">Material Theme Darker</option>
							<option value="material-theme-lighter">Material Theme Lighter</option>
							{{{ each themes }}}
							<option value="{@value}">{@value}</option>
							{{{ end }}}
						</select>
					</div>

					<div class="mb-3">
						<label class="form-label" for="defaultHighlightLanguage">
							Default language for code blocks with no language defined
						</label>
						<input class="form-control" placeholder="e.g. js" type="text" name="defaultHighlightLanguage" id="defaultHighlightLanguage" />
						<p class="form-text">Leave blank to use auto-language detection</p>
					</div>

					<div class="mb-3">
						<label class="form-label" for="langPrefix">
							Prefix for <code>code</code> blocks
						</label>
						<input class="form-control" placeholder="language-" type="text" name="langPrefix" id="langPrefix" />
					</div>

					<div class="alert alert-info">
						<h6><i class="fa fa-info-circle"></i> Shiki Features</h6>
						<p>When Shiki is enabled, you can use the following features in your code blocks:</p>
						<ul>
							<li><strong>Line highlighting:</strong> <code>```js{1,3-5}</code></li>
							<li><strong>Line numbers:</strong> <code>```js:line-numbers</code> or <code>```js:line-numbers=10</code></li>
							<li><strong>Focus lines:</strong> Add <code>// [!code focus]</code> to any line</li>
							<li><strong>Diff markers:</strong> Add <code>// [!code ++]</code> or <code>// [!code --]</code></li>
							<li><strong>Error/Warning:</strong> Add <code>// [!code error]</code> or <code>// [!code warning]</code></li>
						</ul>
					</div>

					<div class="mb-3">
						<label class="form-label" for="hljsLanguages">Apply syntax highlighting to the following languages</label>
						<select class="form-select" multiple="true" name="hljsLanguages" id="hljsLanguages" size="20">
							<optgroup label="Pre-defined lists">
								<option value="all">All supported languages (greatest file size)</option>
								<option value="common" selected>Common languages (a good compromise)</option>
							</optgroup>
							<optgroup label="Individual languages">
								{{{ each hljsLanguages }}}
								<option value="{@value}">{@value}</option>
								{{{ end }}}
							</optgroup>
						</select>
						<p class="form-text">
							You can use <code>ctrl</code> and <code>shift</code> to select/deselect multiple
							items and select/deselect items in ranges. <em>(Default: "Common languages".)</em>
						</p>
						<p class="form-text">
							You are able to mix and match any of the items above, although "All" will include
							everything anyway.
						</p>
					</div>

					<div class="mb-3">
						<label class="form-label" for="highlightLinesLanguageList">
							Enable line numbers for the following languages
						</label>
						<select class="form-select" multiple="true" name="highlightLinesLanguageList" id="highlightLinesLanguageList" size="20">
							{{{ each hljsLanguages }}}
							<option value="{@value}">{@value}</option>
							{{{ end }}}
						</select>
						<p class="form-text">
							You can use <code>ctrl</code> and <code>shift</code> to select/deselect multiple
							items and select/deselect items in ranges.
						</p>
					</div>
				</div>

				<div class="mb-4">
					<h5 class="fw-bold tracking-tight settings-header">HTML Sanitization</h5>

					<div class="mb-3 form-check form-switch">
						<input type="checkbox" class="form-check-input" name="html" id="html" />
						<label class="form-check-label" for="html">
							Allow HTML
						</label>
					</div>
					<div class="alert alert-warning">
						<strong><i class="fa fa-info-circle"></i> History</strong>
						<p>
							Automatic HTML sanitization is an important part of ensuring that
							your users do not run arbitrary javascript or alter parts of the
							page that were not meant to be altered.
						</p>
						<p>
							This used to be the sole line of defense from rogue HTML in user-generated content.
							However, NodeBB now comes with its own built-in HTML sanitizer so it is safe to disable this one if necessary.
						</p>
					</div>
				</div>
			</form>
		</div>

		<!-- IMPORT admin/partials/settings/toc.tpl -->
	</div>
</div>