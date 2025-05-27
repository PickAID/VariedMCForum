'use strict';

/* global $ */

$(document).ready(function() {
    let previewUpdateTimeout;
    
    $(window).on('action:composer.enhanced action:composer.loaded', function(evt, data) {
        if (data && data.element) {
            const $composer = data.element;
            const $textarea = $composer.find('textarea');
            
            if ($textarea.length) {
                $textarea.off('input.mermaid-preview').on('input.mermaid-preview', function() {
                    clearTimeout(previewUpdateTimeout);
                    previewUpdateTimeout = setTimeout(function() {
                        const $preview = $composer.find('[component="composer/preview"]');
                        if ($preview.length && $preview.find('.mermaid-container').length) {
                            updateMermaidPreview();
                        }
                    }, 1000);
                });
            }
        }
    });
    
    function updateMermaidPreview() {
        if (window.mermaid) {
            const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
            
            window.mermaid.initialize({
                startOnLoad: false,
                theme: isDark ? 'dark' : 'default',
                securityLevel: 'loose'
            });
            
            setTimeout(function() {
                if (window.mermaid && window.mermaid.init) {
                    window.mermaid.init(undefined, '[component="composer/preview"] .mermaid-container pre.mermaid');
                }
            }, 100);
        }
    }
}); 