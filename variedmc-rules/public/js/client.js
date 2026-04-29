'use strict';

require(['alerts', 'bootbox', 'hooks'], function (alerts, bootbox, hooks) {
	function bind() {
		$(document)
			.off('click.variedmcRules')
			.on('click.variedmcRules', '[data-action="variedmc-request-delete"], .variedmc-request-delete', requestDelete)
			.on('click.variedmcRules', '[data-action="variedmc-governance"], .variedmc-governance', openGovernance)
			.on('click.variedmcRules', '[data-action="variedmc-approve-request"]', resolveRequest.bind(null, 'approved'))
			.on('click.variedmcRules', '[data-action="variedmc-reject-request"]', resolveRequest.bind(null, 'rejected'));
	}

	function requestDelete(event) {
		event.preventDefault();
		const tid = ajaxify.data && ajaxify.data.tid;
		bootbox.prompt({
			title: '申请删除',
			inputType: 'textarea',
			placeholder: '说明申请删除原因',
			callback: function (reason) {
				if (reason === null) {
					return;
				}
				socket.emit('plugins.variedmcRules.requestDeleteTopic', { tid, reason }, function (err) {
					if (err) {
						alerts.error(err.message || err);
						return;
					}
					alerts.success('删除申请已提交');
				});
			},
		});
	}

	function openGovernance(event) {
		event.preventDefault();
		const tid = ajaxify.data && ajaxify.data.tid;
		const html = [
			'<form class="variedmc-governance-form">',
			'<label class="form-label">扣除信誉</label>',
			'<input class="form-control mb-2" name="delta" type="number" max="-1" step="1" placeholder="-10" />',
			'<label class="form-check mb-2"><input class="form-check-input" name="markUntrusted" type="checkbox" /> 标记失信用户</label>',
			'<label class="form-label">原因</label>',
			'<textarea class="form-control" name="reason" rows="4"></textarea>',
			'</form>',
		].join('');
		bootbox.confirm({
			title: '治理操作',
			message: html,
			callback: function (ok) {
				if (!ok) {
					return;
				}
				const form = $('.variedmc-governance-form');
				socket.emit('plugins.variedmcRules.applyGovernanceAction', {
					tid,
					delta: form.find('[name="delta"]').val(),
					markUntrusted: form.find('[name="markUntrusted"]').prop('checked'),
					reason: form.find('[name="reason"]').val(),
				}, function (err) {
					if (err) {
						alerts.error(err.message || err);
						return;
					}
					alerts.success('治理操作已记录');
					ajaxify.refresh();
				});
			},
		});
	}

	function resolveRequest(state, event) {
		event.preventDefault();
		const card = $(event.currentTarget).closest('[data-request-id]');
		const id = card.attr('data-request-id');
		bootbox.prompt({
			title: state === 'approved' ? '批准申请' : '拒绝申请',
			inputType: 'textarea',
			callback: function (resolutionNote) {
				if (resolutionNote === null) {
					return;
				}
				socket.emit('plugins.variedmcRules.resolveRequest', { id, state, resolutionNote }, function (err) {
					if (err) {
						alerts.error(err.message || err);
						return;
					}
					ajaxify.refresh();
				});
			},
		});
	}

	bind();
	hooks.on('action:ajaxify.end', bind);
});
