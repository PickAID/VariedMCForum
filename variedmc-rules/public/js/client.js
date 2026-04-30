'use strict';

require(['alerts', 'bootbox', 'composer', 'hooks'], function (alerts, bootbox, composer, hooks) {
	window.VariedMCRulesEditReview.init({ alerts, bootbox, composer, hooks });
	hooks.on('filter:composer.check', checkComposerContentLength);

	function bind() {
		injectModeratorTools();
		window.VariedMCRulesEditReview.bind();
		$(document)
			.off('click.variedmcRules')
			.on('click.variedmcRules', '[data-action="variedmc-request-delete"], .variedmc-request-delete', requestDelete)
			.on('click.variedmcRules', '[data-action="variedmc-request-restore"], .variedmc-request-restore', requestRestore)
			.on('click.variedmcRules', '[data-action="variedmc-governance"], .variedmc-governance', openGovernance)
			.on('click.variedmcRules', '[data-action="variedmc-review-queue"], .variedmc-review-queue-tool', openReviewQueue)
			.on('click.variedmcRules', '[data-action="variedmc-approve-request"]', resolveRequest.bind(null, 'approved'))
			.on('click.variedmcRules', '[data-action="variedmc-reject-request"]', resolveRequest.bind(null, 'rejected'));
	}

	function checkComposerContentLength(payload) {
		const cid = composerCid(payload);
		const rule = ruleForCid(cid);
		const min = Math.max(0, Number(rule && rule.minimumTopicContentLength) || 0);
		if (
			rule &&
			rule.enabled &&
			!window.VariedMCRulesPolicy.canBypassLength(app.user, ajaxify.data, rule) &&
			min > Number(config.minimumPostLength || 0) &&
			Number(payload.bodyLen || 0) < min
		) {
			payload.error = '[[error:content-too-short, ' + min + ']]';
		}
		return payload;
	}

	function composerCid(payload) {
		const container = payload && payload.postContainer;
		return Number(payload && payload.postData && payload.postData.cid) ||
			Number(container && container.find('[component="category-selector-selected"]').attr('data-cid')) ||
			Number(ajaxify.data && ajaxify.data.cid) ||
			0;
	}

	function ruleForCid(cid) {
		const rules = config.variedmcRules || {};
		return rules.rules && rules.rules[String(Number(cid) || 0)] || rules.globalRule || {};
	}

	function requestDelete(event) {
		event.preventDefault();
		requestTopicReview({
			title: '申请删除',
			placeholder: '说明申请删除原因',
			socketMethod: 'plugins.variedmcRules.requestDeleteTopic',
			success: '删除申请已提交',
		});
	}

	function requestRestore(event) {
		event.preventDefault();
		requestTopicReview({
			title: '申请恢复',
			placeholder: '说明申请恢复原因',
			socketMethod: 'plugins.variedmcRules.requestRestoreTopic',
			success: '恢复申请已提交',
		});
	}

	function requestTopicReview(options) {
		const tid = ajaxify.data && ajaxify.data.tid;
		bootbox.prompt({
			title: options.title,
			inputType: 'textarea',
			placeholder: options.placeholder,
			callback: function (reason) {
				if (reason === null) {
					return;
				}
				socket.emit(options.socketMethod, { tid, reason }, function (err) {
					if (err) {
						alerts.error(err.message || err);
						return;
					}
					alerts.success(options.success);
					if (document.body.classList.contains('page-topic')) {
						ajaxify.refresh();
					}
				});
			},
		});
	}

	function openGovernance(event) {
		event.preventDefault();
		withSelectedTopic(function (tid) {
			if (!tid) {
				return;
			}
			showGovernanceDialog(tid);
		});
	}

	function showGovernanceDialog(tid) {
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

	function openReviewQueue(event) {
		event.preventDefault();
		ajaxify.go('review-queue');
	}

	function injectModeratorTools() {
		const list = $('#user-control-list');
		if (!list.length || list.find('[data-variedmc-review-queue]').length || !list.find('a[href$="/flags"]').length) {
			return;
		}
		const item = [
			'<li data-variedmc-review-queue>',
			'<a class="dropdown-item rounded-1 d-flex align-items-center gap-2" href="' + config.relative_path + '/review-queue" role="menuitem">',
			'<i class="fa fa-fw fa-scale-balanced text-secondary"></i> <span>治理队列</span>',
			'</a>',
			'</li>',
		].join('');
		const postQueue = list.find('a[href$="/post-queue"]').closest('li');
		if (postQueue.length) {
			postQueue.after(item);
		} else {
			list.find('a[href$="/flags"]').closest('li').after(item);
		}
	}

	function withSelectedTopic(callback) {
		if (ajaxify.data && ajaxify.data.tid) {
			callback(ajaxify.data.tid);
			return;
		}
		require(['topicSelect'], function (topicSelect) {
			const tids = topicSelect.getSelectedTids();
			if (tids.length !== 1) {
				alerts.error(tids.length ? '请选择一个主题。' : '[[error:no-topics-selected]]');
				callback(null);
				return;
			}
			callback(tids[0]);
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
