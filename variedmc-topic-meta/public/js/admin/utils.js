'use strict';

define('admin/plugins/variedmc-topic-meta/utils', [], function () {
	const Utils = {};

	Utils.normalizeKey = function (value) {
		return String(value || '')
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9_.-]+/g, '-')
			.replace(/^-+|-+$/g, '');
	};

	Utils.parseList = function (value) {
		return String(value || '')
			.split(/[\n,]/)
			.map(item => item.trim())
			.filter(Boolean)
			.filter((item, index, array) => (
				array.findIndex(entry => entry.toLowerCase() === item.toLowerCase()) === index
			));
	};

	Utils.toListValue = function (value) {
		return Array.isArray(value) ? value.join('\n') : String(value || '');
	};

	Utils.escapeHtml = function (value) {
		return String(value || '')
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	};

	Utils.scopeLabel = function (scope) {
		if (scope === 'extend') {
			return '继承并追加';
		}
		if (scope === 'override') {
			return '本板块独立';
		}
		if (scope === 'hidden') {
			return '隐藏面板';
		}
		return '继承父级';
	};

	Utils.fieldRule = function (input) {
		const raw = input && typeof input === 'object' ? input : {};
		return {
			enabled: raw.enabled === undefined ? true : !!raw.enabled,
			mode: String(raw.mode || 'multi') === 'single' ? 'single' : 'multi',
			required: !!raw.required,
			options: Utils.parseList(Utils.toListValue(raw.options)),
		};
	};

	Utils.mergeFieldRules = function (input) {
		const rawRules = input && typeof input === 'object' ? input : {};
		const rules = {};
		Object.keys(rawRules).forEach((key) => {
			const normalized = Utils.normalizeKey(key);
			if (normalized) {
				rules[normalized] = Utils.fieldRule(rawRules[key]);
			}
		});
		return rules;
	};

	Utils.mergeUnique = function (left, right) {
		return Utils.parseList([].concat(left || [], right || []).join('\n'));
	};

	Utils.optionText = function (options) {
		return Utils.parseList(Utils.toListValue(options)).join('\n');
	};

	Utils.getMessage = function (err) {
		if (!err) {
			return '[[error:invalid-data]]';
		}
		return err.message || err;
	};

	return Utils;
});
