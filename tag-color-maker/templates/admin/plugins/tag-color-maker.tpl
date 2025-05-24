<div class="acp-page-container">
    <div component="settings/main" class="row settings">
        <div class="col-sm-2 col-12 settings-header">
            <h2>标签颜色管理</h2>
        </div>
        <div class="col-sm-10 col-12">
            <form role="form" class="tag-color-maker-settings">
                <div class="row">
                    <div class="col-12">
                        <div class="form-group">
                            <label for="tagColors">标签颜色配置</label>
                            <input type="hidden" id="tagColors" name="tagColors" value="{tagColors}" />
                            
                            <div class="card">
                                <div class="card-header">
                                    <h5>添加标签颜色</h5>
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-md-4">
                                            <div class="form-group">
                                                <label for="tagName">标签名称</label>
                                                <input type="text" class="form-control" id="tagName" placeholder="输入标签名">
                                            </div>
                                        </div>
                                        <div class="col-md-3">
                                            <div class="form-group">
                                                <label for="backgroundColor">背景颜色</label>
                                                <input type="color" class="form-control" id="backgroundColor" value="#007bff">
                                            </div>
                                        </div>
                                        <div class="col-md-3">
                                            <div class="form-group">
                                                <label for="textColor">文字颜色</label>
                                                <input type="color" class="form-control" id="textColor" value="#ffffff">
                                            </div>
                                        </div>
                                        <div class="col-md-2">
                                            <div class="form-group">
                                                <label>&nbsp;</label>
                                                <button type="button" class="btn btn-primary form-control" id="addTagColor">添加</button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="row mt-3">
                                        <div class="col-12">
                                            <h6>预设标签:</h6>
                                            <button type="button" class="btn btn-outline-secondary btn-sm add-preset me-2" data-preset="forge">Forge</button>
                                            <button type="button" class="btn btn-outline-secondary btn-sm add-preset me-2" data-preset="neoforge">NeoForge</button>
                                            <button type="button" class="btn btn-outline-secondary btn-sm add-preset me-2" data-preset="fabric">Fabric</button>
                                            <button type="button" class="btn btn-outline-secondary btn-sm add-preset me-2" data-preset="kubejs">KubeJS</button>
                                            <button type="button" class="btn btn-outline-danger btn-sm add-preset" data-preset="unsafe">Unsafe</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="card mt-3">
                                <div class="card-header">
                                    <h5>当前标签颜色</h5>
                                </div>
                                <div class="card-body">
                                    <div id="colorPreview" class="border rounded p-3 bg-light">
                                        <p class="text-muted mb-0">暂无标签颜色配置</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    </div>
</div>

<button id="save" class="floating-button mdl-button mdl-js-button mdl-button--fab mdl-js-ripple-effect mdl-button--colored">
    <i class="material-icons">save</i>
</button> 