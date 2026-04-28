'use strict';

define('admin/plugins/variedmc-topic-meta/category-fields', [
	'admin/plugins/variedmc-topic-meta/utils',
	'admin/plugins/variedmc-topic-meta/list-editor',
], function (Utils, ListEditor) {
	class CategoryFields {
		all(settings) {
			return this.normalize(this.builtIn(settings).concat(
				ListEditor.fromSettings(settings).map(list => this.fromList(list))
			));
		}

		builtIn(settings) {
			const builtIn = settings && settings.builtInFields || {};
			const version = builtIn.version || {};
			const loader = builtIn.loader || {};
			return this.normalize([{
				selectionKey: 'versions',
				label: version.label || '版本',
				mode: version.mode,
				options: version.options && version.options.length ? version.options : settings && settings.versionsCatalog,
				enabled: version.enabled !== false,
			}, {
				selectionKey: 'loaders',
				label: loader.label || '运行环境',
				mode: loader.mode,
				options: loader.options && loader.options.length ? loader.options : settings && settings.loadersCatalog,
				enabled: loader.enabled !== false,
			}]);
		}

		fromList(list) {
			return {
				selectionKey: list.selectionKey || list.id,
				label: list.label,
				mode: list.mode,
				options: list.options,
				enabled: list.enabled !== false,
				moduleKey: list.moduleKey,
				fieldKey: list.fieldKey,
			};
		}

		merge(fields, lists, scope) {
			const merged = this.normalize(fields);
			lists.forEach((list) => {
				const next = this.fromList(list);
				const index = merged.findIndex(field => field.selectionKey === next.selectionKey);
				if (index === -1) {
					merged.push(next);
					return;
				}
				merged[index] = {
					...merged[index],
					...next,
					options: scope === 'extend' ? Utils.mergeUnique(merged[index].options, next.options) : next.options,
				};
			});
			return this.normalize(merged);
		}

		normalize(fields) {
			const seen = new Set();
			return (Array.isArray(fields) ? fields : []).map((field) => {
				const selectionKey = Utils.normalizeKey(field && field.selectionKey);
				if (!selectionKey || seen.has(selectionKey) || field.enabled === false) {
					return null;
				}
				seen.add(selectionKey);
				return {
					...field,
					selectionKey,
					mode: String(field.mode || 'multi') === 'single' ? 'single' : 'multi',
					options: Utils.parseList(Utils.toListValue(field.options)),
				};
			}).filter(Boolean);
		}

		markup(cid, field, rule) {
			const selectionKey = Utils.normalizeKey(field && field.selectionKey);
			const label = String(field && field.label || selectionKey || '字段');
			const checkboxId = `variedmc-topic-meta-${selectionKey.replace(/[^a-z0-9_-]+/g, '-')}-${Utils.escapeHtml(String(cid))}`;
			return `
				<section class="variedmc-topic-meta-admin-field" data-meta-rule-field data-selection-key="${Utils.escapeHtml(selectionKey)}" data-field-label="${Utils.escapeHtml(label)}">
					<div class="d-flex justify-content-between align-items-center gap-2 mb-2 flex-wrap">
						<div>
							<div class="fw-semibold">${Utils.escapeHtml(label)}</div>
							<div class="text-muted small">${Utils.escapeHtml(selectionKey)}</div>
						</div>
						<label class="form-check-label small d-inline-flex align-items-center gap-1" for="${checkboxId}">
							<input class="form-check-input m-0" type="checkbox" data-rule-field="fieldRequired" id="${checkboxId}" ${rule.required ? 'checked' : ''} /> 必填
						</label>
					</div>
					<div class="variedmc-topic-meta-list-fields">
						<label><span class="form-label small">启用</span><input class="form-check-input d-block" type="checkbox" data-rule-field="fieldEnabled" ${rule.enabled !== false ? 'checked' : ''} /></label>
						<label>
							<span class="form-label small">选择模式</span>
							<select class="form-select" data-rule-field="fieldMode">
								<option value="multi" ${rule.mode !== 'single' ? 'selected' : ''}>多选</option>
								<option value="single" ${rule.mode === 'single' ? 'selected' : ''}>单选</option>
							</select>
						</label>
					</div>
					<label class="d-block mt-2">
						<span class="form-label small">允许的选项</span>
						<textarea class="form-control" rows="4" data-rule-field="fieldOptions" placeholder="留空表示不额外补充">${Utils.escapeHtml((rule.options || []).join('\n'))}</textarea>
					</label>
				</section>
			`;
		}
	}

	return CategoryFields;
});
