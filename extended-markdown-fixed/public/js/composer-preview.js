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
        
        if (window.mermaid) {
            processMermaidInPreview(window.mermaid, $preview);
        } else {
            loadMermaidForPreview().then(function(mermaid) {
                processMermaidInPreview(mermaid, $preview);
            }).catch(function(error) {
                console.error('预览中无法加载Mermaid:', error);
            });
        }
    }
    
    function loadMermaidForPreview() {
        return new Promise(function(resolve, reject) {
            if (window.mermaid) {
                resolve(window.mermaid);
                return;
            }
            
            const script = document.createElement('script');
            script.type = 'module';
            script.innerHTML = `
                import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
                window.mermaid = mermaid;
                window.dispatchEvent(new CustomEvent('mermaid-preview-loaded', { detail: mermaid }));
            `;
            
            window.addEventListener('mermaid-preview-loaded', function(event) {
                resolve(event.detail);
            }, { once: true });
            
            script.onerror = function() {
                reject(new Error('Failed to load Mermaid for preview'));
            };
            
            document.head.appendChild(script);
        });
    }
    
    function processMermaidInPreview(mermaid, $preview) {
        try {
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
                        const source = element.textContent.trim();
                        if (source) {
                            const id = element.id || 'preview-mermaid-' + Math.random().toString(36).substr(2, 9);
                            element.id = id;
                            
                            mermaid.render(id + '-svg', source).then(function(result) {
                                element.innerHTML = result.svg;
                            }).catch(function(error) {
                                console.error('Mermaid预览渲染错误:', error);
                                element.innerHTML = '<div class="mermaid-error">预览渲染失败: ' + error.message + '</div>';
                            });
                        }
                    } catch (error) {
                        console.error('Mermaid预览处理错误:', error);
                        element.innerHTML = '<div class="mermaid-error">预览处理失败: ' + error.message + '</div>';
                    }
                }
            });
        } catch (error) {
            console.error('Mermaid预览初始化错误:', error);
        }
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