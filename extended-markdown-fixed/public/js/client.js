"use strict";

/* global $ */

$(document).ready(function () {
    var ExtendedMarkdown = {};

    pageReady();

    $(window).on('action:ajaxify.end', function (ev, data) {
        setTimeout(pageReady, 100);
    });

    $(window).on('action:composer.enhanced', function (evt, data) {
        ExtendedMarkdown.prepareFormattingTools();
    });

    function setupExtendedMarkdownTheme() {
        const skinSwitcher = $(`[component="skinSwitcher"]`);
        if (skinSwitcher.length) {
            let darkSkinList = skinSwitcher.find('.dropdown-header').eq(1).parent();
            applyExtendedMarkdownTheme(darkSkinList.find(".fa-check").length > darkSkinList.find(".invisible").length);
            
            skinSwitcher.find('li').off('click.extended-markdown-theme').on('click.extended-markdown-theme', function (e) {
                setTimeout(() => {
                    const isDark = $(this).parent().find(".dropdown-header").text().includes("Dark") || 
                                   $(this).parent().find(".dropdown-header").text().includes("暗色");
                    applyExtendedMarkdownTheme(isDark);
                }, 100);
            });
        }
        
        if (document.documentElement.getAttribute('data-bs-theme') === 'dark' ||
            document.body.classList.contains('dark') ||
            localStorage.getItem('theme') === 'dark') {
            applyExtendedMarkdownTheme(true);
        }
        
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-bs-theme') {
                    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
                    applyExtendedMarkdownTheme(isDark);
                }
            });
        });
        
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-bs-theme']
        });
    }

    function applyExtendedMarkdownTheme(isDark) {
        const themeClass = 'extended-dark-theme';
        
        document.querySelectorAll('.markdown-alert, .code-group-container, .extended-tabs-container, .text-header, .extended-markdown-tooltip, .spoiler, .steps-container, .collapsible-wrapper, .mermaid-container').forEach(element => {
            if (isDark) {
                element.classList.add(themeClass);
            } else {
                element.classList.remove(themeClass);
            }
        });
        
        setTimeout(function() {
            reinitializeMermaidWithTheme();
        }, 100);
    }

    function initializeTabComponents() {
        $('.code-group-container, .extended-tabs-container, .steps-container').each(function() {
            const $container = $(this);
            
            if (!$container.data('tabs-initialized')) {
                $container.data('tabs-initialized', true);
                
                $container.find('[data-bs-toggle="tab"]').off('click.extended-tabs').on('click.extended-tabs', function(e) {
                    e.preventDefault();
                    
                    const targetId = $(this).data('bs-target');
                    const $target = $(targetId);
                    
                    if ($target.length) {
                        $container.find('.nav-link').removeClass('active').attr('aria-selected', 'false');
                        $container.find('.tab-pane').removeClass('show active');
                        
                        $(this).addClass('active').attr('aria-selected', 'true');
                        $target.addClass('show active');
                    }
                });
            }
        });
    }

    function initializeCollapse() {
        $('.collapsible-wrapper').each(function() {
            const $wrapper = $(this);
            const $button = $wrapper.find('.extended-markdown-collapsible');
            
            if ($button.length && !$button.data('collapse-initialized')) {
                $button.data('collapse-initialized', true);
                
                const targetId = $button.attr('data-bs-target');
                const $target = $('#' + targetId);
                
                if ($target.length) {
                    const $icon = $button.find('.collapse-icon');
                    
                    $target.hide();
                    
                    $button.on('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        if ($target.is(':visible')) {
                            $target.hide();
                            $button.attr('aria-expanded', 'false');
                            $icon.css('transform', 'rotate(0deg)');
                        } else {
                            $target.show();
                            $button.attr('aria-expanded', 'true');
                            $icon.css('transform', 'rotate(90deg)');
                        }
                    });
                }
            }
        });
    }

    function initializeAnimatedCodeGroups() {
        $('.animated-code-group-container').each(function() {
            const $container = $(this);
            const animatedId = $container.data('animated-id');
            const $display = $container.find(`#${animatedId}-display`);
            const $tabs = $container.find('.nav-link');
            
            if (!$container.data('animated-initialized')) {
                $container.data('animated-initialized', true);
                
                if ($tabs.length > 0 && $display.length > 0) {
                    $tabs.first().addClass('active');
                    
                    const firstCode = $tabs.first().data('code');
                    if (firstCode) {
                        $display.html(`<pre><code>${firstCode}</code></pre>`);
                    }
                    
                    $tabs.off('click.animated-code').on('click.animated-code', function(e) {
                        e.preventDefault();
                        
                        const code = $(this).data('code');
                        if (code && $display.length > 0) {
                            $tabs.removeClass('active');
                            $(this).addClass('active');
                            
                            $display.fadeOut(200, function() {
                                $display.html(`<pre><code>${code}</code></pre>`);
                                $display.fadeIn(200);
                            });
                        }
                    });
                }
            }
        });
    }

    function initializeStepsNavigation() {
        $('.steps-container').each(function() {
            const $container = $(this);
            
            if (!$container.data('steps-initialized')) {
                $container.data('steps-initialized', true);
                
                const $tabs = $container.find('.nav-link');
                const $prevBtn = $container.find('.step-prev');
                const $nextBtn = $container.find('.step-next');
                const $currentStep = $container.find('.current-step');
                const totalSteps = $tabs.length;
                let currentIndex = 0;
                
                function updateButtons() {
                    $prevBtn.prop('disabled', currentIndex === 0);
                    $nextBtn.prop('disabled', currentIndex === totalSteps - 1);
                    $currentStep.text(currentIndex + 1);
                }
                
                $prevBtn.on('click', function(e) {
                    e.preventDefault();
                    if (currentIndex > 0) {
                        currentIndex--;
                        $tabs.eq(currentIndex).click();
                        updateButtons();
                    }
                });
                
                $nextBtn.on('click', function(e) {
                    e.preventDefault();
                    if (currentIndex < totalSteps - 1) {
                        currentIndex++;
                        $tabs.eq(currentIndex).click();
                        updateButtons();
                    }
                });
                
                $tabs.on('click', function(e) {
                    currentIndex = $tabs.index(this);
                    updateButtons();
                });
                
                updateButtons();
            }
        });
    }

    function initializeMermaid() {
        if (window.mermaid) {
            setupMermaid(window.mermaid);
        } else {
            loadMermaidFromCDN().then(function(mermaid) {
                setupMermaid(mermaid);
            }).catch(function(error) {
                console.error('无法加载Mermaid库:', error);
            });
        }
    }

    function loadMermaidFromCDN() {
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
                window.dispatchEvent(new CustomEvent('mermaid-loaded', { detail: mermaid }));
            `;
            
            window.addEventListener('mermaid-loaded', function(event) {
                resolve(event.detail);
            }, { once: true });
            
            script.onerror = function() {
                reject(new Error('Failed to load Mermaid'));
            };
            
            document.head.appendChild(script);
        });
    }

    function setupMermaid(mermaid) {
        try {
            const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark' || 
                          document.body.classList.contains('dark') || 
                          localStorage.getItem('theme') === 'dark';
            
            mermaid.initialize({
                startOnLoad: false,
                theme: isDark ? 'dark' : 'default',
                securityLevel: 'loose',
                fontFamily: 'inherit'
            });
            
            renderMermaidDiagrams(mermaid);
        } catch (error) {
            console.error('Mermaid初始化错误:', error);
        }
    }

    function renderMermaidDiagrams(mermaid) {
        const elements = document.querySelectorAll('.mermaid-container pre.mermaid:not([data-processed])');
        
        elements.forEach(function(element) {
            if (element && typeof element.setAttribute === 'function') {
                element.setAttribute('data-processed', 'true');
                
                try {
                    const source = element.textContent.trim();
                    if (source) {
                        const id = element.id || 'mermaid-' + Math.random().toString(36).substr(2, 9);
                        element.id = id;
                        
                        mermaid.render(id + '-svg', source).then(function(result) {
                            element.innerHTML = result.svg;
                        }).catch(function(error) {
                            console.error('Mermaid渲染错误:', error);
                            element.innerHTML = '<div class="mermaid-error">图表渲染失败: ' + error.message + '</div>';
                        });
                    }
                } catch (error) {
                    console.error('Mermaid处理错误:', error);
                    element.innerHTML = '<div class="mermaid-error">图表处理失败: ' + error.message + '</div>';
                }
            }
        });
    }

    function reinitializeMermaidWithTheme() {
        document.querySelectorAll('.mermaid-container pre.mermaid').forEach(function(element) {
            if (element) {
                element.removeAttribute('data-processed');
                const originalText = element.getAttribute('data-original-text');
                if (originalText) {
                    element.textContent = originalText;
                }
            }
        });
        
        initializeMermaid();
    }

    ExtendedMarkdown.prepareFormattingTools = async function () {
        try {
            const [formatting, controls] = await app.require(['composer/formatting', 'composer/controls']);
            
            if (formatting && controls) {
                let composerTextarea;
                let colorPickerButton = document.querySelector('.btn[data-format="color"]');
                
                if (colorPickerButton && !document.getElementById('nodebb-plugin-extended-markdown-colorpicker')) {
                    let hiddenPicker = document.createElement("input");
                    hiddenPicker.style.visibility = 'hidden';
                    hiddenPicker.style.width = '0';
                    hiddenPicker.style.padding = '0';
                    hiddenPicker.style.margin = '0';
                    hiddenPicker.style.height = '0';
                    hiddenPicker.style.border = '0';
                    hiddenPicker.type = 'color';
                    hiddenPicker.id = 'nodebb-plugin-extended-markdown-colorpicker';
                    colorPickerButton.parentNode.insertBefore(hiddenPicker, colorPickerButton.nextSibling);
                    
                    hiddenPicker.addEventListener('input', function() {
                        if (composerTextarea) {
                            let selectionStart = composerTextarea.selectionStart;
                            let selectionEnd = composerTextarea.selectionEnd;
                            composerTextarea.value = composerTextarea.value.slice(0, selectionStart) + this.value + composerTextarea.value.slice(selectionEnd);
                            $(composerTextarea).trigger('input').trigger('propertychange');
                            composerTextarea.selectionStart = selectionStart;
                            composerTextarea.selectionEnd = selectionStart + this.value.length;
                        }
                    });
                }

                formatting.addButtonDispatch('color', function (textarea, selectionStart, selectionEnd) {
                    composerTextarea = textarea;
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '%(#000000)[彩色文本]');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionStart + 9);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '%(#000000)[', ']');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionStart + 9);
                    }
                    
                    let hiddenPicker = document.getElementById('nodebb-plugin-extended-markdown-colorpicker');
                    if (hiddenPicker) {
                        hiddenPicker.click();
                    }
                });

                formatting.addButtonDispatch('left', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '|-左对齐文字');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionStart + 7);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '|-', '');
                    }
                });

                formatting.addButtonDispatch('center', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '|-居中文字-|');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionStart + 6);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '|-', '-|');
                    }
                });

                formatting.addButtonDispatch('right', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '右对齐文字-|');
                        controls.updateTextareaSelection(textarea, selectionStart, selectionStart + 5);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '', '-|');
                    }
                });

                formatting.addButtonDispatch('justify', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '|=两端对齐文字=|');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionStart + 8);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '|=', '=|');
                    }
                });

                formatting.addButtonDispatch('textheader', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '#anchor(标题)');
                        controls.updateTextareaSelection(textarea, selectionStart + 1, selectionStart + 7);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '#anchor(', ')');
                    }
                });

                formatting.addButtonDispatch('groupedcode', function (textarea, selectionStart, selectionEnd) {
                    const template = '===group\n```javascript\nconst hello = "world";\n```\n```python\nhello = "world"\n```\n===';
                    controls.insertIntoTextarea(textarea, template);
                });

                formatting.addButtonDispatch('bubbleinfo', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '°信息文本°(提示文本)');
                        controls.updateTextareaSelection(textarea, selectionStart + 1, selectionStart + 5);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '°', '°(提示文本)');
                    }
                });

                formatting.addButtonDispatch('collapsible', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '[spoiler=点击展开]隐藏内容[/spoiler]');
                        controls.updateTextareaSelection(textarea, selectionStart + 15, selectionStart + 19);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '[spoiler=点击展开]', '[/spoiler]');
                    }
                });

                formatting.addButtonDispatch('noteinfo', function (textarea, selectionStart, selectionEnd) {
                    controls.insertIntoTextarea(textarea, '!!! info [信息]: 这是一条信息提示');
                });

                formatting.addButtonDispatch('notewarning', function (textarea, selectionStart, selectionEnd) {
                    controls.insertIntoTextarea(textarea, '!!! warning [警告]: 这是一条警告提示');
                });

                formatting.addButtonDispatch('noteimportant', function (textarea, selectionStart, selectionEnd) {
                    controls.insertIntoTextarea(textarea, '!!! important [重要]: 这是一条重要提示');
                });

                formatting.addButtonDispatch('tabs', function (textarea, selectionStart, selectionEnd) {
                    controls.insertIntoTextarea(textarea, '\n[tabs]\n[tab=标签1]\n内容1\n[tab=标签2]\n内容2\n[/tabs]\n');
                });

                formatting.addButtonDispatch('steps', function (textarea, selectionStart, selectionEnd) {
                    controls.insertIntoTextarea(textarea, '\n[steps]\n[step]\n第一步描述\n[step]\n第二步描述\n[/steps]\n');
                });

                formatting.addButtonDispatch('ruby', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '[ruby=拼音]汉字[/ruby]');
                        controls.updateTextareaSelection(textarea, selectionStart + 7, selectionStart + 9);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '[ruby=拼音]', '[/ruby]');
                    }
                });

                formatting.addButtonDispatch('superscript', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, 'E=mc^2^');
                        controls.updateTextareaSelection(textarea, selectionStart + 5, selectionStart + 6);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '^', '^');
                    }
                });

                formatting.addButtonDispatch('subscript', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, 'H~2~O');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionStart + 3);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '~', '~');
                    }
                });

                formatting.addButtonDispatch('mermaid', function (textarea, selectionStart, selectionEnd) {
                    const mermaidTemplate = '\n[mermaid]\ngraph TD\n    A[开始] --> B[处理]\n    B --> C[结束]\n[/mermaid]\n';
                    controls.insertIntoTextarea(textarea, mermaidTemplate);
                });
            }
        } catch (error) {
            console.warn('Extended Markdown: Could not load formatting tools', error);
        }
    };

    async function pageReady() {
        setupExtendedMarkdownTheme();
        initializeTabComponents();
        initializeCollapse();
        initializeAnimatedCodeGroups();
        initializeStepsNavigation();
        initializeMermaid();
        
        require(['bootstrap'], function (bootstrap) {
            document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(function (element) {
                new bootstrap.Tooltip(element);
            });
        });

        document.querySelectorAll('button.extended-markdown-spoiler').forEach(function (element) {
            element.onclick = function() {
                element.children[0].className = element.attributes.getNamedItem("aria-expanded").value === "true" ? "fa fa-eye-slash" : "fa fa-eye";
            };
        });
    }

    $(document).on('action:posts.loaded action:topic.loaded', function() {
        setTimeout(() => {
            initializeStepsNavigation();
            initializeTabComponents();
            initializeCollapse();
            initializeAnimatedCodeGroups();
            initializeMermaid();
        }, 100);
    });
});
