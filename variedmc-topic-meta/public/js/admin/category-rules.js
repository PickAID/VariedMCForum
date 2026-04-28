'use strict';

define('admin/plugins/variedmc-topic-meta/category-rules', [
	'admin/plugins/variedmc-topic-meta/utils',
	'admin/plugins/variedmc-topic-meta/list-editor',
	'admin/plugins/variedmc-topic-meta/category-fields',
], function (Utils, ListEditor, CategoryFields) {
	class CategoryRules {
		constructor() {
			this.expandedCids = new Set();
			this.categoryIndex = {};
			this.searchQuery = '';
			this.fields = new CategoryFields();
		}

		setCategories(categories) {
			this.categoryIndex = (categories || []).reduce((index, category) => {
				if (category && category.cid) {
					index[String(category.cid)] = category;
				}
				return index;
			}, {});
		}

		render(categories, settings) {
			const container = $('#variedmc-topic-meta-categories');
			container.empty();
			this.setCategories(categories || []);
			if (!Array.isArray(categories) || !categories.length) {
				this.toggleEmpty(true, '没有读取到任何板块。');
				this.updateCounter(0, 0);
				return;
			}
			categories.forEach((category) => {
				const cid = String(category.cid || '');
				const rule = this.normalizeRule((settings.categoryRules || {})[cid]);
				const card = $(this.categoryMarkup(category, rule, this.expandedCids.has(cid), settings));
				container.append(card);
				this.applyCardState(card);
				this.updateSummary(card);
			});
			this.updateSearch();
		}

		collect(settings) {
			const categoryRules = {};
			const categoryAliases = {};
			$('#variedmc-topic-meta-categories [data-cid]').each((index, element) => {
				const card = $(element);
				const cid = card.attr('data-cid');
				const alias = Utils.normalizeKey(card.find('[data-category-field="alias"]').val()) || `cid-${cid}`;
				const selectedScope = String(card.find('[data-rule-field="scope"]').val() || 'inherit');
				const lists = ListEditor.collect(card.find('[data-category-meta-lists]').first());
				const scope = selectedScope === 'inherit' && lists.length ? 'extend' : selectedScope;
				if (cid && alias) {
					categoryAliases[cid] = alias;
				}
				if (scope === 'inherit') {
					return;
				}
				categoryRules[cid] = {
					scope,
					rulesText: card.find('[data-rule-field="rulesText"]').val(),
					titleTemplate: card.find('[data-rule-field="titleTemplate"]').val(),
					lists,
					modules: ListEditor.toModules(lists),
					fieldRules: this.collectFieldRules(card),
				};
				this.applyLegacyRuleFields(categoryRules[cid]);
			});
			return { categoryRules, categoryAliases };
		}

		collectFieldRules(card) {
			const fieldRules = {};
			card.find('[data-meta-rule-field]').each(function () {
				const field = $(this);
				const selectionKey = Utils.normalizeKey(field.attr('data-selection-key'));
				if (selectionKey) {
					fieldRules[selectionKey] = {
						enabled: field.find('[data-rule-field="fieldEnabled"]').prop('checked'),
						mode: field.find('[data-rule-field="fieldMode"]').val(),
						required: field.find('[data-rule-field="fieldRequired"]').prop('checked'),
						options: Utils.parseList(field.find('[data-rule-field="fieldOptions"]').val()),
					};
				}
			});
			return fieldRules;
		}

		applyLegacyRuleFields(rule) {
			const fields = rule.fieldRules || {};
			[['versions', 'version'], ['loaders', 'loader'], ['themes', 'theme']].forEach(([key, prefix]) => {
				if (fields[key]) {
					rule[`${prefix}Mode`] = fields[key].mode;
					rule[`require${prefix[0].toUpperCase()}${prefix.slice(1)}s`] = fields[key].required;
					rule[`supported${prefix[0].toUpperCase()}${prefix.slice(1)}s`] = fields[key].options;
				}
			});
		}

		categoryMarkup(category, rule, expanded, settings) {
			const cid = String(category.cid || '');
			const alias = this.categoryAlias(settings, category);
			const metaFields = this.categoryFields(settings, category);
			const localLists = ListEditor.fromSettings({ lists: rule.lists, modules: rule.modules }, false);
			const depth = Number.isFinite(Number(category.depth)) ? Number(category.depth) : 0;
			const depthLabel = depth > 0 ? `子板块 · 深度 ${depth}` : '顶级板块';
			const searchText = [
				category.name,
				cid,
				alias,
				rule.rulesText,
				rule.titleTemplate,
				metaFields.map(field => field.label).join(' '),
			].join(' ').toLowerCase();

			return `
				<article class="card variedmc-topic-meta-category ${expanded ? 'is-expanded' : 'is-collapsed'}" data-cid="${Utils.escapeHtml(cid)}" data-search-text="${Utils.escapeHtml(searchText)}" style="--variedmc-topic-meta-depth:${depth};">
					<div class="card-header">
						<div class="variedmc-topic-meta-category-bar">
							<button type="button" class="btn btn-light btn-sm variedmc-topic-meta-category-toggle" data-action="toggle-category" aria-expanded="${expanded ? 'true' : 'false'}">
								<span class="fa fa-chevron-right variedmc-topic-meta-category-toggle-icon"></span>
								<span data-role="toggle-label">${expanded ? '收起' : '展开'}</span>
							</button>
							<div class="variedmc-topic-meta-category-main">
								<div class="variedmc-topic-meta-category-name">${Utils.escapeHtml(category.name || '')}</div>
								<div class="text-muted small">${Utils.escapeHtml(depthLabel)} · CID ${Utils.escapeHtml(cid)} · ID ${Utils.escapeHtml(alias)}</div>
								<div class="text-muted small">继承链: ${Utils.escapeHtml(this.inheritancePath(category))}</div>
								<div class="variedmc-topic-meta-category-summary text-muted small" data-role="summary"></div>
							</div>
							<div class="variedmc-topic-meta-category-controls">
								<span class="badge text-bg-light border align-self-start" data-role="scope-badge">${Utils.escapeHtml(Utils.scopeLabel(rule.scope))}</span>
								<label>
									<span class="form-label small mb-1">板块 ID</span>
									<input type="text" class="form-control form-control-sm" data-category-field="alias" value="${Utils.escapeHtml(alias)}" placeholder="tools" />
								</label>
								<label class="variedmc-topic-meta-scope">
									<span class="form-label small mb-1">规则模式</span>
									<select class="form-select form-select-sm" data-rule-field="scope">
										<option value="inherit" ${rule.scope === 'inherit' ? 'selected' : ''}>继承父级</option>
										<option value="extend" ${rule.scope === 'extend' ? 'selected' : ''}>继承并追加</option>
										<option value="override" ${rule.scope === 'override' ? 'selected' : ''}>本板块独立</option>
										<option value="hidden" ${rule.scope === 'hidden' ? 'selected' : ''}>隐藏面板</option>
									</select>
								</label>
							</div>
						</div>
					</div>
					<div class="card-body variedmc-topic-meta-category-body d-flex flex-column gap-3">
						<label>
							<span class="form-label">标题模板覆盖</span>
							<input type="text" class="form-control" data-rule-field="titleTemplate" value="${Utils.escapeHtml(rule.titleTemplate || '')}" placeholder="留空表示沿用继承链上的标题模板" />
						</label>
						<label>
							<span class="form-label">标题规范</span>
							<textarea class="form-control" rows="3" data-rule-field="rulesText" placeholder="显示在 composer 面板顶部的标题规范">${Utils.escapeHtml(rule.rulesText || '')}</textarea>
						</label>
						<div class="variedmc-topic-meta-category-lists">
							<div class="d-flex justify-content-between align-items-center gap-2 flex-wrap">
								<div>
									<div class="fw-semibold">本板块 meta 列表</div>
									<div class="form-text">新增列表只属于当前板块规则；子板块按继承链继续看到它。</div>
								</div>
								<button type="button" class="btn btn-light btn-sm" data-action="add-category-list">新增本板块列表</button>
							</div>
							<div class="variedmc-topic-meta-list-grid" data-category-meta-lists>
								${localLists.map(list => ListEditor.markup(list, { categoryAlias: alias, cid })).join('')}
							</div>
						</div>
						<div class="variedmc-topic-meta-admin-grid">
							${metaFields.map(field => this.fields.markup(category.cid, field, this.fieldRule(rule, field.selectionKey))).join('')}
						</div>
					</div>
				</article>
			`;
		}

		normalizeRule(input) {
			const raw = input && typeof input === 'object' ? input : {};
			const fieldRules = Utils.mergeFieldRules(raw.fieldRules);
			const lists = ListEditor.fromSettings({ lists: raw.lists, modules: raw.modules }, false);
			const hasOverrides = !!(
				String(raw.rulesText || '').trim() ||
				String(raw.titleTemplate || '').trim() ||
				lists.length ||
				Object.keys(fieldRules).length
			);
			const rawScope = String(raw.scope || '').trim();
			const scope = ['inherit', 'extend', 'override', 'hidden'].includes(rawScope) ?
				rawScope :
				(hasOverrides ? 'override' : 'inherit');

			return {
				scope,
				titleTemplate: String(raw.titleTemplate || ''),
				rulesText: String(raw.rulesText || ''),
				lists,
				modules: ListEditor.toModules(lists),
				fieldRules,
			};
		}

		fieldRule(rule, selectionKey) {
			const key = Utils.normalizeKey(selectionKey);
			const rules = rule && rule.fieldRules && typeof rule.fieldRules === 'object' ? rule.fieldRules : {};
			return rules[key] || { enabled: true, mode: 'multi', required: false, options: [] };
		}

		categoryFields(settings, category) {
			let fields = this.fields.all(settings);
			const rules = settings && settings.categoryRules || {};
			this.categoryChain(category).forEach((cid) => {
				const rule = this.normalizeRule(rules[String(cid)]);
				if (rule.scope === 'inherit') {
					return;
				}
				if (rule.scope === 'hidden') {
					fields = [];
					return;
				}
				if (rule.scope === 'override') {
					fields = this.fields.builtIn(settings);
				}
				fields = this.fields.merge(fields, rule.lists, rule.scope);
			});
			return fields;
		}

		applyCardState(card) {
			const scope = String(card.find('[data-rule-field="scope"]').val() || 'inherit');
			card.toggleClass('is-inherit', scope === 'inherit');
			card.toggleClass('is-extend', scope === 'extend');
			card.toggleClass('is-override', scope === 'override');
			card.toggleClass('is-hidden', scope === 'hidden');
			card.find('[data-role="scope-badge"]').text(Utils.scopeLabel(scope));
			card.find('.variedmc-topic-meta-category-body :input').not('[data-rule-field="scope"]')
				.prop('disabled', scope === 'inherit' || scope === 'hidden');
			card.find('.variedmc-topic-meta-category-lists :input, [data-action="add-category-list"]')
				.prop('disabled', scope === 'hidden');
		}

		setExpanded(card, expanded, persist = true) {
			const cid = String(card.attr('data-cid') || '');
			card.toggleClass('is-expanded', !!expanded);
			card.toggleClass('is-collapsed', !expanded);
			card.find('[data-action="toggle-category"]').attr('aria-expanded', expanded ? 'true' : 'false');
			card.find('[data-role="toggle-label"]').text(expanded ? '收起' : '展开');
			if (persist && cid) {
				if (expanded) {
					this.expandedCids.add(cid);
				} else {
					this.expandedCids.delete(cid);
				}
			}
		}

		setAllExpanded(expanded) {
			$('#variedmc-topic-meta-categories [data-cid]').each((index, element) => {
				this.setExpanded($(element), expanded);
			});
		}

		updateSummary(card) {
			const scope = String(card.find('[data-rule-field="scope"]').val() || 'inherit');
			const count = card.find('[data-category-meta-lists] [data-meta-list]').length;
			const pieces = [Utils.scopeLabel(scope)];
			if (count) {
				pieces.push(`本板块列表${count}组`);
			}
			if (String(card.find('[data-rule-field="titleTemplate"]').val() || '').trim()) {
				pieces.push('自定义标题模板');
			}
			card.find('[data-role="summary"]').text(pieces.join(' · '));
		}

		updateSearch(query) {
			if (query !== undefined) {
				this.searchQuery = String(query || '').trim().toLowerCase();
			}
			const cards = $('#variedmc-topic-meta-categories [data-cid]');
			const terms = this.searchQuery.split(/\s+/).filter(Boolean);
			let visibleCount = 0;
			cards.each((index, element) => {
				const card = $(element);
				const haystack = [card.attr('data-search-text'), card.text()].join(' ').toLowerCase();
				const matches = !terms.length || terms.every(term => haystack.includes(term));
				card.toggleClass('hidden', !matches);
				if (matches) {
					visibleCount += 1;
					this.setExpanded(card, terms.length ? true : this.expandedCids.has(String(card.attr('data-cid'))), false);
				}
			});
			this.toggleEmpty(visibleCount === 0, terms.length ? '没有匹配到板块。' : '没有读取到任何板块。');
			this.updateCounter(visibleCount, cards.length);
		}

		toggleEmpty(visible, message) {
			$('#variedmc-topic-meta-empty').text(message || '没有匹配到板块。').toggleClass('hidden', !visible);
		}

		updateCounter(visibleCount, totalCount) {
			$('#variedmc-topic-meta-category-count').text(`${Number(visibleCount) || 0} / ${Number(totalCount) || 0}`);
		}

		categoryAlias(settings, category) {
			const cid = String(category && category.cid || '');
			const aliases = settings && settings.categoryAliases && typeof settings.categoryAliases === 'object' ?
				settings.categoryAliases :
				{};
			return Utils.normalizeKey(aliases[cid]) || (cid ? `cid-${cid}` : '');
		}

		categoryChain(category) {
			const chain = [];
			const visited = new Set();
			let current = category;
			while (current && current.cid && !visited.has(String(current.cid))) {
				visited.add(String(current.cid));
				chain.unshift(String(current.cid));
				current = this.categoryIndex[String(current.parentCid || '')];
			}
			return chain;
		}

		inheritancePath(category) {
			return ['全局'].concat(this.categoryChain(category).map((cid) => {
				const entry = this.categoryIndex[String(cid)];
				return entry ? String(entry.name || `CID ${cid}`) : `CID ${cid}`;
			})).join(' -> ');
		}
	}

	return CategoryRules;
});
