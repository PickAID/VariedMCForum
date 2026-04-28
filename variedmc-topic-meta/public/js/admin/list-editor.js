'use strict';

define('admin/plugins/variedmc-topic-meta/list-editor', [
	'admin/plugins/variedmc-topic-meta/utils',
], function (Utils) {
	class ListEditor {
		static fromSettings(settings, includeFallback = true) {
			const lists = Array.isArray(settings && settings.lists) && settings.lists.length ?
				settings.lists.map((list, index) => ListEditor.normalizeList(list, index)) :
				ListEditor.fromModules(settings && settings.modules);
			if (!lists.length && includeFallback) {
				return [ListEditor.normalizeList({
					id: 'topic',
					label: '主题',
					moduleKey: 'topic',
					fieldKey: 'primary',
					selectionKey: 'themes',
					options: settings && settings.themesCatalog,
				})];
			}
			return lists;
		}

		static fromModules(modules) {
			const lists = [];
			(Array.isArray(modules) ? modules : []).forEach((module) => {
				(Array.isArray(module && module.fields) ? module.fields : []).forEach((field) => {
					const selectionKey = Utils.normalizeKey(field.selectionKey) ||
						`${Utils.normalizeKey(module.key)}.${Utils.normalizeKey(field.key || 'primary')}`;
					lists.push(ListEditor.normalizeList({
						...field,
						id: selectionKey === 'themes' ? 'topic' : selectionKey,
						label: field.label || module.label,
						moduleLabel: module.label,
						moduleKey: module.key,
						fieldKey: field.key || 'primary',
						selectionKey,
					}, lists.length));
				});
			});
			return lists;
		}

		static normalizeList(input, index = 0) {
			const raw = input && typeof input === 'object' ? input : {};
			const id = Utils.normalizeKey(raw.id || raw.selectionKey || raw.moduleKey) || `custom-${index + 1}`;
			const label = String(raw.label || raw.moduleLabel || `新列表 ${index + 1}`).trim();
			const moduleKey = Utils.normalizeKey(raw.moduleKey || raw.key || id);
			const fieldKey = Utils.normalizeKey(raw.fieldKey || 'primary') || 'primary';
			const selectionKey = Utils.normalizeKey(raw.selectionKey || id);
			return {
				id,
				label,
				moduleLabel: String(raw.moduleLabel || label).trim(),
				moduleKey,
				fieldKey,
				selectionKey,
				enabled: raw.enabled !== false,
				mode: String(raw.mode || 'multi') === 'single' ? 'single' : 'multi',
				required: !!raw.required,
				titleVisible: raw.titleVisible !== false,
				searchVisible: raw.searchVisible !== false,
				filterable: raw.filterable !== false,
				options: Utils.parseList(Utils.toListValue(raw.options)),
			};
		}

		static defaultList(root, categoryCard) {
			const container = root && root.length ? root : $('#variedmc-topic-meta-lists');
			const index = container.find('[data-meta-list]').length + 1;
			const cid = categoryCard && categoryCard.length ? Utils.normalizeKey(categoryCard.attr('data-cid')) : '';
			const id = cid ? `custom-${index}` : `custom-${index}`;
			const moduleKey = cid ? `category-${cid}-${id}` : id;
			return ListEditor.normalizeList({
				id,
				label: cid ? `本板块列表 ${index}` : `新列表 ${index}`,
				moduleKey,
				fieldKey: 'primary',
				selectionKey: cid ? `${moduleKey}.primary` : id,
				options: [],
			}, index - 1);
		}

		static collect(root) {
			const container = root && root.length ? root : $('#variedmc-topic-meta-lists');
			const seen = new Set();
			return container.find('[data-meta-list]').map(function (index) {
				const card = $(this);
				const label = String(
					card.find('[data-list-field="displayName"]').val() ||
					card.find('[data-list-field="label"]').val() ||
					card.find('[data-list-field="moduleLabel"]').val() ||
					`列表 ${index + 1}`
				).trim();
				const idBase = Utils.normalizeKey(
					card.find('[data-list-field="id"]').val() ||
					card.find('[data-list-field="selectionKey"]').val() ||
					card.find('[data-list-field="moduleKey"]').val() ||
					label
				) || `meta-${index + 1}`;
				let id = idBase;
				let suffix = 2;
				while (seen.has(id)) {
					id = `${idBase}-${suffix}`;
					suffix += 1;
				}
				seen.add(id);
				return ListEditor.normalizeList({
					id,
					label,
					moduleLabel: label,
					moduleKey: card.find('[data-list-field="moduleKey"]').val() || id,
					fieldKey: card.find('[data-list-field="fieldKey"]').val() || 'primary',
					selectionKey: card.find('[data-list-field="selectionKey"]').val() || id,
					enabled: card.find('[data-list-field="enabled"]').prop('checked'),
					mode: card.find('[data-list-field="mode"]').val(),
					required: card.find('[data-list-field="required"]').prop('checked'),
					options: card.find('[data-list-field="options"]').val(),
					titleVisible: card.find('[data-list-field="titleVisible"]').prop('checked'),
					searchVisible: card.find('[data-list-field="searchVisible"]').prop('checked'),
					filterable: card.find('[data-list-field="filterable"]').prop('checked'),
				}, index);
			}).get();
		}

		static toModules(lists) {
			return (Array.isArray(lists) ? lists : []).map(list => ({
				key: list.moduleKey || list.id,
				label: list.label,
				fields: [{
					key: list.fieldKey || 'primary',
					selectionKey: list.selectionKey || list.id,
					label: list.label,
					enabled: list.enabled !== false,
					mode: list.mode,
					required: !!list.required,
					options: list.options || [],
					titleVisible: list.titleVisible !== false,
					searchVisible: list.searchVisible !== false,
					filterable: list.filterable !== false,
				}],
			}));
		}

		static markup(listInput, context = {}) {
			const list = ListEditor.normalizeList(listInput);
			const placeholder = ListEditor.placeholder(list, context);
			const legacyPlaceholder = ListEditor.legacyPlaceholder(list, context);
			const legacyMarkup = legacyPlaceholder && legacyPlaceholder !== placeholder ?
				`<code>{block:${Utils.escapeHtml(legacyPlaceholder)}}</code>` :
				'';
			return `
				<section class="variedmc-topic-meta-list-card" data-meta-list>
					<div class="variedmc-topic-meta-list-head">
						<div>
							<div class="fw-semibold">${Utils.escapeHtml(list.label || 'Meta 列表')}</div>
							<div class="text-muted small">ID: ${Utils.escapeHtml(list.id)}</div>
						</div>
						<button type="button" class="btn btn-light btn-sm" data-action="remove-list">删除</button>
					</div>
					<div class="variedmc-topic-meta-placeholder-help">
						<span class="text-muted small">占位符</span>
						<code>{block:${Utils.escapeHtml(placeholder)}}</code>
						<code>{value:${Utils.escapeHtml(placeholder)}}</code>
						<code>{label:${Utils.escapeHtml(placeholder)}}</code>
						${legacyMarkup}
					</div>
					<div class="variedmc-topic-meta-list-fields">
						<label>
							<span class="form-label">列表 ID</span>
							<input class="form-control form-control-sm" data-list-field="id" value="${Utils.escapeHtml(list.id)}" placeholder="topic" />
						</label>
						<label>
							<span class="form-label">显示名称</span>
							<input class="form-control form-control-sm" data-list-field="displayName" value="${Utils.escapeHtml(list.label)}" placeholder="主题" />
						</label>
						<label>
							<span class="form-label">选择模式</span>
							<select class="form-select form-select-sm" data-list-field="mode">
								<option value="multi" ${list.mode !== 'single' ? 'selected' : ''}>多选</option>
								<option value="single" ${list.mode === 'single' ? 'selected' : ''}>单选</option>
							</select>
						</label>
					</div>
					<label class="d-block">
						<span class="form-label">选项列表</span>
						<textarea class="form-control" rows="5" data-list-field="options" placeholder="每行一个选项">${Utils.escapeHtml((list.options || []).join('\n'))}</textarea>
					</label>
					<div class="variedmc-topic-meta-list-switches">
						<label class="form-check-label"><input class="form-check-input" type="checkbox" data-list-field="enabled" ${list.enabled !== false ? 'checked' : ''} /> 启用</label>
						<label class="form-check-label"><input class="form-check-input" type="checkbox" data-list-field="required" ${list.required ? 'checked' : ''} /> 必填</label>
						<label class="form-check-label"><input class="form-check-input" type="checkbox" data-list-field="titleVisible" ${list.titleVisible !== false ? 'checked' : ''} /> 标题显示</label>
						<label class="form-check-label"><input class="form-check-input" type="checkbox" data-list-field="searchVisible" ${list.searchVisible !== false ? 'checked' : ''} /> 搜索显示</label>
						<label class="form-check-label"><input class="form-check-input" type="checkbox" data-list-field="filterable" ${list.filterable !== false ? 'checked' : ''} /> 可过滤</label>
					</div>
					<div class="d-none" data-role="legacy-list-keys">
						<input data-list-field="moduleLabel" value="${Utils.escapeHtml(list.moduleLabel || list.label)}" />
						<input data-list-field="label" value="${Utils.escapeHtml(list.label)}" />
						<input data-list-field="moduleKey" value="${Utils.escapeHtml(list.moduleKey || list.id)}" />
						<input data-list-field="fieldKey" value="${Utils.escapeHtml(list.fieldKey || 'primary')}" />
						<input data-list-field="selectionKey" value="${Utils.escapeHtml(list.selectionKey || list.id)}" />
					</div>
				</section>
			`;
		}

		static placeholder(list, context = {}) {
			const alias = Utils.normalizeKey(context.categoryAlias);
			const id = Utils.normalizeKey(list.id || list.selectionKey);
			return alias ? `${alias}.${id}` : id;
		}

		static legacyPlaceholder(list, context = {}) {
			const alias = Utils.normalizeKey(context.categoryAlias);
			const moduleKey = Utils.normalizeKey(list.moduleKey || list.id);
			const fieldKey = Utils.normalizeKey(list.fieldKey || 'primary');
			const cid = Utils.normalizeKey(context.cid);
			const prefix = cid ? `category-${cid}-` : '';
			const shortModuleKey = prefix && moduleKey.startsWith(prefix) ? moduleKey.slice(prefix.length) : moduleKey;
			const key = fieldKey ? `${shortModuleKey}.${fieldKey}` : shortModuleKey;
			return alias ? `${alias}.${key}` : key;
		}
	}

	return ListEditor;
});
