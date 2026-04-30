<div class="variedmc-review-queue flex-fill">
	<div class="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-3">
		<div>
			<h1 class="fs-3 mb-1">治理队列</h1>
			<div class="text-muted small">处理删除申请和后续治理请求。</div>
		</div>
		<div class="btn-group">
			<a class="btn btn-light btn-sm" href="{config.relative_path}/review-queue?state=open">待处理</a>
			<a class="btn btn-light btn-sm" href="{config.relative_path}/review-queue?state=approved">已批准</a>
			<a class="btn btn-light btn-sm" href="{config.relative_path}/review-queue?state=rejected">已拒绝</a>
		</div>
	</div>

	{{{ if !requests.length }}}
	<div class="alert alert-light">当前没有申请。</div>
	{{{ end }}}

	<div class="variedmc-review-list">
		{{{ each requests }}}
		<article class="variedmc-review-card" data-request-id="{./id}" data-review-type="{./type}" data-main-pid="{./mainPid}" data-proposed-title="{./proposedTitle}">
			<div class="variedmc-review-card__main">
				<a class="fw-semibold text-decoration-none" href="{config.relative_path}{./topicUrl}">{./topicTitle}</a>
				<div class="text-muted small">类型 {./typeLabel} · 板块 {./cid} · 申请人 {./requesterUid} · 状态 {./state}</div>
				<p class="mb-0 text-break">{./reason}</p>
				{{{ if ./proposedTitle }}}
				<div class="small mt-2">拟改标题：<span class="text-break">{./proposedTitle}</span></div>
				{{{ end }}}
				{{{ if ./proposedContent }}}
				<div class="variedmc-review-card__edit mt-2">
					<button class="btn btn-sm btn-outline-secondary" data-action="variedmc-preview-edit-request">用 Composer 预览</button>
					<textarea class="d-none" data-role="proposed-content">{./proposedContent}</textarea>
				</div>
				{{{ end }}}
			</div>
			{{{ if (./state == "open") }}}
			<div class="variedmc-review-card__actions">
				<button class="btn btn-sm btn-primary" data-action="variedmc-approve-request">批准</button>
				<button class="btn btn-sm btn-light" data-action="variedmc-reject-request">拒绝</button>
			</div>
			{{{ end }}}
		</article>
		{{{ end }}}
	</div>
</div>
