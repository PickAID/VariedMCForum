(function () {
	'use strict';

	class TopicMetaTitle {
		constructor(domain) {
			this.domain = domain;
		}

		format(baseTitle, metaState, template, context) {
			const tokens = this.tokens(baseTitle, metaState || {}, context || {});
			const rendered = String(template || '{blocks} {title}')
				.replace(/\{(block|value|label):([a-z0-9_.-]+)\}/gi, (match, type, key) => {
					const token = tokens.fieldTokens[this.domain.key(key)];
					return token ? token[String(type).toLowerCase()] || '' : '';
				})
				.replace(/\{(title|versions|loaders|themes|versionsBlock|loadersBlock|themesBlock|blocks|meta)\}/g, (match, key) => (
					Object.prototype.hasOwnProperty.call(tokens, key) ? tokens[key] || '' : ''
				));
			return this.clean(rendered) || tokens.title || tokens.blocks;
		}

		prefix(metaState, context) {
			return this.tokens('', metaState || {}, context || {}).blocks;
		}

		tokens(baseTitle, metaState, context) {
			const fields = this.domain.fields(context.metaFields || metaState.metaFields);
			const versions = this.versions(metaState.versions, context.versionCatalog || metaState.versionCatalog);
			const loaders = this.domain.list(metaState.loaders).join(',');
			const themes = this.domain.list(metaState.themes).join(',');
			const fieldTokens = {};
			const blocks = fields.map(field => this.fieldBlock(metaState, field, context, fieldTokens))
				.filter(Boolean)
				.join('');
			return {
				title: this.domain.text(baseTitle),
				versions,
				loaders,
				themes,
				versionsBlock: versions ? `[${versions}]` : '',
				loadersBlock: loaders ? `[${loaders}]` : '',
				themesBlock: themes ? `[${themes}]` : '',
				blocks,
				meta: blocks,
				fieldTokens,
			};
		}

		fieldBlock(metaState, field, context, tokens) {
			const value = field.selectionKey === 'versions' ?
				this.versions(this.read(metaState, field), context.versionCatalog || metaState.versionCatalog) :
				this.domain.list(this.read(metaState, field)).join(',');
			const token = { value, block: value ? `[${value}]` : '', label: this.domain.text(field.label) };
			this.keys(field, context).forEach((key) => {
				const normalized = this.domain.key(key);
				if (normalized && !tokens[normalized]) {
					tokens[normalized] = token;
				}
			});
			return token.block;
		}

		keys(field, context) {
			const keys = [field.id, field.selectionKey, field.fieldKey];
			const moduleKey = this.domain.key(field.moduleKey);
			const cid = this.domain.cid(context.categoryCid);
			const cidPrefix = cid > 0 ? `category-${cid}-` : '';
			const shortModuleKey = cidPrefix && moduleKey.startsWith(cidPrefix) ? moduleKey.slice(cidPrefix.length) : moduleKey;
			[moduleKey, shortModuleKey].filter(Boolean).forEach((key) => {
				keys.push(field.fieldKey ? `${key}.${field.fieldKey}` : key);
				if (field.fieldKey === 'primary') {
					keys.push(key);
				}
			});
			const alias = this.domain.key(context.categoryAlias);
			return alias ? keys.concat(keys.map(key => `${alias}.${key}`)) : keys;
		}

		read(metaState, field) {
			const source = metaState || {};
			if (field.selectionKey === 'versions') {
				return source.versions || source.version || [];
			}
			if (field.selectionKey === 'loaders') {
				return source.loaders || source.loader || [];
			}
			if (field.selectionKey === 'themes') {
				return source.themes || this.readModule(source, 'topic', 'primary') || [];
			}
			return source.fields && (source.fields[field.selectionKey] || source.fields[field.id]) ||
				this.readModule(source, field.moduleKey, field.fieldKey) ||
				source[field.selectionKey] ||
				source[field.id] ||
				[];
		}

		readModule(source, moduleKey, fieldKey) {
			const modules = source.modules && typeof source.modules === 'object' ? source.modules : {};
			const fields = modules[moduleKey] && typeof modules[moduleKey] === 'object' ? modules[moduleKey] : {};
			return fields[fieldKey];
		}

		versions(input, catalogInput) {
			const values = this.domain.list(input);
			const catalog = this.domain.list(catalogInput);
			const order = new Map(catalog.map((value, index) => [value.toLowerCase(), index]));
			const sorted = values.slice().sort((left, right) => this.compare(left, right, order));
			if (sorted.length < 2 || !catalog.length) {
				return sorted.join(',');
			}
			const groups = [];
			let start = sorted[0];
			let previous = sorted[0];
			for (let index = 1; index < sorted.length; index += 1) {
				const current = sorted[index];
				if (order.get(current.toLowerCase()) - order.get(previous.toLowerCase()) === 1) {
					previous = current;
					continue;
				}
				groups.push(start === previous ? start : `${start}-${previous}`);
				start = current;
				previous = current;
			}
			groups.push(start === previous ? start : `${start}-${previous}`);
			return groups.join(',');
		}

		compare(left, right, order) {
			const leftIndex = order.get(String(left).toLowerCase());
			const rightIndex = order.get(String(right).toLowerCase());
			if (leftIndex !== undefined && rightIndex !== undefined) {
				return leftIndex - rightIndex;
			}
			return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' });
		}

		stripPrefix(title, prefix) {
			const normalizedTitle = this.domain.text(title);
			const normalizedPrefix = this.domain.text(prefix);
			if (!normalizedPrefix) {
				return normalizedTitle;
			}
			if (normalizedTitle === normalizedPrefix) {
				return '';
			}
			return normalizedTitle.startsWith(`${normalizedPrefix} `) ?
				normalizedTitle.slice(normalizedPrefix.length + 1).trim() :
				normalizedTitle;
		}

		preview(value) {
			return this.clean(String(value || '').replace(/【[^】]*】/g, ''));
		}

		clean(value) {
			return String(value || '').replace(/\s+/g, ' ').trim();
		}
	}

	window.VariedMCTopicMetaTitle = new TopicMetaTitle(window.VariedMCTopicMetaDomain);
}());
