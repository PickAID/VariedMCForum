(function () {
	'use strict';

	const state = {
		alerts: null,
		bootbox: null,
		composer: null,
		editRequests: {},
		previewDrafts: {},
		previewUuids: {},
	};

	function init(deps) {
		state.alerts = deps.alerts;
		state.bootbox = deps.bootbox;
		state.composer = deps.composer;
		document.addEventListener('click', interceptSubmit, true);
		document.addEventListener('keydown', interceptHotkey, true);
		deps.hooks.on('action:composer.discard', clearComposerState);
		$(window).off('action:composer.loaded.variedmcRulesEdit')
			.on('action:composer.loaded.variedmcRulesEdit', markPreviewComposer);
	}

	function bind() {
		$(document)
			.off('click.variedmcRulesEdit')
			.on('click.variedmcRulesEdit', '[component="variedmc/request-edit"], .variedmc-request-edit', requestEdit)
			.on('click.variedmcRulesEdit', '[data-action="variedmc-preview-edit-request"]', previewEditRequest);
	}

	function requestEdit(event) {
		event.preventDefault();
		const tid = ajaxify.data && ajaxify.data.tid;
		const pid = ajaxify.data && ajaxify.data.mainPid || $('[component="post"][data-index="0"]').attr('data-pid');
		if (!tid || !pid) {
			state.alerts.error('[[error:invalid-data]]');
			return;
		}
		chooseEditReason(function (reason) {
			if (reason === null) {
				return;
			}
			socket.emit('plugins.variedmcRules.getLatestEditTopicRequest', { tid }, function (err, draft) {
				if (err) {
					state.alerts.error(err.message || err);
					return;
				}
				state.editRequests[String(pid)] = reason;
				state.composer.editPost(utils().buildEditComposerPayload(pid, draft));
			});
		});
	}

	function chooseEditReason(callback) {
		const html = [
			'<form class="variedmc-edit-reason-form">',
			'<label class="form-label">申请理由</label>',
			'<select class="form-select mb-2" name="preset">',
			'<option value="修正错误">修正错误</option>',
			'<option value="补充信息">补充信息</option>',
			'<option value="更新状态">更新状态</option>',
			'<option value="其他">其他</option>',
			'</select>',
			'<textarea class="form-control" name="detail" rows="3" placeholder="可补充具体说明"></textarea>',
			'</form>',
		].join('');
		state.bootbox.confirm({
			title: '申请编辑理由',
			message: html,
			callback: function (ok) {
				if (!ok) {
					callback(null);
					return;
				}
				const form = $('.variedmc-edit-reason-form');
				const preset = form.find('[name="preset"]').val();
				const detail = form.find('[name="detail"]').val().trim();
				callback(detail ? `${preset}：${detail}` : preset);
			},
		});
	}

	function interceptSubmit(event) {
		const button = event.target && event.target.closest('.composer-submit');
		if (!button) {
			return;
		}
		const preview = activePreviewComposer(button.closest('.composer'));
		if (preview) {
			return stopComposerSubmit(event);
		}
		const data = activeEditRequestData(button.closest('.composer'));
		if (data) {
			stopComposerSubmit(event);
			submitEditRequest(data.uuid, data.postData, data.container, button);
		}
	}

	function interceptHotkey(event) {
		if (event.key !== 'Enter' || (!event.metaKey && !event.ctrlKey)) {
			return;
		}
		const containerEl = event.target && event.target.closest('.composer');
		if (activePreviewComposer(containerEl)) {
			return stopComposerSubmit(event);
		}
		const data = activeEditRequestData(containerEl);
		if (data) {
			stopComposerSubmit(event);
			submitEditRequest(data.uuid, data.postData, data.container, data.container.find('.composer-submit').get(0));
		}
	}

	function stopComposerSubmit(event) {
		event.preventDefault();
		event.stopImmediatePropagation();
	}

	function activeEditRequestData(containerEl) {
		const container = $(containerEl);
		const uuid = container.attr('data-uuid');
		const postData = uuid && state.composer.posts[uuid];
		if (!postData || postData.action !== 'posts.edit' || !state.editRequests[String(postData.pid)]) {
			return null;
		}
		return { uuid, postData, container };
	}

	function activePreviewComposer(containerEl) {
		const uuid = $(containerEl).attr('data-uuid');
		return uuid && state.previewUuids[uuid];
	}

	function submitEditRequest(uuid, postData, container, button) {
		const submit = $(button);
		submit.attr('disabled', true);
		socket.emit('plugins.variedmcRules.requestEditTopic', {
			tid: ajaxify.data && ajaxify.data.tid || postData.tid,
			title: container.find('input.title').val(),
			content: container.find('textarea.write').val(),
			reason: state.editRequests[String(postData.pid)],
		}, function (err) {
			submit.removeAttr('disabled');
			if (err) {
				state.alerts.error(err.message || err);
				return;
			}
			delete state.editRequests[String(postData.pid)];
			state.alerts.success('编辑申请已提交');
			state.composer.discard(uuid);
			ajaxify.refresh();
		});
	}

	function previewEditRequest(event) {
		event.preventDefault();
		const draft = utils().readCardDraft(event.currentTarget.closest('[data-request-id]'));
		if (!draft.pid || !draft.proposedContent) {
			state.alerts.error('[[error:invalid-data]]');
			return;
		}
		state.previewDrafts[String(draft.pid)] = draft;
		state.composer.editPost({ pid: draft.pid, title: draft.title, body: draft.proposedContent });
	}

	function markPreviewComposer(_event, data) {
		const postData = data && data.composerData || {};
		const pid = String(postData.pid || '');
		const draft = state.previewDrafts[pid];
		if (!draft) {
			return;
		}
		delete state.previewDrafts[pid];
		state.previewUuids[data.post_uuid] = true;
		state.composer.posts[data.post_uuid].modified = false;
		const container = data.postContainer;
		container.addClass('variedmc-review-preview-composer');
		container.find('input.title, textarea.write').prop('readonly', true);
		container.find('.composer-submit').prop('disabled', true).addClass('disabled').text('仅预览');
		container.find('.composer-discard i').attr('class', 'fa fa-times');
		container.find('.composer-discard span').text('关闭');
		if (!container.find('.variedmc-review-preview-banner').length) {
			container.find('.composer-container').prepend(
				'<div class="variedmc-review-preview-banner">审核预览模式，不会修改原帖。点击关闭退出预览。</div>'
			);
		}
	}

	function clearComposerState(payload) {
		const postData = payload && payload.postData;
		if (postData && postData.pid) {
			delete state.editRequests[String(postData.pid)];
		}
		if (payload && payload.post_uuid) {
			delete state.previewUuids[payload.post_uuid];
		}
	}

	function utils() {
		return window.VariedMCRulesReviewPreview;
	}

	window.VariedMCRulesEditReview = { init, bind };
}());
