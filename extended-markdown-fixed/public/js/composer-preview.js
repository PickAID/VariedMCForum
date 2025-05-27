'use strict';

/* global $ */

$(document).ready(function() {
    let previewUpdateTimeout;
    
    $(window).on('action:composer.enhanced', function(evt, data) {
        const $composer = data.element;
        const $textarea = $composer.find('textarea');
        const $preview = $composer.find('.preview-container, [component="composer/preview"]');
        
        if ($textarea.length && $preview.length) {
            $textarea.on('input.mermaid-preview', function() {
                clearTimeout(previewUpdateTimeout);
                previewUpdateTimeout = setTimeout(function() {
                    updateMermaidPreview($preview);
                }, 500);
            });
        }
    });
    
    function updateMermaidPreview($preview) {
        require(['mermaid'], function(mermaid) {
            const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
            
            mermaid.initialize({
                startOnLoad: false,
                theme: isDark ? 'dark' : 'default',
                securityLevel: 'loose',
                fontFamily: 'inherit'
            });
            
            $preview.find('.mermaid-container .mermaid').each(function() {
                const $this = $(this);
                const source = decodeURIComponent($this.data('mermaid-source') || '');
                const id = $this.attr('id') || 'preview-mermaid-' + Math.random().toString(36).substr(2, 9);
                
                if (source) {
                    try {
                        const cleanSource = source.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
                        
                        mermaid.render(id + '-svg', cleanSource).then(function(result) {
                            $this.html(result.svg);
                        }).catch(function(error) {
                            $this.html('<div class="mermaid-error">预览: ' + error.message + '</div>');
                        });
                    } catch (error) {
                        $this.html('<div class="mermaid-error">预览错误: ' + error.message + '</div>');
                    }
                }
            });
        });
    }
}); 