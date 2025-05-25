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
        
        document.querySelectorAll('.alert, .code-group-container, .extended-tabs-container, .text-header, .extended-markdown-tooltip, .spoiler, .steps-container, .collapsible-wrapper, .bubble-info').forEach(element => {
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
                setTimeout(() => {
                    const isDark = $(this).parent().find(".dropdown-header").text().includes("Dark") || 
                                   $(this).parent().find(".dropdown-header").text().includes("暗色");
                    applyExtendedMarkdownTheme(isDark);
                }, 100);
            });
        }
        
        if (document.documentElement.classList.contains('dark') || 
            document.body.classList.contains('dark') ||
            localStorage.getItem('theme') === 'dark') {
            applyExtendedMarkdownTheme(true);
        }
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
        $('.extended-markdown-collapsible:not([data-collapse-initialized])').each(function() {
            const $button = $(this);
            $button.attr('data-collapse-initialized', 'true');
            
            const targetId = $button.attr('data-bs-target');
            const $target = $(targetId);
            
            if ($target.length) {
                const $icon = $button.find('.collapse-icon');
                
                $button.off('click.extended-collapse').on('click.extended-collapse', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
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
                
                if ($button.attr('aria-expanded') === 'true') {
                    $target.addClass('show');
                    $icon.css('transform', 'rotate(90deg)');
                } else {
                    $target.removeClass('show');
                    $icon.css('transform', 'rotate(0deg)');
                }
            }
        });
    }

    function initializeTooltips() {
        $('.extended-markdown-tooltip').each(function() {
            const $tooltip = $(this);
            if (!$tooltip.data('tooltip-initialized')) {
                $tooltip.data('tooltip-initialized', true);
                
                const tooltipText = $tooltip.data('tooltip');
                if (tooltipText) {
                    $tooltip.attr('title', tooltipText);
                }
            }
        });
    }

    function initStepsNavigation() {
        $('.steps-container').each(function() {
            const $container = $(this);
            
            if (!$container.data('steps-initialized')) {
                $container.data('steps-initialized', true);
                
                const $prevBtn = $container.find('.step-prev');
                const $nextBtn = $container.find('.step-next');
                const $tabs = $container.find('.nav-link');
                const $counter = $container.find('.current-step');
                const $total = $container.find('.total-steps');
                
                if ($prevBtn.length && $nextBtn.length && $tabs.length) {
                    $total.text($tabs.length);
                    
                    $prevBtn.off('click.steps').on('click.steps', function(e) {
                        e.preventDefault();
                        const $current = $container.find('.nav-link.active');
                        const $prev = $current.closest('.nav-item').prev().find('.nav-link');
                        if ($prev.length) {
                            $prev.trigger('click');
                        }
                    });
                    
                    $nextBtn.off('click.steps').on('click.steps', function(e) {
                        e.preventDefault();
                        const $current = $container.find('.nav-link.active');
                        const $next = $current.closest('.nav-item').next().find('.nav-link');
                        if ($next.length) {
                            $next.trigger('click');
                        }
                    });
                    
                    function updateStepNavigation() {
                        const $current = $container.find('.nav-link.active');
                        const currentIndex = $current.closest('.nav-item').index();
                        const totalSteps = $tabs.length;
                        
                        $prevBtn.prop('disabled', currentIndex === 0);
                        $nextBtn.prop('disabled', currentIndex === totalSteps - 1);
                        
                        $counter.text(currentIndex + 1);
                    }
                    
                    $tabs.off('click.step-update').on('click.step-update', updateStepNavigation);
                    updateStepNavigation();
                }
            }
        });
    }

    ExtendedMarkdown.prepareFormattingTools = function () {
        require(['composer/formatting'], function (formatting) {
            if (formatting && formatting.addButtonDispatch) {
                formatting.addButtonDispatch('spoiler', function(textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        formatting.insertIntoTextarea(textarea, '[spoiler=点击展开]隐藏内容[/spoiler]');
                        textarea.selectionStart = selectionStart + 15;
                        textarea.selectionEnd = selectionStart + 19;
                    } else {
                        const selectedText = textarea.value.substring(selectionStart, selectionEnd);
                        formatting.insertIntoTextarea(textarea, `[spoiler=点击展开]${selectedText}[/spoiler]`);
                    }
                });
            }
        });
    };

    function pageReady() {
        setupExtendedMarkdownTheme();
        initializeTabComponents();
        initializeCollapse();
        initializeTooltips();
        initStepsNavigation();
    }

    let initTimeout;
    const observer = new MutationObserver(function(mutations) {
        let shouldInit = false;
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) {
                        if (node.matches && (
                            node.matches('.code-group-container, .extended-tabs-container, .steps-container, .collapsible-wrapper') ||
                            node.querySelector('.code-group-container, .extended-tabs-container, .steps-container, .collapsible-wrapper')
                        )) {
                            shouldInit = true;
                        }
                    }
                });
            }
        });
        
        if (shouldInit) {
            clearTimeout(initTimeout);
            initTimeout = setTimeout(() => {
                pageReady();
                setupExtendedMarkdownTheme();
            }, 100);
        }
    });
    
    observer.observe(document.documentElement, {
        childList: true, 
        subtree: true 
    });

    $(window).on('action:ajaxify.end', function() {
        clearTimeout(initTimeout);
        initTimeout = setTimeout(() => {
            pageReady();
            setupExtendedMarkdownTheme();
        }, 150);
    });
    
    pageReady();
});
