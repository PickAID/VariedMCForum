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

    function getBootstrapVersion() {
        if (window.bootstrap && window.bootstrap.Tab) {
            return 5;
        } else if (window.jQuery && window.jQuery.fn.tab) {
            return 4;
        }
        return null;
    }

    function initializeTabComponents() {
        document.querySelectorAll('.code-group-container, .extended-tabs-container, .steps-container').forEach(function(container) {
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
                        
                        if (container.classList.contains('steps-container')) {
                            const index = Array.from(tabButtons).indexOf(this);
                            updateStepNavigation(container, index);
                        }
                    }
                });
            });
            
            if (container.classList.contains('steps-container')) {
                initializeStepNavigation(container);
            }
        });
    }

    function initializeStepNavigation(container) {
        const tabButtons = container.querySelectorAll('[data-bs-toggle="tab"]');
        const prevBtn = container.querySelector('.step-prev');
        const nextBtn = container.querySelector('.step-next');
        
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
        
        updateStepNavigation(container, 0);
    }

    function updateStepNavigation(container, currentIndex) {
        const prevBtn = container.querySelector('.step-prev');
        const nextBtn = container.querySelector('.step-next');
        const indicator = container.querySelector('.current-step');
        const totalSteps = container.querySelectorAll('[data-bs-toggle="tab"]').length;
        
        if (prevBtn) prevBtn.disabled = currentIndex === 0;
        if (nextBtn) nextBtn.disabled = currentIndex === totalSteps - 1;
        
        if (indicator) indicator.textContent = currentIndex + 1;
        
        if (nextBtn) {
            if (currentIndex === totalSteps - 1) {
                nextBtn.innerHTML = '<i class="fa fa-check"></i> 完成';
            } else {
                nextBtn.innerHTML = '下一步 <i class="fa fa-chevron-right"></i>';
            }
        }
    }

    function initializeCollapse() {
        document.querySelectorAll('.extended-markdown-collapsible').forEach(function(button) {
            button.addEventListener('click', function() {
                const icon = this.querySelector('.collapse-icon');
                const targetId = this.getAttribute('data-bs-target');
                const target = document.querySelector(targetId);
                
                if (target && icon) {
                    const isExpanded = !target.classList.contains('show');
                    
                    if (isExpanded) {
                        target.classList.add('show');
                        icon.classList.remove('fa-chevron-right');
                        icon.classList.add('fa-chevron-down');
                        this.setAttribute('aria-expanded', 'true');
                    } else {
                        target.classList.remove('show');
                        icon.classList.remove('fa-chevron-down');
                        icon.classList.add('fa-chevron-right');
                        this.setAttribute('aria-expanded', 'false');
                    }
                }
            });
        });
    }

    function initializeTooltips() {
        if (window.bootstrap && window.bootstrap.Tooltip) {
            document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(function(element) {
                new bootstrap.Tooltip(element);
            });
        } else if (window.jQuery && $.fn.tooltip) {
            $('[data-bs-toggle="tooltip"]').tooltip();
        }
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
            initializeTabComponents();
            initializeCollapse();
            initializeTooltips();
            applyThemeStyles();
            setupThemeWatcher();
        }, 100);
    }

    const observer = new MutationObserver(function(mutations) {
        let shouldUpdate = false;
        let shouldReinit = false;
        
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && 
               (mutation.attributeName === 'class' || 
                mutation.attributeName === 'data-theme' || 
                mutation.attributeName === 'data-bs-theme')) {
                shouldUpdate = true;
            }
            
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) {
                        if (node.classList && 
                            (node.classList.contains('steps-container') || 
                             node.classList.contains('extended-tabs-container') ||
                             node.classList.contains('code-group-container') ||
                             node.classList.contains('collapsible-wrapper'))) {
                            shouldReinit = true;
                        }
                    }
                });
            }
        });
        
        if (shouldReinit) {
            setTimeout(pageReady, 50);
        } else if (shouldUpdate) {
            setTimeout(applyThemeStyles, 100);
        }
    });
    
    observer.observe(document.body, { 
        attributes: true, 
        childList: true, 
        subtree: true 
    });
    observer.observe(document.documentElement, { attributes: true });

    $(window).on('action:ajaxify.end', pageReady);
    $(window).on('action:posts.loaded', pageReady);
    $(window).on('action:topic.loaded', pageReady);
    
    pageReady();
});
