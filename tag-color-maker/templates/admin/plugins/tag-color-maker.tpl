<div class="acp-page-container">
    <div class="row m-0">
        <div id="spy-container" class="col-12 col-md-8 px-0 mb-4" tabindex="0">
            <form role="form" class="tag-color-maker-settings">
                <div class="mb-4">
                    <h5 class="fw-bold tracking-tight settings-header">标签颜色管理</h5>
                    
                    <div class="alert alert-info">
                        <h6><i class="fa fa-info-circle"></i> 使用说明</h6>
                        <ul class="mb-0">
                            <li>使用JSON格式配置标签颜色</li>
                            <li>格式: <code>{"标签名": {"background": "背景色", "color": "文字色"}}</code></li>
                            <li>颜色可以使用十六进制 (#FF0000)、RGB (rgb(255,0,0)) 或颜色名称 (red)</li>
                            <li>保存后刷新页面查看效果</li>
                        </ul>
                    </div>

                    <div class="mb-3">
                        <label class="form-label" for="tagColors">标签颜色配置 (JSON格式)</label>
                        <textarea id="tagColors" name="tagColors" class="form-control" rows="20" style="font-family: monospace;">{tagColors}</textarea>
                        <div class="form-text">
                            示例格式：<br>
                            <code>
{<br>
&nbsp;&nbsp;"forge": {"background": "#DFA86A", "color": "#FAF4F3"},<br>
&nbsp;&nbsp;"fabric": {"background": "#DBD0B4", "color": "#111111"}<br>
}
                            </code>
                        </div>
                    </div>

                    <div class="mb-3">
                        <h6>预设颜色快速添加</h6>
                        <div class="row">
                            <div class="col-md-6">
                                <button type="button" class="btn btn-outline-primary btn-sm mb-2 add-preset" 
                                        data-tag="minecraft" data-bg="#62C554" data-color="#FFFFFF">
                                    <i class="fa fa-plus"></i> Minecraft (绿色)
                                </button>
                                <button type="button" class="btn btn-outline-primary btn-sm mb-2 add-preset" 
                                        data-tag="modpack" data-bg="#8B4513" data-color="#FFFFFF">
                                    <i class="fa fa-plus"></i> Modpack (棕色)
                                </button>
                                <button type="button" class="btn btn-outline-primary btn-sm mb-2 add-preset" 
                                        data-tag="tutorial" data-bg="#17A2B8" data-color="#FFFFFF">
                                    <i class="fa fa-plus"></i> Tutorial (青色)
                                </button>
                            </div>
                            <div class="col-md-6">
                                <button type="button" class="btn btn-outline-primary btn-sm mb-2 add-preset" 
                                        data-tag="question" data-bg="#FFC107" data-color="#000000">
                                    <i class="fa fa-plus"></i> Question (黄色)
                                </button>
                                <button type="button" class="btn btn-outline-primary btn-sm mb-2 add-preset" 
                                        data-tag="solved" data-bg="#28A745" data-color="#FFFFFF">
                                    <i class="fa fa-plus"></i> Solved (绿色)
                                </button>
                                <button type="button" class="btn btn-outline-primary btn-sm mb-2 add-preset" 
                                        data-tag="bug" data-bg="#DC3545" data-color="#FFFFFF">
                                    <i class="fa fa-plus"></i> Bug (红色)
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="mb-3">
                        <h6>自定义添加</h6>
                        <div class="row">
                            <div class="col-md-3">
                                <input type="text" id="customTag" class="form-control" placeholder="标签名">
                            </div>
                            <div class="col-md-3">
                                <input type="color" id="customBg" class="form-control" value="#007bff">
                            </div>
                            <div class="col-md-3">
                                <input type="color" id="customColor" class="form-control" value="#ffffff">
                            </div>
                            <div class="col-md-3">
                                <button type="button" class="btn btn-success" id="addCustom">
                                    <i class="fa fa-plus"></i> 添加
                                </button>
                            </div>
                        </div>
                        <small class="form-text text-muted">标签名 | 背景色 | 文字色 | 操作</small>
                    </div>

                    <div class="mb-3">
                        <h6>颜色预览</h6>
                        <div id="colorPreview" class="d-flex flex-wrap gap-2">
                        </div>
                    </div>
                </div>
            </form>
        </div>

        <div class="col-12 col-md-4 px-0">
            <div class="card">
                <div class="card-header">
                    <h6 class="card-title mb-0">操作</h6>
                </div>
                <div class="card-body">
                    <button id="save" class="btn btn-primary btn-block mb-2">
                        <i class="fa fa-save"></i> 保存设置
                    </button>
                    <button id="reset" class="btn btn-warning btn-block mb-2">
                        <i class="fa fa-refresh"></i> 重置为默认
                    </button>
                    <button id="format" class="btn btn-info btn-block">
                        <i class="fa fa-code"></i> 格式化JSON
                    </button>
                </div>
            </div>
        </div>
    </div>
</div> 