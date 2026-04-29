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
		bootbox.alert('治理操作会在下一阶段接入扣信誉和失信标记。');
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
