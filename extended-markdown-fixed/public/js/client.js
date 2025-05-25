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

    function applyThemeStyles(isDark) {
        const theme = isDark ? 'dark' : 'light';
        
        document.querySelectorAll('.admonition, .alert, .code-group-container, .extended-tabs-container, .text-header, .extended-markdown-tooltip, .spoiler, .steps-container, .collapsible-wrapper').forEach(element => {
            element.classList.remove('theme-light', 'theme-dark');
            element.classList.add(`theme-${theme}`);
        });
    }

    function setupThemeWatcher() {
        const skinSwitcher = $(`[component="skinSwitcher"]`);
        if (skinSwitcher.length) {
            let darkSkinList = skinSwitcher.find('.dropdown-header').eq(1).parent();
            applyThemeStyles(darkSkinList.find(".fa-check").length > darkSkinList.find(".invisible").length);
            
            skinSwitcher.find('li').off('click.extended-markdown').on('click.extended-markdown', function (e) {
                applyThemeStyles($(this).parent().find(".dropdown-header").text() == "Dark");
            });
        }
    }

    function initializeTabComponents() {
        document.querySelectorAll('.code-group-container, .extended-tabs-container').forEach(function(container) {
            const tabButtons = container.querySelectorAll('[data-bs-toggle="tab"]');
            
            tabButtons.forEach(function(button) {
                button.addEventListener('click', function(e) {
                    e.preventDefault();
                    
                    const targetId = this.getAttribute('data-bs-target');
                    const target = document.querySelector(targetId);
                    
                    if (target) {
                        const allPanes = container.querySelectorAll('.tab-pane');
                        allPanes.forEach(pane => {
                            pane.classList.remove('show', 'active');
                        });
                        
                        tabButtons.forEach(btn => {
                            btn.classList.remove('active');
                            btn.setAttribute('aria-selected', 'false');
                        });
                        
                        target.classList.add('show', 'active');
                        this.classList.add('active');
                        this.setAttribute('aria-selected', 'true');
                    }
                });
            });
        });
    }

    function initializeCollapse() {
        $('.extended-markdown-collapsible').off('click.collapsible').on('click.collapsible', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const $button = $(this);
            const targetId = $button.attr('data-bs-target');
            const $target = $(targetId);
            const $icon = $button.find('.collapse-icon');
            const isExpanded = $button.attr('aria-expanded') === 'true';
            
            if (isExpanded) {
                $target.removeClass('show');
                $button.attr('aria-expanded', 'false');
                $icon.css('transform', 'rotate(0deg)');
            } else {
                $target.addClass('show');
                $button.attr('aria-expanded', 'true');
                $icon.css('transform', 'rotate(90deg)');
            }
        });
    }

    function initializeTooltips() {
        document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(function(element) {
            element.addEventListener('mouseenter', function() {
                const title = this.getAttribute('title') || this.getAttribute('data-bs-title');
                if (title) {
                    const tooltip = document.createElement('div');
                    tooltip.className = 'tooltip bs-tooltip-top';
                    tooltip.innerHTML = `<div class="tooltip-inner">${title}</div>`;
                    
                    document.body.appendChild(tooltip);
                    
                    const rect = this.getBoundingClientRect();
                    tooltip.style.position = 'absolute';
                    tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
                    tooltip.style.top = rect.top - tooltip.offsetHeight - 5 + 'px';
                    tooltip.style.zIndex = '1070';
                    
                    this._tooltip = tooltip;
                }
            });
            
            element.addEventListener('mouseleave', function() {
                if (this._tooltip) {
                    this._tooltip.remove();
                    this._tooltip = null;
                }
            });
        });
    }

    ExtendedMarkdown.prepareFormattingTools = function () {
        require(['composer/formatting', 'composer/controls'], function (formatting, controls) {
            if (formatting && controls) {
                formatting.addButtonDispatch('textheader', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '#my-text-header(Header text)');
                        controls.updateTextareaSelection(textarea, selectionStart + 16, selectionStart + 27);
                    } else {
                        var selectedText = textarea.value.substring(selectionStart, selectionEnd);
                        controls.replaceSelectionInTextarea(textarea, '#text-header(' + selectedText + ')');
                    }
                });

                formatting.addButtonDispatch('groupedcode', function (textarea, selectionStart, selectionEnd) {
                    controls.insertIntoTextarea(textarea, '===group\n```java\npublic class Test {\n    \n}\n```\n\n```kotlin\nclass Test {\n    \n}\n```\n===');
                });

                formatting.addButtonDispatch('tabs', function (textarea, selectionStart, selectionEnd) {
                    controls.insertIntoTextarea(textarea, '[tabs]\n[tab=标签1]\n内容1\n[tab=标签2]\n内容2\n[/tabs]');
                });

                formatting.addButtonDispatch('steps', function (textarea, selectionStart, selectionEnd) {
                    controls.insertIntoTextarea(textarea, '[steps]\n[step]\n步骤1内容\n[step]\n步骤2内容\n[/steps]');
                });

                formatting.addButtonDispatch('collapsible', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '[spoiler=点击展开]\n隐藏内容\n[/spoiler]');
                    } else {
                        var selectedText = textarea.value.substring(selectionStart, selectionEnd);
                        controls.replaceSelectionInTextarea(textarea, '[spoiler=点击展开]\n' + selectedText + '\n[/spoiler]');
                    }
                });

                formatting.addButtonDispatch('noteinfo', function (textarea, selectionStart, selectionEnd) {
                    controls.insertIntoTextarea(textarea, '!!! info [信息]: 这是一条信息提示。');
                });

                formatting.addButtonDispatch('notewarning', function (textarea, selectionStart, selectionEnd) {
                    controls.insertIntoTextarea(textarea, '!!! warning [警告]: 这是一条警告提示。');
                });

                formatting.addButtonDispatch('noteimportant', function (textarea, selectionStart, selectionEnd) {
                    controls.insertIntoTextarea(textarea, '!!! important [重要]: 这是一条重要提示。');
                });

                formatting.addButtonDispatch('bubbleinfo', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '°文本°(提示信息)');
                        controls.updateTextareaSelection(textarea, selectionStart + 1, selectionStart + 3);
                    } else {
                        var selectedText = textarea.value.substring(selectionStart, selectionEnd);
                        controls.replaceSelectionInTextarea(textarea, '°' + selectedText + '°(提示信息)');
                    }
                });

                formatting.addButtonDispatch('superscript', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, 'x^2^');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionStart + 3);
                    } else {
                        var selectedText = textarea.value.substring(selectionStart, selectionEnd);
                        controls.replaceSelectionInTextarea(textarea, '^' + selectedText + '^');
                    }
                });

                formatting.addButtonDispatch('subscript', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, 'H~2~O');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionStart + 3);
                    } else {
                        var selectedText = textarea.value.substring(selectionStart, selectionEnd);
                        controls.replaceSelectionInTextarea(textarea, '~' + selectedText + '~');
                    }
                });
            }
        });
    };

    function pageReady() {
        setupThemeWatcher();
        initializeTabComponents();
        initializeCollapse();
        initExtendedMarkdownComponents();
        
        $('[data-bs-toggle="tooltip"]').tooltip({
            boundary: 'window',
            container: 'body'
        });
    }

    const observer = new MutationObserver(function(mutations) {
        let shouldUpdate = false;
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && 
                (mutation.attributeName === 'data-theme' || 
                 mutation.attributeName === 'data-bs-theme' ||
                 mutation.attributeName === 'class')) {
                shouldUpdate = true;
            }
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) {
                        const hasExtendedMarkdown = node.querySelector && (
                            node.querySelector('.extended-tabs-container') ||
                            node.querySelector('.steps-container') ||
                            node.querySelector('.code-group-container') ||
                            node.querySelector('.collapsible-wrapper') ||
                            node.querySelector('.alert')
                        );
                        if (hasExtendedMarkdown) {
                            shouldUpdate = true;
                        }
                    }
                });
            }
        });
        
        if (shouldUpdate) {
            setTimeout(() => {
                setupThemeWatcher();
                initializeTabComponents();
                initializeCollapse();
                initExtendedMarkdownComponents();
            }, 100);
        }
    });
    
    observer.observe(document.documentElement, {
        attributes: true,
        childList: true, 
        subtree: true 
    });

    $(window).on('action:ajaxify.end', pageReady);
    $(window).on('action:posts.loaded', pageReady);
    $(window).on('action:topic.loaded', pageReady);
    
    pageReady();
});

function initExtendedMarkdownComponents() {
    initStepsNavigation();
    initBootstrapTabs();
}

function initStepsNavigation() {
    $('.steps-container').each(function() {
        const container = $(this);
        const prevBtn = container.find('.step-prev');
        const nextBtn = container.find('.step-next');
        const currentStepSpan = container.find('.current-step');
        const totalStepsSpan = container.find('.total-steps');
        const tabs = container.find('.nav-link');
        
        let currentStep = 0;
        const totalSteps = tabs.length;
        
        function updateNavigation() {
            currentStepSpan.text(currentStep + 1);
            totalStepsSpan.text(totalSteps);
            
            prevBtn.prop('disabled', currentStep === 0);
            nextBtn.prop('disabled', currentStep === totalSteps - 1);
            
            tabs.removeClass('active');
            container.find('.tab-pane').removeClass('show active');
            
            tabs.eq(currentStep).addClass('active').attr('aria-selected', 'true');
            container.find('.tab-pane').eq(currentStep).addClass('show active');
        }
        
        prevBtn.off('click.steps').on('click.steps', function() {
            if (currentStep > 0) {
                currentStep--;
                updateNavigation();
            }
        });
        
        nextBtn.off('click.steps').on('click.steps', function() {
            if (currentStep < totalSteps - 1) {
                currentStep++;
                updateNavigation();
            }
        });
        
        tabs.off('click.steps').on('click.steps', function() {
            currentStep = tabs.index(this);
            updateNavigation();
        });
        
        updateNavigation();
    });
}

function initBootstrapTabs() {
    $('.extended-tabs-container .nav-link, .code-group-container .nav-link').off('click.bootstrap-tabs').on('click.bootstrap-tabs', function(e) {
        e.preventDefault();
        
        const targetId = $(this).data('bs-target');
        const container = $(this).closest('.extended-tabs-container, .code-group-container');
        
        container.find('.nav-link').removeClass('active').attr('aria-selected', 'false');
        container.find('.tab-pane').removeClass('show active');
        
        $(this).addClass('active').attr('aria-selected', 'true');
        $(targetId).addClass('show active');
    });
}
