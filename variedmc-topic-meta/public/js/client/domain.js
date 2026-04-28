(function () {
	'use strict';

	class TopicMetaDomain {
		config() {
			return this.normalizeConfig(window.config && window.config.variedmcTopicMeta);
		}

		normalizeConfig(input) {
			const raw = input && typeof input === 'object' ? input : {};
			const versionsCatalog = this.list(raw.versionsCatalog);
			const loadersCatalog = this.list(raw.loadersCatalog);
			const themesCatalog = this.list(raw.themesCatalog);
			const lists = this.lists(raw, themesCatalog, true);
			return {
				defaultTitleTemplate: this.text(raw.defaultTitleTemplate) || '{blocks} {title}',
				versionsCatalog,
				loadersCatalog,
				themesCatalog,
				builtInFields: raw.builtInFields || {},
				lists,
				categoryAliases: raw.categoryAliases || {},
				categoryHierarchy: raw.categoryHierarchy || {},
				categoryRules: raw.categoryRules || {},
			};
		}

		resolveCategoryRule(cid) {
			const config = this.config();
			let rule = this.globalRule(config);
			this.categoryChain(cid, config.categoryHierarchy).forEach((currentCid) => {
				rule = this.applyRule(config, rule, this.normalizeRule(config.categoryRules[String(currentCid)]), currentCid);
			});
			return {
				...rule,
				cid: this.cid(cid),
				categoryAlias: this.categoryAlias(config, cid),
				fields: this.legacyFields(rule.metaFields),
			};
		}

		globalRule(config) {
			const metaFields = this.fields([this.builtIn(config, 'versions'), this.builtIn(config, 'loaders')]
				.concat(config.lists.map(list => this.fieldFromList(list))));
			return {
				scope: 'global',
				enabled: true,
				rulesText: '',
				titleTemplate: config.defaultTitleTemplate,
				metaFields,
			};
		}

		builtInOnlyRule(config) {
			return {
				scope: 'built-in',
				enabled: true,
				rulesText: '',
				titleTemplate: config.defaultTitleTemplate,
				metaFields: this.fields([this.builtIn(config, 'versions'), this.builtIn(config, 'loaders')]),
			};
		}

		applyRule(config, base, rule, cid) {
			if (rule.scope === 'inherit') {
				return { ...base, scope: 'inherit', cid };
			}
			if (rule.scope === 'hidden') {
				return { scope: 'hidden', cid, enabled: false, rulesText: base.rulesText, titleTemplate: base.titleTemplate, metaFields: [] };
			}
			const seed = rule.scope === 'extend' ? base : this.builtInOnlyRule(config);
			const merged = this.mergeFields(seed.metaFields, rule.lists.map(list => this.fieldFromList(list)), rule.scope);
			return {
				scope: rule.scope,
				cid,
				enabled: true,
				rulesText: rule.scope === 'extend' ? [seed.rulesText, rule.rulesText].filter(Boolean).join('\n') : rule.rulesText,
				titleTemplate: this.text(rule.titleTemplate) || seed.titleTemplate || config.defaultTitleTemplate,
				metaFields: this.applyFieldRules(merged, rule.fieldRules, rule.scope),
			};
		}

		builtIn(config, key) {
			const source = key === 'versions' ? config.builtInFields.version || {} : config.builtInFields.loader || {};
			const fallback = key === 'versions' ? config.versionsCatalog : config.loadersCatalog;
			return {
				id: key,
				selectionKey: key,
				fieldKey: key === 'versions' ? 'version' : 'loader',
				label: source.label || (key === 'versions' ? '版本' : '运行环境'),
				mode: source.mode,
				required: source.required,
				options: source.options && source.options.length ? source.options : fallback,
				enabled: source.enabled !== false,
				builtIn: true,
			};
		}

		normalizeRule(input) {
			const raw = input && typeof input === 'object' ? input : {};
			const lists = this.lists(raw, [], false);
			const scope = ['inherit', 'extend', 'override', 'hidden'].includes(raw.scope) ?
				raw.scope :
				(lists.length || raw.rulesText || raw.titleTemplate ? 'override' : 'inherit');
			return {
				scope: scope === 'inherit' && lists.length ? 'extend' : scope,
				rulesText: this.text(raw.rulesText),
				titleTemplate: this.text(raw.titleTemplate),
				lists,
				fieldRules: this.fieldRules(raw.fieldRules),
			};
		}

		lists(input, themesCatalog, includeFallback) {
			const rawLists = Array.isArray(input.lists) && input.lists.length ?
				input.lists :
				this.listsFromModules(input.modules, themesCatalog, includeFallback !== false);
			return rawLists.map((list, index) => this.normalizeList(list, index)).filter(Boolean);
		}

		listsFromModules(modules, themesCatalog, includeFallback) {
			if ((!Array.isArray(modules) || !modules.length) && !includeFallback) {
				return [];
			}
			const source = Array.isArray(modules) && modules.length ? modules : [{
				key: 'topic',
				label: '主题',
				fields: [{ key: 'primary', selectionKey: 'themes', label: '主题', options: themesCatalog }],
			}];
			const lists = [];
			source.forEach((module) => {
				(Array.isArray(module.fields) ? module.fields : []).forEach((field) => {
					const selectionKey = this.key(field.selectionKey || `${module.key}.${field.key || 'primary'}`);
					lists.push(this.normalizeList({
						...field,
						id: selectionKey === 'themes' ? 'topic' : selectionKey,
						label: field.label || module.label,
						moduleKey: module.key,
						fieldKey: field.key || 'primary',
						selectionKey,
					}, lists.length));
				});
			});
			return lists;
		}

		normalizeList(input, index) {
			const raw = input && typeof input === 'object' ? input : {};
			const id = this.key(raw.id || raw.selectionKey || raw.moduleKey) || `meta-${index + 1}`;
			return {
				id,
				selectionKey: this.key(raw.selectionKey || id),
				moduleKey: this.key(raw.moduleKey || id),
				fieldKey: this.key(raw.fieldKey || 'primary') || 'primary',
				label: this.text(raw.label || raw.moduleLabel) || id,
				mode: raw.mode === 'single' ? 'single' : 'multi',
				required: !!raw.required,
				options: this.list(raw.options),
				enabled: raw.enabled !== false,
				titleVisible: raw.titleVisible !== false,
			};
		}

		fieldFromList(list) {
			return {
				...list,
				key: list.selectionKey,
				enabled: list.enabled !== false,
			};
		}

		fields(input) {
			const seen = new Set();
			return (Array.isArray(input) ? input : []).map((field) => {
				const selectionKey = this.key(field && (field.selectionKey || field.id || field.key));
				if (!selectionKey || seen.has(selectionKey) || field.enabled === false) {
					return null;
				}
				seen.add(selectionKey);
				return {
					...field,
					id: this.key(field.id || (selectionKey === 'themes' ? 'topic' : selectionKey)),
					key: selectionKey,
					selectionKey,
					fieldKey: this.key(field.fieldKey || field.key || selectionKey),
					moduleKey: this.key(field.moduleKey),
					label: this.text(field.label) || selectionKey,
					mode: field.mode === 'single' ? 'single' : 'multi',
					options: this.list(field.options),
					enabled: true,
				};
			}).filter(Boolean);
		}

		mergeFields(baseFields, additions, scope) {
			const merged = this.fields(baseFields);
			this.fields(additions).forEach((field) => {
				const index = merged.findIndex(entry => entry.selectionKey === field.selectionKey);
				if (index === -1) {
					merged.push(field);
					return;
				}
				merged[index] = {
					...merged[index],
					...field,
					options: scope === 'extend' ? this.mergeList(merged[index].options, field.options) : field.options,
				};
			});
			return this.fields(merged);
		}

		applyFieldRules(fields, rules, scope) {
			const normalizedRules = this.fieldRules(rules);
			return this.fields(fields).map((field) => {
				const rule = normalizedRules[field.selectionKey] || normalizedRules[field.id];
				if (!rule) {
					return field;
				}
				if (rule.enabled === false) {
					return null;
				}
				const options = scope === 'extend' ? this.mergeList(field.options, rule.options) : (rule.options.length ? rule.options : field.options);
				return { ...field, mode: rule.mode || field.mode, required: !!rule.required, options };
			}).filter(Boolean);
		}

		fieldRules(input) {
			const raw = input && typeof input === 'object' ? input : {};
			const rules = {};
			Object.keys(raw).forEach((key) => {
				const normalized = this.key(key);
				if (normalized) {
					rules[normalized] = {
						enabled: raw[key].enabled === undefined ? true : !!raw[key].enabled,
						mode: raw[key].mode === 'single' ? 'single' : 'multi',
						required: !!raw[key].required,
						options: this.list(raw[key].options),
					};
				}
			});
			return rules;
		}

		legacyFields(metaFields) {
			const map = {};
			this.fields(metaFields).forEach((field) => {
				map[field.selectionKey] = field;
				map[field.id] = map[field.id] || field;
			});
			return {
				versions: map.versions || { options: [] },
				loaders: map.loaders || { options: [] },
				themes: map.themes || map.topic || { options: [] },
				...map,
			};
		}

		categoryChain(cid, hierarchy) {
			const chain = [];
			const seen = new Set();
			let current = this.cid(cid);
			while (current > 0 && !seen.has(current)) {
				seen.add(current);
				chain.unshift(current);
				current = this.cid(hierarchy && hierarchy[String(current)]);
			}
			return chain;
		}

		categoryAlias(config, cid) {
			const normalizedCid = String(this.cid(cid));
			return this.key(config.categoryAliases && config.categoryAliases[normalizedCid]) || (normalizedCid === '0' ? '' : `cid-${normalizedCid}`);
		}

		list(input) {
			const seen = new Set();
			return (Array.isArray(input) ? input : String(input || '').split(/[\n,]/)).map(item => (
				this.text(item && typeof item === 'object' ? item.value || item.label : item)
			)).filter((item) => {
				const key = item.toLowerCase();
				if (!item || seen.has(key)) {
					return false;
				}
				seen.add(key);
				return true;
			});
		}

		mergeList(left, right) {
			return this.list([].concat(this.list(left), this.list(right)));
		}

		text(value) {
			return String(value || '').trim();
		}

		key(value) {
			return this.text(value).toLowerCase().replace(/[^a-z0-9_.-]+/g, '-').replace(/^-+|-+$/g, '');
		}

		cid(value) {
			const parsed = parseInt(value, 10);
			return Number.isFinite(parsed) ? parsed : 0;
		}

	}

	window.VariedMCTopicMetaDomain = new TopicMetaDomain();
}());
