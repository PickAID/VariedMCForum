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
            
            $preview.find('.mermaid-container pre.mermaid').each(function() {
                const element = this;
                
                if (!$(element).data('preview-rendered')) {
                    try {
                        mermaid.run({
                            nodes: [element]
                        }).then(() => {
                            $(element).data('preview-rendered', true);
                        }).catch(function(error) {
                            $(element).html('<div class="mermaid-error">预览错误: ' + error.message + '</div>');
                        });
                    } catch (error) {
                        $(element).html('<div class="mermaid-error">预览错误: ' + error.message + '</div>');
                    }
                }
            });
        });
    }
}); 