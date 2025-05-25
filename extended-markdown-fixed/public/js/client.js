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

    function detectTheme() {
        const skinSwitcher = document.querySelector(`[component="skinSwitcher"]`);
        if (skinSwitcher) {
            const darkSkinList = $(skinSwitcher).find('.dropdown-header').eq(1).parent();
            if (darkSkinList.find(".fa-check").length > darkSkinList.find(".invisible").length) {
                return 'dark';
            }
        }
        
        const body = document.body;
        const html = document.documentElement;
        
        if (body.classList.contains('dark') || 
            html.getAttribute('data-theme') === 'dark' ||
            html.getAttribute('data-bs-theme') === 'dark') {
            return 'dark';
        }
        
        const linkElement = document.querySelector('link[href*="bootstrap"]');
        if (linkElement) {
            const href = linkElement.href.toLowerCase();
            if (href.includes('darkly') || href.includes('cyborg') || 
                href.includes('slate') || href.includes('superhero') ||
                href.includes('vapor') || href.includes('solar')) {
                return 'dark';
            }
        }
        
        const computedStyle = window.getComputedStyle(body);
        const bgColor = computedStyle.backgroundColor;
        if (bgColor) {
            const rgb = bgColor.match(/\d+/g);
            if (rgb && rgb.length >= 3) {
                const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
                return brightness < 128 ? 'dark' : 'light';
            }
        }
        
        return 'light';
    }

    function applyThemeStyles() {
        const theme = detectTheme();
        
        document.querySelectorAll('.admonition, .code-group-container, .extended-tabs-container, .text-header, .extended-markdown-tooltip, .spoiler, .steps-container, .collapsible-wrapper').forEach(element => {
            element.classList.remove('theme-light', 'theme-dark');
            element.classList.add(`theme-${theme}`);
        });
    }

    function setupThemeWatcher() {
        const skinSwitcher = document.querySelector(`[component="skinSwitcher"]`);
        if (skinSwitcher) {
            skinSwitcher.addEventListener('click', function() {
                setTimeout(applyThemeStyles, 200);
            });
        }
    }

    // Bootstrap兼容性检测
    function getBootstrapVersion() {
        if (window.bootstrap && window.bootstrap.Tooltip) {
            return 5;
        } else if (window.jQuery && window.jQuery.fn.tooltip) {
            return 4;
        }
        return null;
    }

    function initializeTooltips() {
        const version = getBootstrapVersion();
        
        document.querySelectorAll('[data-bs-toggle="tooltip"], [data-toggle="tooltip"]').forEach(function(element) {
            if (element.hasAttribute('data-tooltip-initialized')) return;
            element.setAttribute('data-tooltip-initialized', 'true');
            
            if (version === 5 && window.bootstrap && window.bootstrap.Tooltip) {
                new window.bootstrap.Tooltip(element);
            } else if (version === 4 && window.jQuery && window.jQuery.fn.tooltip) {
                $(element).tooltip();
            }
        });
    }

    function initializeCollapse() {
        document.querySelectorAll('.extended-markdown-collapsible').forEach(function(button) {
            if (button.hasAttribute('data-collapse-initialized')) return;
            button.setAttribute('data-collapse-initialized', 'true');
            
            const targetSelector = button.getAttribute('data-bs-target') || button.getAttribute('data-target');
            const target = document.querySelector(targetSelector);
            const icon = button.querySelector('.collapse-icon');
            
            button.addEventListener('click', function(e) {
                e.preventDefault();
                
                if (target) {
                    const isCollapsed = !target.classList.contains('show');
                    
                    if (isCollapsed) {
                        target.classList.add('show');
                        if (icon) {
                            icon.classList.remove('fa-chevron-right');
                            icon.classList.add('fa-chevron-down');
                        }
                        button.setAttribute('aria-expanded', 'true');
                    } else {
                        target.classList.remove('show');
                        if (icon) {
                            icon.classList.remove('fa-chevron-down');
                            icon.classList.add('fa-chevron-right');
                        }
                        button.setAttribute('aria-expanded', 'false');
                    }
                }
            });
        });
    }

    function initializeTabs() {
        document.querySelectorAll('.code-group-container, .extended-tabs-container').forEach(function(container) {
            if (container.hasAttribute('data-tabs-initialized')) return;
            container.setAttribute('data-tabs-initialized', 'true');
            
            const tabButtons = container.querySelectorAll('.nav-link');
            const tabPanes = container.querySelectorAll('.tab-pane');
            
            tabButtons.forEach(function(button, index) {
                button.addEventListener('click', function(e) {
                    e.preventDefault();
                    
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    tabPanes.forEach(pane => pane.classList.remove('show', 'active'));
                    
                    button.classList.add('active');
                    if (tabPanes[index]) {
                        tabPanes[index].classList.add('show', 'active');
                    }
                });
            });
        });
    }

    function initializeSteps() {
        document.querySelectorAll('.steps-container').forEach(function(container) {
            if (container.hasAttribute('data-steps-initialized')) return;
            container.setAttribute('data-steps-initialized', 'true');
            
            const tabButtons = container.querySelectorAll('.nav-link');
            const tabPanes = container.querySelectorAll('.tab-pane');
            const prevBtn = container.querySelector('.step-prev');
            const nextBtn = container.querySelector('.step-next');
            const currentStepSpan = container.querySelector('.current-step');
            
            function updateStepNavigation(activeIndex) {
                if (prevBtn) prevBtn.disabled = activeIndex === 0;
                if (nextBtn) nextBtn.disabled = activeIndex === tabButtons.length - 1;
                if (currentStepSpan) currentStepSpan.textContent = activeIndex + 1;
                
                if (nextBtn) {
                    if (activeIndex === tabButtons.length - 1) {
                        nextBtn.innerHTML = '<i class="fa fa-check"></i> 完成';
                    } else {
                        nextBtn.innerHTML = '下一步 <i class="fa fa-chevron-right"></i>';
                    }
                }
            }
            
            tabButtons.forEach(function(button, index) {
                button.addEventListener('click', function(e) {
                    e.preventDefault();
                    
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    tabPanes.forEach(pane => pane.classList.remove('show', 'active'));
                    
                    button.classList.add('active');
                    if (tabPanes[index]) {
                        tabPanes[index].classList.add('show', 'active');
                    }
                    
                    updateStepNavigation(index);
                });
            });
            
            if (prevBtn) {
                prevBtn.addEventListener('click', function() {
                    const activeIndex = Array.from(tabButtons).findIndex(btn => btn.classList.contains('active'));
                    if (activeIndex > 0) {
                        tabButtons[activeIndex - 1].click();
                    }
                });
            }
            
            if (nextBtn) {
                nextBtn.addEventListener('click', function() {
                    const activeIndex = Array.from(tabButtons).findIndex(btn => btn.classList.contains('active'));
                    if (activeIndex < tabButtons.length - 1) {
                        tabButtons[activeIndex + 1].click();
                    }
                });
            }
            
            updateStepNavigation(0);
        });
    }

    ExtendedMarkdown.prepareFormattingTools = async function () {
        try {
            const [formatting, controls] = await app.require(['composer/formatting', 'composer/controls']);
            
            if (formatting && controls) {
                formatting.addButtonDispatch('textheader', function (textarea, selectionStart, selectionEnd) {
                    controls.wrapSelectionInTextareaWith(textarea, '#anchor(', ')');
                });
                
                formatting.addButtonDispatch('groupedcode', function (textarea, selectionStart, selectionEnd) {
                    controls.insertIntoTextarea(textarea, '\n===group\n```java\nSystem.out.println("Hello");\n```\n```kotlin\nprintln("Hello")\n```\n===\n');
                });
                
                formatting.addButtonDispatch('bubbleinfo', function (textarea, selectionStart, selectionEnd) {
                    controls.wrapSelectionInTextareaWith(textarea, '°', '°(tooltip text)');
                });
                
                formatting.addButtonDispatch('color', function (textarea, selectionStart, selectionEnd) {
                    controls.wrapSelectionInTextareaWith(textarea, '%(#ff0000)[', ']');
                });
                
                formatting.addButtonDispatch('left', function (textarea, selectionStart, selectionEnd) {
                    controls.wrapSelectionInTextareaWith(textarea, '|-', '');
                });
                
                formatting.addButtonDispatch('center', function (textarea, selectionStart, selectionEnd) {
                    controls.wrapSelectionInTextareaWith(textarea, '|-', '-|');
                });
                
                formatting.addButtonDispatch('right', function (textarea, selectionStart, selectionEnd) {
                    controls.wrapSelectionInTextareaWith(textarea, '', '-|');
                });
                
                formatting.addButtonDispatch('justify', function (textarea, selectionStart, selectionEnd) {
                    controls.wrapSelectionInTextareaWith(textarea, '|=', '=|');
                });
                
                formatting.addButtonDispatch('spoiler', function (textarea, selectionStart, selectionEnd) {
                    controls.wrapSelectionInTextareaWith(textarea, '||', '||');
                });
                
                formatting.addButtonDispatch('noteinfo', function (textarea, selectionStart, selectionEnd) {
                    controls.insertIntoTextarea(textarea, '\n!!! info [Title]: Content\n');
                });
                
                formatting.addButtonDispatch('notewarning', function (textarea, selectionStart, selectionEnd) {
                    controls.insertIntoTextarea(textarea, '\n!!! warning [Title]: Content\n');
                });
                
                formatting.addButtonDispatch('noteimportant', function (textarea, selectionStart, selectionEnd) {
                    controls.insertIntoTextarea(textarea, '\n!!! important [Title]: Content\n');
                });

                formatting.addButtonDispatch('tabs', function (textarea, selectionStart, selectionEnd) {
                    controls.insertIntoTextarea(textarea, '\n:::tabs\n@tab Tab 1\nContent for tab 1\n@tab Tab 2\nContent for tab 2\n:::\n');
                });

                formatting.addButtonDispatch('superscript', function (textarea, selectionStart, selectionEnd) {
                    controls.wrapSelectionInTextareaWith(textarea, 'E=mc^', '^');
                });

                formatting.addButtonDispatch('subscript', function (textarea, selectionStart, selectionEnd) {
                    controls.wrapSelectionInTextareaWith(textarea, 'H~', '~O');
                });

                formatting.addButtonDispatch('collapsible', function (textarea, selectionStart, selectionEnd) {
                    controls.insertIntoTextarea(textarea, '\n+++ Click to expand\nHidden content here\n+++\n');
                });

                formatting.addButtonDispatch('steps', function (textarea, selectionStart, selectionEnd) {
                    controls.insertIntoTextarea(textarea, '\n:::steps\n1. First step\n2. Second step\n3. Third step\n:::\n');
                });
            }
        } catch (error) {
            console.warn('Extended Markdown: Could not load formatting tools', error);
        }
    };

    function pageReady() {
        setTimeout(function() {
            // 初始化spoiler功能
            document.querySelectorAll('.spoiler:not([data-spoiler-initialized])').forEach(function(spoiler) {
                spoiler.setAttribute('data-spoiler-initialized', 'true');
                spoiler.addEventListener('click', function() {
                    this.classList.toggle('spoiler-revealed');
                });
            });

            // 初始化标签页
            initializeTabs();
            
            // 初始化可折叠内容
            initializeCollapse();
            
            // 初始化工具提示
            initializeTooltips();
            
            // 应用主题样式
            applyThemeStyles();
            setupThemeWatcher();
            
            // 初始化步骤
            initializeSteps();
        }, 100);
    }

    // 监听DOM变化，自动应用主题
    const observer = new MutationObserver(function(mutations) {
        let shouldUpdate = false;
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && 
               (mutation.attributeName === 'class' || 
                mutation.attributeName === 'data-theme' || 
                mutation.attributeName === 'data-bs-theme')) {
                shouldUpdate = true;
            }
            
            // 检查是否有新添加的元素需要初始化
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // Element node
                        if (node.classList && 
                            (node.classList.contains('steps-container') || 
                             node.classList.contains('extended-tabs-container') ||
                             node.classList.contains('collapsible-wrapper'))) {
                            setTimeout(pageReady, 50);
                        }
                    }
                });
            }
        });
        
        if (shouldUpdate) {
            setTimeout(applyThemeStyles, 100);
        }
    });
    
    observer.observe(document.body, { 
        attributes: true, 
        childList: true, 
        subtree: true 
    });
    observer.observe(document.documentElement, { attributes: true });

    // 步骤导航功能
    $(document).on('click', '.step-prev, .step-next', function() {
        const isNext = $(this).hasClass('step-next');
        const container = $(this).closest('.steps-container');
        const tabs = container.find('.nav-link');
        const currentIndex = tabs.filter('.active').index();
        const newIndex = isNext ? currentIndex + 1 : currentIndex - 1;
        
        if (newIndex >= 0 && newIndex < tabs.length) {
            tabs.eq(newIndex).tab('show');
            updateStepNavigation(container, newIndex);
        }
    });
    
    // 当步骤标签页切换时更新导航按钮
    $(document).on('shown.bs.tab', '.steps-nav .nav-link', function() {
        const container = $(this).closest('.steps-container');
        const index = $(this).index();
        updateStepNavigation(container, index);
    });
    
    // 折叠框图标旋转
    $(document).on('click', '.extended-markdown-collapsible', function() {
        const icon = $(this).find('.collapse-icon');
        const isExpanded = $(this).attr('aria-expanded') === 'true';
        
        if (isExpanded) {
            icon.removeClass('fa-chevron-right').addClass('fa-chevron-down');
        } else {
            icon.removeClass('fa-chevron-down').addClass('fa-chevron-right');
        }
    });
    
    function updateStepNavigation(container, currentIndex) {
        const prevBtn = container.find('.step-prev');
        const nextBtn = container.find('.step-next');
        const indicator = container.find('.current-step');
        const totalSteps = container.find('.nav-link').length;
        
        // 更新按钮状态
        prevBtn.prop('disabled', currentIndex === 0);
        nextBtn.prop('disabled', currentIndex === totalSteps - 1);
        
        // 更新指示器
        indicator.text(currentIndex + 1);
        
        // 更新按钮文本
        if (currentIndex === totalSteps - 1) {
            nextBtn.html('<i class="fa fa-check"></i> 完成');
        } else {
            nextBtn.html('下一步 <i class="fa fa-chevron-right"></i>');
        }
    }
});
