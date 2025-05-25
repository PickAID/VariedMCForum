<div class="row">
	<div class="col-lg-9">
		<div class="panel panel-default">
			<div class="panel-heading">Markdown Settings</div>
			<div class="panel-body">
				<form role="form" class="markdown-settings">
					
					<div class="form-group">
						<label class="mdl-switch mdl-js-switch mdl-js-ripple-effect" for="useShiki">
							<input type="checkbox" class="mdl-switch__input" id="useShiki" name="useShiki" />
							<span class="mdl-switch__label"><strong>Use Shiki for syntax highlighting</strong></span>
						</label>
						<p class="help-block">Enable Shiki for better syntax highlighting (requires restart)</p>
					</div>

					<div class="form-group">
						<label for="highlightTheme">Light Theme</label>
						<select class="form-control" id="highlightTheme" name="highlightTheme">
							<!-- BEGIN shikiThemes -->
							<option value="{../this}">{../this}</option>
							<!-- END shikiThemes -->
						</select>
					</div>

					<div class="form-group">
						<label for="highlightDarkTheme">Dark Theme</label>
						<select class="form-control" id="highlightDarkTheme" name="highlightDarkTheme">
							<!-- BEGIN shikiThemes -->
							<option value="{../this}">{../this}</option>
							<!-- END shikiThemes -->
						</select>
					</div>

					<div class="form-group">
						<label class="mdl-switch mdl-js-switch mdl-js-ripple-effect" for="checkboxes">
							<input type="checkbox" class="mdl-switch__input" id="checkboxes" name="checkboxes" />
							<span class="mdl-switch__label"><strong>Enable Checkboxes</strong></span>
						</label>
					</div>

					<div class="form-group">
						<label class="mdl-switch mdl-js-switch mdl-js-ripple-effect" for="multimdTables">
							<input type="checkbox" class="mdl-switch__input" id="multimdTables" name="multimdTables" />
							<span class="mdl-switch__label"><strong>Enable Multi-markdown Tables</strong></span>
						</label>
					</div>

				</form>
			</div>
		</div>
	</div>

	<div class="col-lg-3">
		<div class="panel panel-default">
			<div class="panel-heading">Markdown Control Panel</div>
			<div class="panel-body">
				<button class="btn btn-primary" id="save">Save Settings</button>
			</div>
		</div>
	</div>
</div> 