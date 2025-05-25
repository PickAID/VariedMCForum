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

    function applyExtendedMarkdownTheme(isDark) {
        const themeClass = 'extended-dark-theme';
        
        document.querySelectorAll('.alert, .code-group-container, .extended-tabs-container, .text-header, .extended-markdown-tooltip, .spoiler, .steps-container, .collapsible-wrapper').forEach(element => {
            if (isDark) {
                element.classList.add(themeClass);
            } else {
                element.classList.remove(themeClass);
            }
        });
    }

    function setupExtendedMarkdownTheme() {
        const skinSwitcher = $(`[component="skinSwitcher"]`);
        if (skinSwitcher.length) {
            let darkSkinList = skinSwitcher.find('.dropdown-header').eq(1).parent();
            applyExtendedMarkdownTheme(darkSkinList.find(".fa-check").length > darkSkinList.find(".invisible").length);
            
            skinSwitcher.find('li').off('click.extended-markdown-theme').on('click.extended-markdown-theme', function (e) {
                applyExtendedMarkdownTheme($(this).parent().find(".dropdown-header").text() == "Dark");
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
        $('.extended-markdown-collapsible').each(function() {
            const $button = $(this);
            const targetSelector = $button.attr('data-bs-target');
            const $target = $(targetSelector);
            const $icon = $button.find('.collapse-icon');
            
            if ($target.length === 0) return;
            
            const isExpanded = $target.hasClass('show');
            $button.attr('aria-expanded', isExpanded);
            $icon.css('transform', isExpanded ? 'rotate(90deg)' : 'rotate(0deg)');
        });

        $('.extended-markdown-collapsible').off('click.extended-collapse').on('click.extended-collapse', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const $button = $(this);
            const targetSelector = $button.attr('data-bs-target');
            const $target = $(targetSelector);
            const $icon = $button.find('.collapse-icon');
            
            if ($target.length === 0) return;
            
            const isCurrentlyExpanded = $target.hasClass('show');
            
            if (isCurrentlyExpanded) {
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
                    tooltip.style.opacity = '1';
                    
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

    ExtendedMarkdown.prepareFormattingTools = function() {
        require(['composer/formatting'], function(formatting) {
            if (formatting && formatting.addButtonDispatch) {
                formatting.addButtonDispatch('textheader', function(textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        formatting.insertIntoTextarea(textarea, '#anchor(Header Text)');
                        textarea.selectionStart = selectionStart + 8;
                        textarea.selectionEnd = selectionStart + 19;
                    } else {
                        const selectedText = textarea.value.substring(selectionStart, selectionEnd);
                        const anchorId = selectedText.toLowerCase().replace(/[^a-z0-9]/g, '');
                        formatting.insertIntoTextarea(textarea, `#${anchorId}(${selectedText})`);
                    }
                });

                formatting.addButtonDispatch('groupedcode', function(textarea, selectionStart, selectionEnd) {
                    const codeTemplate = '===group\n```javascript\n// JavaScript code\nconsole.log("Hello World");\n```\n\n```python\n# Python code\nprint("Hello World")\n```\n===';
                    formatting.insertIntoTextarea(textarea, codeTemplate);
                });

                formatting.addButtonDispatch('bubbleinfo', function(textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        formatting.insertIntoTextarea(textarea, '°text°(tooltip content)');
                        textarea.selectionStart = selectionStart + 1;
                        textarea.selectionEnd = selectionStart + 5;
                    } else {
                        const selectedText = textarea.value.substring(selectionStart, selectionEnd);
                        formatting.insertIntoTextarea(textarea, `°${selectedText}°(tooltip content)`);
                        const newPos = selectionEnd + 3;
                        textarea.selectionStart = newPos;
                        textarea.selectionEnd = newPos + 15;
                    }
                });

                formatting.addButtonDispatch('spoiler', function(textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        formatting.insertIntoTextarea(textarea, '[spoiler=Click to reveal]Hidden content[/spoiler]');
                        textarea.selectionStart = selectionStart + 23;
                        textarea.selectionEnd = selectionStart + 37;
                    } else {
                        const selectedText = textarea.value.substring(selectionStart, selectionEnd);
                        formatting.insertIntoTextarea(textarea, `[spoiler=Click to reveal]${selectedText}[/spoiler]`);
                    }
                });

                formatting.addButtonDispatch('noteinfo', function(textarea, selectionStart, selectionEnd) {
                    formatting.insertIntoTextarea(textarea, '!!! info [Information]: Your info message here');
                    textarea.selectionStart = selectionStart + 27;
                    textarea.selectionEnd = selectionStart + 50;
                });

                formatting.addButtonDispatch('notewarning', function(textarea, selectionStart, selectionEnd) {
                    formatting.insertIntoTextarea(textarea, '!!! warning [Warning]: Your warning message here');
                    textarea.selectionStart = selectionStart + 27;
                    textarea.selectionEnd = selectionStart + 52;
                });

                formatting.addButtonDispatch('noteimportant', function(textarea, selectionStart, selectionEnd) {
                    formatting.insertIntoTextarea(textarea, '!!! important [Important]: Your important message here');
                    textarea.selectionStart = selectionStart + 30;
                    textarea.selectionEnd = selectionStart + 58;
                });

                formatting.addButtonDispatch('tabs', function(textarea, selectionStart, selectionEnd) {
                    const tabsTemplate = '[tabs]\n[tab=Tab 1]\nContent for tab 1\n[tab=Tab 2]\nContent for tab 2\n[/tabs]';
                    formatting.insertIntoTextarea(textarea, tabsTemplate);
                });

                formatting.addButtonDispatch('steps', function(textarea, selectionStart, selectionEnd) {
                    const stepsTemplate = '[steps]\n[step]\nFirst step content\n[step]\nSecond step content\n[/steps]';
                    formatting.insertIntoTextarea(textarea, stepsTemplate);
                });

                formatting.addButtonDispatch('superscript', function(textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        formatting.insertIntoTextarea(textarea, 'text^superscript^');
                        textarea.selectionStart = selectionStart + 5;
                        textarea.selectionEnd = selectionStart + 16;
                    } else {
                        const selectedText = textarea.value.substring(selectionStart, selectionEnd);
                        formatting.insertIntoTextarea(textarea, `${selectedText}^superscript^`);
                    }
                });

                formatting.addButtonDispatch('subscript', function(textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        formatting.insertIntoTextarea(textarea, 'text~subscript~');
                        textarea.selectionStart = selectionStart + 5;
                        textarea.selectionEnd = selectionStart + 14;
                    } else {
                        const selectedText = textarea.value.substring(selectionStart, selectionEnd);
                        formatting.insertIntoTextarea(textarea, `${selectedText}~subscript~`);
                    }
                });

                formatting.addButtonDispatch('collapsible', function(textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        formatting.insertIntoTextarea(textarea, '[spoiler=Click to expand]\nHidden content here\n[/spoiler]');
                        textarea.selectionStart = selectionStart + 28;
                        textarea.selectionEnd = selectionStart + 48;
                    } else {
                        const selectedText = textarea.value.substring(selectionStart, selectionEnd);
                        formatting.insertIntoTextarea(textarea, `[spoiler=Click to expand]\n${selectedText}\n[/spoiler]`);
                    }
                });
            }
        });
    };

    function pageReady() {
        setupExtendedMarkdownTheme();
        initializeTabComponents();
        initializeCollapse();
        initExtendedMarkdownComponents();
        initializeTooltips();
    }

    const observer = new MutationObserver(function(mutations) {
        let shouldUpdate = false;
        mutations.forEach(function(mutation) {
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
                setupExtendedMarkdownTheme();
                initializeTabComponents();
                initializeCollapse();
                initExtendedMarkdownComponents();
            }, 100);
        }
    });
    
    observer.observe(document.documentElement, {
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
