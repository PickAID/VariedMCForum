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

    // 监听 Composer 预览变化
    $(window).on('action:composer.preview', function(evt, data) {
        setTimeout(() => {
            applyExtendedMarkdownTheme(getCurrentTheme());
            initializePreviewComponents();
        }, 50);
    });

    function getCurrentTheme() {
        // 检查多种可能的暗色主题标识
        
        // 1. 检查 data-bs-theme 属性
        const htmlTheme = document.documentElement.getAttribute('data-bs-theme');
        const bodyTheme = document.body.getAttribute('data-bs-theme');
        if (htmlTheme === 'dark' || bodyTheme === 'dark') {
            return true;
        }
        
        // 2. 检查 class 属性中的暗色主题
        const htmlClasses = document.documentElement.className;
        const bodyClasses = document.body.className;
        if (htmlClasses.includes('dark') || bodyClasses.includes('dark') ||
            htmlClasses.includes('theme-dark') || bodyClasses.includes('theme-dark')) {
            return true;
        }
        
        // 3. 检查 NodeBB 特定的主题选择器
        const darkThemeElements = document.querySelectorAll('[data-bs-theme="dark"], .dark, .theme-dark');
        if (darkThemeElements.length > 0) {
            return true;
        }
        
        // 4. 检查 localStorage 中的主题设置
        const storedTheme = localStorage.getItem('theme') || localStorage.getItem('nodebb-theme');
        if (storedTheme && (storedTheme.includes('dark') || storedTheme.includes('Dark'))) {
            return true;
        }
        
        // 5. 检查系统偏好设置
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            // 只有在没有明确设置的情况下才使用系统偏好
            const hasExplicitTheme = htmlTheme || bodyTheme || storedTheme;
            if (!hasExplicitTheme) {
                return true;
            }
        }
        
        // 6. 检查 CSS 自定义属性（一些主题可能使用这种方式）
        const computedStyle = getComputedStyle(document.documentElement);
        const bgColor = computedStyle.getPropertyValue('--bs-body-bg') || computedStyle.getPropertyValue('background-color');
        if (bgColor && (bgColor.includes('rgb(33') || bgColor.includes('#212') || bgColor.includes('#1a'))) {
            return true;
        }
        
        return false;
    }

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
        
        // 初始主题检查
        applyExtendedMarkdownTheme(getCurrentTheme());
        
        // 监听主题变化
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && 
                    (mutation.attributeName === 'class' || mutation.attributeName === 'data-bs-theme')) {
                    setTimeout(() => {
                        applyExtendedMarkdownTheme(getCurrentTheme());
                    }, 50);
                }
            });
        });
        
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'data-bs-theme']
        });
        
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class', 'data-bs-theme']
        });
    }

    function applyExtendedMarkdownTheme(isDark) {
        const themeClass = 'extended-dark-theme';
        
        // 处理页面中的所有元素，包括 Composer 预览区域
        document.querySelectorAll('.markdown-alert, .code-group-container, .extended-tabs-container, .text-header, .extended-markdown-tooltip, .spoiler, .steps-container, .collapsible-wrapper').forEach(element => {
            if (isDark) {
                element.classList.add(themeClass);
            } else {
                element.classList.remove(themeClass);
            }
        });
        
        // 特别处理 Composer 预览区域 - 使用更多的选择器
        const previewSelectors = [
            '.composer .preview',
            '.write-preview-container', 
            '[component="composer/preview"]',
            '.preview.w-100',
            '.composer-preview',
            '.markdown-preview'
        ];
        
        previewSelectors.forEach(selector => {
            const containers = document.querySelectorAll(selector);
            containers.forEach(container => {
                container.querySelectorAll('.markdown-alert, .code-group-container, .extended-tabs-container, .text-header, .extended-markdown-tooltip, .spoiler, .steps-container, .collapsible-wrapper').forEach(element => {
                    if (isDark) {
                        element.classList.add(themeClass);
                    } else {
                        element.classList.remove(themeClass);
                    }
                });
            });
        });
        
        // 处理所有可能的预览容器
        document.querySelectorAll('.preview, [component="composer/preview"], .write-preview-container, .composer').forEach(container => {
            container.querySelectorAll('.markdown-alert, .code-group-container, .extended-tabs-container, .text-header, .extended-markdown-tooltip, .spoiler, .steps-container, .collapsible-wrapper').forEach(element => {
                if (isDark) {
                    element.classList.add(themeClass);
                } else {
                    element.classList.remove(themeClass);
                }
            });
        });
        
        // 强制重新检查新添加的元素
        setTimeout(() => {
            document.querySelectorAll('.markdown-alert, .code-group-container, .extended-tabs-container, .text-header, .extended-markdown-tooltip, .spoiler, .steps-container, .collapsible-wrapper').forEach(element => {
                if (isDark) {
                    element.classList.add(themeClass);
                } else {
                    element.classList.remove(themeClass);
                }
            });
        }, 100);
    }

    function initializePreviewComponents() {
        // 初始化预览区域中的组件
        const previewContainers = document.querySelectorAll('.preview, [component="composer/preview"], .write-preview-container');
        
        previewContainers.forEach(container => {
            // 初始化标签页组件
            container.querySelectorAll('.code-group-container, .extended-tabs-container, .steps-container').forEach(tabContainer => {
                if (!tabContainer.dataset.tabsInitialized) {
                    tabContainer.dataset.tabsInitialized = 'true';
                    
                    tabContainer.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
                        tab.addEventListener('click', function(e) {
                            e.preventDefault();
                            
                            const targetId = this.getAttribute('data-bs-target');
                            const target = container.querySelector(targetId);
                            
                            if (target) {
                                // 移除其他活动状态
                                tabContainer.querySelectorAll('.nav-link').forEach(link => {
                                    link.classList.remove('active');
                                    link.setAttribute('aria-selected', 'false');
                                });
                                tabContainer.querySelectorAll('.tab-pane').forEach(pane => {
                                    pane.classList.remove('show', 'active');
                                });
                                
                                // 设置当前活动状态
                                this.classList.add('active');
                                this.setAttribute('aria-selected', 'true');
                                target.classList.add('show', 'active');
                            }
                        });
                    });
                }
            });
            
            // 初始化折叠组件
            container.querySelectorAll('.collapsible-wrapper').forEach(wrapper => {
                const button = wrapper.querySelector('.extended-markdown-collapsible');
                
                if (button && !button.dataset.collapseInitialized) {
                    button.dataset.collapseInitialized = 'true';
                    
                    const targetId = button.getAttribute('data-bs-target');
                    const target = wrapper.querySelector('#' + targetId);
                    
                    if (target) {
                        const icon = button.querySelector('.collapse-icon');
                        target.style.display = 'none';
                        
                        button.addEventListener('click', function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            if (target.style.display === 'none') {
                                target.style.display = 'block';
                                button.setAttribute('aria-expanded', 'true');
                                if (icon) icon.style.transform = 'rotate(90deg)';
                            } else {
                                target.style.display = 'none';
                                button.setAttribute('aria-expanded', 'false');
                                if (icon) icon.style.transform = 'rotate(0deg)';
                            }
                        });
                    }
                }
            });
            
            // 初始化步骤导航
            container.querySelectorAll('.steps-container').forEach(stepsContainer => {
                if (!stepsContainer.dataset.stepsInitialized) {
                    stepsContainer.dataset.stepsInitialized = 'true';
                    
                    const tabs = stepsContainer.querySelectorAll('.nav-link');
                    const prevBtn = stepsContainer.querySelector('.step-prev');
                    const nextBtn = stepsContainer.querySelector('.step-next');
                    const currentStep = stepsContainer.querySelector('.current-step');
                    const totalSteps = tabs.length;
                    let currentIndex = 0;
                    
                    function updateButtons() {
                        if (prevBtn) prevBtn.disabled = currentIndex === 0;
                        if (nextBtn) nextBtn.disabled = currentIndex === totalSteps - 1;
                        if (currentStep) currentStep.textContent = currentIndex + 1;
                    }
                    
                    if (prevBtn) {
                        prevBtn.addEventListener('click', function(e) {
                            e.preventDefault();
                            if (currentIndex > 0) {
                                currentIndex--;
                                tabs[currentIndex].click();
                                updateButtons();
                            }
                        });
                    }
                    
                    if (nextBtn) {
                        nextBtn.addEventListener('click', function(e) {
                            e.preventDefault();
                            if (currentIndex < totalSteps - 1) {
                                currentIndex++;
                                tabs[currentIndex].click();
                                updateButtons();
                            }
                        });
                    }
                    
                    tabs.forEach((tab, index) => {
                        tab.addEventListener('click', function() {
                            currentIndex = index;
                            updateButtons();
                        });
                    });
                    
                    updateButtons();
                }
            });
        });
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
            }
        } catch (error) {
            console.warn('Extended Markdown: Could not load formatting tools', error);
        }
    };

    async function pageReady() {
        // 首先检测并应用主题
        const currentTheme = getCurrentTheme();
        applyExtendedMarkdownTheme(currentTheme);
        
        setupExtendedMarkdownTheme();
        initializeTabComponents();
        initializeCollapse();
        initializeAnimatedCodeGroups();
        initializeStepsNavigation();
        initializePreviewComponents();
        
        // 再次应用主题以确保新组件被处理
        setTimeout(() => {
            applyExtendedMarkdownTheme(getCurrentTheme());
        }, 100);
        
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
        
        // 监听预览区域的DOM变化
        const previewObserver = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' || mutation.type === 'subtree') {
                    // 检查是否有新的 Extended Markdown 组件被添加
                    const addedNodes = Array.from(mutation.addedNodes);
                    const hasExtendedMarkdownElements = addedNodes.some(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            return node.classList.contains('markdown-alert') ||
                                   node.classList.contains('code-group-container') ||
                                   node.classList.contains('extended-tabs-container') ||
                                   node.classList.contains('text-header') ||
                                   node.classList.contains('steps-container') ||
                                   node.classList.contains('collapsible-wrapper') ||
                                   node.querySelector('.markdown-alert, .code-group-container, .extended-tabs-container, .text-header, .steps-container, .collapsible-wrapper');
                        }
                        return false;
                    });
                    
                    if (hasExtendedMarkdownElements) {
                        shouldUpdate = true;
                    }
                }
            });
            
            if (shouldUpdate) {
                setTimeout(() => {
                    applyExtendedMarkdownTheme(getCurrentTheme());
                    initializePreviewComponents();
                }, 10);
            }
        });
        
        // 监听所有可能的预览容器
        const observeContainers = () => {
            document.querySelectorAll('.preview, [component="composer/preview"], .write-preview-container, .composer, .markdown-preview').forEach(container => {
                if (!container.dataset.observerAttached) {
                    container.dataset.observerAttached = 'true';
                    previewObserver.observe(container, {
                        childList: true,
                        subtree: true
                    });
                }
            });
        };
        
        observeContainers();
        
        // 定期检查新的容器
        const checkForPreviewContainers = setInterval(() => {
            observeContainers();
        }, 500);
        
        // 10秒后停止检查
        setTimeout(() => {
            clearInterval(checkForPreviewContainers);
        }, 10000);
    }

    $(document).on('action:posts.loaded action:topic.loaded', function() {
        setTimeout(() => {
            initializeStepsNavigation();
            initializeTabComponents();
            initializeCollapse();
            initializeAnimatedCodeGroups();
            initializePreviewComponents();
            applyExtendedMarkdownTheme(getCurrentTheme());
        }, 100);
        
        // 再次检查以确保所有元素都被处理
        setTimeout(() => {
            applyExtendedMarkdownTheme(getCurrentTheme());
        }, 500);
    });
    
    // 监听 Composer 相关事件
    $(document).on('action:composer.loaded', function() {
        setTimeout(() => {
            applyExtendedMarkdownTheme(getCurrentTheme());
            initializePreviewComponents();
        }, 200);
    });
    
    // 监听预览内容更新事件
    $(document).on('action:composer.preview.ready', function() {
        setTimeout(() => {
            applyExtendedMarkdownTheme(getCurrentTheme());
            initializePreviewComponents();
        }, 50);
    });
    
    // 兼容可能的其他预览更新事件
    $(document).on('shown.bs.tab', '.composer .nav-link', function() {
        setTimeout(() => {
            applyExtendedMarkdownTheme(getCurrentTheme());
            initializePreviewComponents();
        }, 50);
    });
    
    // 监听页面内容变化
    $(document).on('action:ajaxify.contentLoaded', function() {
        setTimeout(() => {
            applyExtendedMarkdownTheme(getCurrentTheme());
            initializePreviewComponents();
        }, 100);
    });
    
    // 监听 DOM 准备完成
    $(document).on('DOMContentLoaded', function() {
        applyExtendedMarkdownTheme(getCurrentTheme());
    });
    
    // 立即执行一次主题检测（在脚本加载时）
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(() => {
                applyExtendedMarkdownTheme(getCurrentTheme());
            }, 100);
        });
    } else {
        // DOM 已经准备好了
        setTimeout(() => {
            applyExtendedMarkdownTheme(getCurrentTheme());
        }, 100);
    }
});