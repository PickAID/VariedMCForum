'use strict';

define('admin/plugins/variedmc-rules', ['alerts'], function (alerts) {
	const ACP = {};
	let state = {};

	ACP.init = function () {
		$(document)
			.off('.variedmcRulesAdmin')
			.on('click.variedmcRulesAdmin', '#save', save)
			.on('input.variedmcRulesAdmin', '#variedmc-rules-category-search', filterCategories);
		load();
	};

	function load() {
		socket.emit('plugins.variedmcRules.load', null, function (err, nextState) {
			if (err) {
				alerts.error(err.message || err);
				return;
			}
			state = nextState || {};
			render();
		});
	}

	function render() {
		const settings = state.settings || {};
		const global = settings.globalRule || {};
		$('[data-field="enabled"]').prop('checked', settings.enabled !== false);
		$('[data-field="traceRequired"]').prop('checked', !!global.traceRequired);
		$('[data-field="deletePolicy"]').val(global.deletePolicy || 'normal');
		$('[data-field="deleteGraceHours"]').val(valueOrDefault(global.deleteGraceHours, 0.5));
		$('[data-field="minimumTopicContentLength"]').val(valueOrDefault(global.minimumTopicContentLength, 0));
		$('[data-field="reputationPresets"]').val((settings.reputationPresets || [-5, -10, -20]).join(','));
		renderCategories();
	}

	function renderCategories() {
		const rules = (state.settings && state.settings.categoryRules) || {};
		const rows = (state.categories || []).map(function (category) {
			const rule = rules[String(category.cid)] || {};
			return [
				'<div class="variedmc-rules-category-row" data-cid="', category.cid, '" data-name="', escapeHtml(category.name), '">',
				'<div class="variedmc-rules-category-name" style="padding-left:', category.depth * 16, 'px">', escapeHtml(category.name), '</div>',
				'<select class="form-select form-select-sm" data-rule-field="scope">',
				option('inherit', '继承', rule.scope),
				option('extend', '继承后追加', rule.scope),
				option('override', '本板块独立', rule.scope),
				option('disabled', '禁用', rule.scope),
				'</select>',
				'<select class="form-select form-select-sm" data-rule-field="deletePolicy">',
				option('normal', '普通', rule.deletePolicy),
				option('request-after-grace', '宽限后申请', rule.deletePolicy),
				option('request-only', '总是申请', rule.deletePolicy),
				option('locked', '仅管理删除', rule.deletePolicy),
				'</select>',
				'<input class="form-control form-control-sm" type="number" data-rule-field="deleteGraceHours" value="', valueOrDefault(rule.deleteGraceHours, ''), '" placeholder="0.5" />',
				'<input class="form-control form-control-sm" type="number" data-rule-field="minimumTopicContentLength" value="', valueOrDefault(rule.minimumTopicContentLength, ''), '" placeholder="0" />',
				'<label class="form-check"><input class="form-check-input" type="checkbox" data-rule-field="traceRequired"', rule.traceRequired ? ' checked' : '', ' /> 留痕</label>',
				'</div>',
			].join('');
		});
		$('#variedmc-rules-categories').html(rows.join(''));
	}

	function save() {
		const payload = collect();
		socket.emit('plugins.variedmcRules.save', payload, function (err, nextState) {
			if (err) {
				alerts.error(err.message || err);
				return;
			}
			state = nextState || state;
			render();
			alerts.success('Saved');
		});
	}

	function collect() {
		const categoryRules = {};
		$('.variedmc-rules-category-row').each(function () {
			const row = $(this);
			const cid = row.attr('data-cid');
			categoryRules[cid] = {
				scope: row.find('[data-rule-field="scope"]').val(),
				traceRequired: row.find('[data-rule-field="traceRequired"]').prop('checked'),
				deletePolicy: row.find('[data-rule-field="deletePolicy"]').val(),
				deleteGraceHours: row.find('[data-rule-field="deleteGraceHours"]').val(),
				minimumTopicContentLength: row.find('[data-rule-field="minimumTopicContentLength"]').val(),
			};
		});
		return {
			enabled: $('[data-field="enabled"]').prop('checked'),
			globalRule: {
				traceRequired: $('[data-field="traceRequired"]').prop('checked'),
				deletePolicy: $('[data-field="deletePolicy"]').val(),
				deleteGraceHours: $('[data-field="deleteGraceHours"]').val(),
				minimumTopicContentLength: $('[data-field="minimumTopicContentLength"]').val(),
			},
			reputationPresets: String($('[data-field="reputationPresets"]').val() || '').split(','),
			categoryRules,
		};
	}

	function filterCategories() {
		const query = String($(this).val() || '').toLowerCase();
		$('.variedmc-rules-category-row').each(function () {
			const row = $(this);
			row.toggle(!query || String(row.attr('data-name') || '').toLowerCase().includes(query));
		});
	}

	function option(value, label, selected) {
		return '<option value="' + value + '"' + (value === selected ? ' selected' : '') + '>' + label + '</option>';
	}

	function valueOrDefault(value, fallback) {
		return value === undefined || value === null ? fallback : value;
	}

	function escapeHtml(value) {
		return String(value || '').replace(/[&<>"']/g, function (char) {
			return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
		});
	}

	return ACP;
});
