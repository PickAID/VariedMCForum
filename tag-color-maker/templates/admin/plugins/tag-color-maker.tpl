<div class="acp-page-container">
    <div component="settings/main" class="row settings">
        <div class="col-sm-2 col-12 settings-header">
            <h2>Tag Color Maker</h2>
        </div>
        <div class="col-sm-10 col-12">
            <form role="form" class="tag-color-maker-settings">
                <div class="row">
                    <div class="col-12">
                        <div class="form-group">
                            <label for="tagColors">Tag Colors Configuration</label>
                            <input type="hidden" id="tagColors" name="tagColors" value="" />
                            
                            <div class="card">
                                <div class="card-header">
                                    <h5>Add Tag Color</h5>
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-md-4">
                                            <div class="form-group">
                                                <label for="tagName">Tag Name</label>
                                                <input type="text" class="form-control" id="tagName" placeholder="Enter tag name">
                                            </div>
                                        </div>
                                        <div class="col-md-3">
                                            <div class="form-group">
                                                <label for="backgroundColor">Background Color</label>
                                                <input type="color" class="form-control" id="backgroundColor" value="#007bff">
                                            </div>
                                        </div>
                                        <div class="col-md-3">
                                            <div class="form-group">
                                                <label for="textColor">Text Color</label>
                                                <input type="color" class="form-control" id="textColor" value="#ffffff">
                                            </div>
                                        </div>
                                        <div class="col-md-2">
                                            <div class="form-group">
                                                <label>&nbsp;</label>
                                                <button type="button" class="btn btn-primary form-control" id="addTagColor">Add</button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="row mt-3">
                                        <div class="col-12">
                                            <h6>Quick Presets:</h6>
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
                                    <h5>Current Tag Colors</h5>
                                </div>
                                <div class="card-body">
                                    <div id="colorPreview" class="border rounded p-3 bg-light">
                                        <p class="text-muted mb-0">No tag colors configured yet. Add some above!</p>
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