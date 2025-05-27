'use strict';

/* global $ */

$(document).ready(function() {
    let previewUpdateTimeout;
    
    $(window).on('action:composer.enhanced', function(evt, data) {
        setupMermaidPreview(data.element);
    });
    
    $(window).on('action:composer.loaded', function(evt, data) {
        setupMermaidPreview(data.element);
    });
    
    function setupMermaidPreview($composer) {
        if (!$composer || !$composer.length) return;
        
        const $textarea = $composer.find('textarea');
        const $preview = $composer.find('.preview-container, [component="composer/preview"]');
        
        if ($textarea.length) {
            $textarea.off('input.mermaid-preview').on('input.mermaid-preview', function() {
                clearTimeout(previewUpdateTimeout);
                previewUpdateTimeout = setTimeout(function() {
                    if ($preview.length) {
                        updateMermaidPreview($preview);
                    }
                }, 500);
            });
        }
        
        $composer.off('click.mermaid-preview').on('click.mermaid-preview', '[component="composer/preview"]', function() {
            setTimeout(function() {
                updateMermaidPreview($(this));
            }, 100);
        });
    }
    
    function updateMermaidPreview($preview) {
        if (!$preview || !$preview.length) return;
        
        require(['mermaid'], function(mermaid) {
            const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
            
            mermaid.initialize({
                startOnLoad: false,
                theme: isDark ? 'dark' : 'default',
                securityLevel: 'loose',
                fontFamily: 'inherit'
            });
            
            const elements = $preview[0].querySelectorAll('.mermaid-container pre.mermaid:not([data-preview-processed])');
            
            elements.forEach(function(element) {
                if (element && typeof element.setAttribute === 'function') {
                    element.setAttribute('data-preview-processed', 'true');
                    
                    try {
                        mermaid.run({
                            nodes: [element]
                        }).catch(function(error) {
                            console.error('Mermaid预览错误:', error);
                            element.innerHTML = '<div class="mermaid-error">预览错误: ' + error.message + '</div>';
                        });
                    } catch (error) {
                        console.error('Mermaid预览错误:', error);
                        element.innerHTML = '<div class="mermaid-error">预览错误: ' + error.message + '</div>';
                    }
                }
            });
        });
    }
    
    $(document).on('action:composer.preview', function() {
        setTimeout(function() {
            const $preview = $('[component="composer/preview"]');
            if ($preview.length) {
                updateMermaidPreview($preview);
            }
        }, 100);
    });
}); 