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
		<article class="variedmc-review-card" data-request-id="{./id}">
			<div class="variedmc-review-card__main">
				<div class="fw-semibold">申请删除主题 #{./tid}</div>
				<div class="text-muted small">板块 {./cid} · 申请人 {./requesterUid} · 状态 {./state}</div>
				<p class="mb-0 text-break">{./reason}</p>
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
