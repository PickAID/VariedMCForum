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
        
        document.querySelectorAll('.admonition, .alert, .code-group-container, .extended-tabs-container, .text-header, .extended-markdown-tooltip, .spoiler, .steps-container, .collapsible-wrapper').forEach(element => {
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
                $icon.removeClass('fa-chevron-down').addClass('fa-chevron-right');
            } else {
                $target.addClass('show');
                $button.attr('aria-expanded', 'true');
                $icon.removeClass('fa-chevron-right').addClass('fa-chevron-down');
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

    ExtendedMarkdown.prepareFormattingTools = async function () {
        try {
            const [formatting, controls] = await app.require(['composer/formatting', 'composer/controls']);
            
            if (formatting && controls) {
                formatting.addButtonDispatch('textheader', function (textarea, selectionStart, selectionEnd) {
                    controls.wrapSelectionInTextareaWith(textarea, '#anchor(', ')');
                });
                
                formatting.addButtonDispatch('groupedcode', function (textarea, selectionStart, selectionEnd) {
                    controls.insertIntoTextarea(textarea, '\n===group\n```java\nJava代码\n```\n```kotlin\nKotlin代码\n```\n===\n');
                });
                
                formatting.addButtonDispatch('bubbleinfo', function (textarea, selectionStart, selectionEnd) {
                    controls.wrapSelectionInTextareaWith(textarea, '°', '°(提示文本)');
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
                
                formatting.addButtonDispatch('noteinfo', function (textarea, selectionStart, selectionEnd) {
                    controls.insertIntoTextarea(textarea, '\n!!! info [标题]: 内容\n');
                });
                
                formatting.addButtonDispatch('notewarning', function (textarea, selectionStart, selectionEnd) {
                    controls.insertIntoTextarea(textarea, '\n!!! warning [标题]: 内容\n');
                });
                
                formatting.addButtonDispatch('noteimportant', function (textarea, selectionStart, selectionEnd) {
                    controls.insertIntoTextarea(textarea, '\n!!! important [标题]: 内容\n');
                });

                formatting.addButtonDispatch('tabs', function (textarea, selectionStart, selectionEnd) {
                    controls.insertIntoTextarea(textarea, '\n[tabs]\n[tab=标签1]\n内容1\n[tab=标签2]\n内容2\n[/tabs]\n');
                });

                formatting.addButtonDispatch('superscript', function (textarea, selectionStart, selectionEnd) {
                    controls.wrapSelectionInTextareaWith(textarea, 'E=mc^', '^');
                });

                formatting.addButtonDispatch('subscript', function (textarea, selectionStart, selectionEnd) {
                    controls.wrapSelectionInTextareaWith(textarea, 'H~', '~O');
                });

                formatting.addButtonDispatch('collapsible', function (textarea, selectionStart, selectionEnd) {
                    controls.insertIntoTextarea(textarea, '\n[spoiler=点击展开]\n隐藏内容\n[/spoiler]\n');
                });

                formatting.addButtonDispatch('steps', function (textarea, selectionStart, selectionEnd) {
                    controls.insertIntoTextarea(textarea, '\n[steps]\n[step]\n第一步内容\n[step]\n第二步内容\n[/steps]\n');
                });

                formatting.addButtonDispatch('ruby', function (textarea, selectionStart, selectionEnd) {
                    controls.wrapSelectionInTextareaWith(textarea, '@中国(', ')');
                });
            }
        } catch (error) {
            console.warn('Extended Markdown: Could not load formatting tools', error);
        }
    };

    function pageReady() {
        if ($('[data-bs-toggle="tooltip"]').length) {
            $('[data-bs-toggle="tooltip"]').tooltip();
        }
        
        applyThemeStyles();
        setupThemeWatcher();
        initializeTabComponents();
        initializeCollapse();
        initExtendedMarkdownComponents();
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
                applyThemeStyles();
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
