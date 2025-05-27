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
        try {
            if (typeof window.mermaid !== 'undefined') {
                processMermaidPreview();
            } else {
                loadMermaidForPreview();
            }
        } catch (error) {
            console.error('Mermaid预览更新错误:', error);
        }
    }
    
    function loadMermaidForPreview() {
        if (document.querySelector('script[src*="mermaid"]')) {
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://letmefly.xyz/Links/mermaid.min.js';
        script.async = true;
        script.onload = function() {
            if (window.mermaid) {
                processMermaidPreview();
            }
        };
        script.onerror = function() {
            console.warn('预览中无法加载Mermaid');
        };
        document.head.appendChild(script);
    }
    
    function processMermaidPreview() {
        try {
            const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
            
            window.mermaid.initialize({
                startOnLoad: false,
                theme: isDark ? 'dark' : 'default',
                securityLevel: 'loose',
                fontFamily: 'inherit'
            });
            
            const elements = document.querySelectorAll('[component="composer/preview"] .mermaid-container pre.mermaid:not([data-preview-processed])');
            
            elements.forEach(function(element) {
                if (element && element.textContent) {
                    element.setAttribute('data-preview-processed', 'true');
                    
                    try {
                        const source = element.textContent.trim();
                        const id = element.id || 'preview-mermaid-' + Math.random().toString(36).substr(2, 9);
                        element.id = id;
                        
                        if (window.mermaid.render) {
                            window.mermaid.render(id + '-svg', source).then(function(result) {
                                element.innerHTML = result.svg;
                            }).catch(function(error) {
                                console.error('Mermaid预览错误:', error);
                                element.innerHTML = '<div class="mermaid-error">预览失败</div>';
                            });
                        } else {
                            element.innerHTML = source;
                            window.mermaid.init(undefined, element);
                        }
                    } catch (error) {
                        console.error('Mermaid预览处理错误:', error);
                        element.innerHTML = '<div class="mermaid-error">预览处理失败</div>';
                    }
                }
            });
        } catch (error) {
            console.error('Mermaid预览初始化错误:', error);
        }
    }
}); 