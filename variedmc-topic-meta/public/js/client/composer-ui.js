(function () {
	'use strict';

	class TopicMetaComposerUI {
		constructor(domain, title) {
			this.domain = domain;
			this.title = title;
		}

		render(postContainer, state) {
			const existingPreview = postContainer.find('[component="variedmc/topic-meta-preview"]');
			const existingPanel = postContainer.find('[component="variedmc/topic-meta"]');
			if (!state.rule || !state.rule.enabled) {
				existingPreview.remove();
				existingPanel.remove();
				this.titleSlot(postContainer).removeClass('variedmc-topic-meta-title-layout');
				return;
			}
			const preview = existingPreview.length ? existingPreview : $('<div component="variedmc/topic-meta-preview" class="variedmc-topic-meta-preview-panel"></div>');
			const panel = existingPanel.length ? existingPanel : $('<div component="variedmc/topic-meta" class="variedmc-topic-meta-panel mt-2"></div>');
			this.mountPreview(postContainer, preview);
			this.mountPanel(postContainer, panel);
			preview.html(this.previewMarkup());
			panel.html(this.panelMarkup(state));
			panel.off('.variedmcTopicMeta').on('change.variedmcTopicMeta', '[data-meta-field]', (event) => {
				this.handleSelection($(event.currentTarget), state);
				state.selected = this.constrain(state.selected, state.rule);
				this.render(postContainer, state);
			});
			this.updatePreview(postContainer, state);
		}

		mountPreview(postContainer, preview) {
			const titleSlot = this.titleSlot(postContainer);
			if (titleSlot.length) {
				titleSlot.addClass('variedmc-topic-meta-title-layout');
				const quickSearch = titleSlot.children('.quick-search-container').first();
				if (quickSearch.length) {
					quickSearch.before(preview);
				} else {
					titleSlot.append(preview);
				}
				return;
			}
			const titleContainer = postContainer.find('.title-container').first();
			(titleContainer.length ? titleContainer : postContainer).before(preview);
		}

		mountPanel(postContainer, panel) {
			const titleContainer = postContainer.find('.title-container').first();
			if (titleContainer.length) {
				titleContainer.after(panel);
				return;
			}
			const tagRow = postContainer.find('.tag-row').first();
			if (tagRow.length) {
				tagRow.before(panel);
				return;
			}
			postContainer.find('.composer-formatting-bar, .write-container').first().before(panel);
		}

		previewMarkup() {
			return '<div class="variedmc-topic-meta-previewline"><div class="variedmc-topic-meta-preview" data-role="title-preview"></div></div>';
		}

		panelMarkup(state) {
			const fields = this.fields(state.rule).map(field => this.fieldMarkup(state.uuid, field, state.selected[field.selectionKey] || []))
				.filter(Boolean)
				.join('');
			const rulesText = state.rule.rulesText ?
				`<div class="variedmc-topic-meta-note" role="note"><div class="variedmc-topic-meta-note-label">标题规范</div><div class="variedmc-topic-meta-note-body">${this.escape(state.rule.rulesText).replace(/\n/g, '<br>')}</div></div>` :
				'';
			return `<div class="variedmc-topic-meta-shell">${rulesText}<div class="variedmc-topic-meta-inline-list">${fields}</div></div>`;
		}

		fieldMarkup(uuid, field, selectedValues) {
			if (!field || !field.enabled) {
				return '';
			}
			const options = (field.options || []).map((option) => {
				const checked = selectedValues.includes(option);
				const type = field.mode === 'single' ? 'radio' : 'checkbox';
				return `<label class="variedmc-topic-meta-chip ${checked ? 'is-active' : ''}"><input class="d-none" type="${type}" name="variedmc-topic-meta-${this.escape(uuid)}-${this.escape(field.selectionKey)}" data-meta-field="${this.escape(field.selectionKey)}" data-meta-value="${this.escape(option)}" ${checked ? 'checked' : ''}/><span>${this.escape(option)}</span></label>`;
			}).join('');
			return `<section class="variedmc-topic-meta-inline-field"><div class="variedmc-topic-meta-inline-label">${this.escape(field.label)}${field.required ? '<span class="variedmc-topic-meta-inline-required">*</span>' : ''}</div><div class="variedmc-topic-meta-options">${options}</div></section>`;
		}

		handleSelection(input, state) {
			const key = String(input.attr('data-meta-field') || '');
			const value = String(input.attr('data-meta-value') || '');
			const field = this.fields(state.rule).find(entry => entry.selectionKey === key);
			if (!field || !field.enabled) {
				return;
			}
			if (field.mode === 'single') {
				state.selected[key] = input.prop('checked') ? [value] : [];
			} else if (input.prop('checked')) {
				state.selected[key] = state.selected[key] || [];
				if (!state.selected[key].includes(value)) {
					state.selected[key].push(value);
				}
			} else {
				state.selected[key] = (state.selected[key] || []).filter(entry => entry !== value);
			}
		}

		updatePreview(postContainer, state) {
			const baseTitle = String(this.titleInput(postContainer).val() || '').trim();
			const metaState = {
				...state.selected,
				modules: this.selectedModules(state.rule, state.selected),
				fields: state.selected,
			};
			const preview = this.title.format(baseTitle, metaState, state.rule.titleTemplate, this.context(state.rule)) || '未填写标题';
			postContainer.find('[component="variedmc/topic-meta-preview"] [data-role="title-preview"]').text(this.title.preview(preview) || '未填写标题');
		}

		validate(rule, selected) {
			this.fields(rule).forEach((field) => {
				const values = selected[field.selectionKey] || [];
				if (field.required && values.length === 0) {
					throw new Error(`请选择至少一个${field.label}`);
				}
				if (field.mode === 'single' && values.length > 1) {
					throw new Error(`${field.label} 只允许选择一个`);
				}
			});
		}

		constrain(selected, rule) {
			const next = {};
			this.fields(rule).forEach((field) => {
				const allowed = new Set((field.options || []).map(option => option.toLowerCase()));
				next[field.selectionKey] = this.domain.list(selected[field.selectionKey])
					.filter(value => allowed.has(value.toLowerCase()));
			});
			return next;
		}

		initialSelection(storedMeta) {
			const selected = {
				versions: this.domain.list(storedMeta.versions),
				loaders: this.domain.list(storedMeta.loaders),
				themes: this.domain.list(storedMeta.themes),
				...(storedMeta.fields || {}),
			};
			Object.keys(storedMeta.modules || {}).forEach((moduleKey) => {
				Object.keys(storedMeta.modules[moduleKey] || {}).forEach((fieldKey) => {
					const selectionKey = moduleKey === 'topic' && fieldKey === 'primary' ? 'themes' : `${moduleKey}.${fieldKey}`;
					selected[selectionKey] = this.domain.list(storedMeta.modules[moduleKey][fieldKey]);
				});
			});
			return selected;
		}

		selectedModules(rule, selected) {
			const modules = {};
			this.fields(rule).forEach((field) => {
				if (field.moduleKey && field.fieldKey) {
					modules[field.moduleKey] = modules[field.moduleKey] || {};
					modules[field.moduleKey][field.fieldKey] = this.domain.list(selected[field.selectionKey]);
				}
			});
			return modules;
		}

		fields(rule) {
			return this.domain.fields(rule && rule.metaFields);
		}

		context(rule) {
			return {
				versionCatalog: rule.fields.versions.options,
				metaFields: rule.metaFields,
				categoryAlias: rule.categoryAlias,
				categoryCid: rule.cid,
			};
		}

		titleInput(postContainer) {
			return postContainer.find('[data-component="composer/title"] .title, [component="composer/title"], [name="title"], #title').first();
		}

		titleSlot(postContainer) {
			return postContainer.find('[data-component="composer/title"]').first();
		}

		escape(value) {
			return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
				.replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
		}
	}

	window.VariedMCTopicMetaComposerUI = new TopicMetaComposerUI(
		window.VariedMCTopicMetaDomain,
		window.VariedMCTopicMetaTitle
	);
}());
