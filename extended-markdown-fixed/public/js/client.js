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
        
        document.querySelectorAll('.admonition').forEach(element => {
            if (!element.classList.contains(`theme-${theme}`)) {
                element.classList.remove('theme-light', 'theme-dark');
                element.classList.add(`theme-${theme}`);
            }
        });
        
        document.querySelectorAll('.code-group-container, .extended-tabs-container').forEach(element => {
            if (!element.classList.contains(`theme-${theme}`)) {
                element.classList.remove('theme-light', 'theme-dark');
                element.classList.add(`theme-${theme}`);
            }
        });
        
        document.querySelectorAll('.text-header, .extended-markdown-tooltip, .spoiler, .steps-container, .collapsible-wrapper').forEach(element => {
            if (!element.classList.contains(`theme-${theme}`)) {
                element.classList.remove('theme-light', 'theme-dark');
                element.classList.add(`theme-${theme}`);
            }
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

    ExtendedMarkdown.prepareFormattingTools = async function () {
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
    };

    function pageReady() {
        setTimeout(function() {
            document.querySelectorAll('.spoiler:not([data-spoiler-initialized])').forEach(function(spoiler) {
                spoiler.setAttribute('data-spoiler-initialized', 'true');
                spoiler.addEventListener('click', function() {
                    this.classList.toggle('spoiler-revealed');
                });
            });

            document.querySelectorAll('.code-group-container:not([data-processed])').forEach(function(container) {
                container.setAttribute('data-processed', 'true');
                
                const unwantedElements = container.querySelectorAll('.fa-chevron-left, .fa-chevron-right, .fa-angle-left, .fa-angle-right, .fa-arrow-left, .fa-arrow-right, .fa-caret-left, .fa-caret-right, .carousel-control, .carousel-control-prev, .carousel-control-next, .slick-prev, .slick-next, .swiper-button-prev, .swiper-button-next, .owl-prev, .owl-next, .prev, .next, [data-slide], [data-bs-slide]');
                unwantedElements.forEach(function(el) {
                    el.remove();
                });
                
                Array.from(container.children).forEach(function(child) {
                    if (!child.classList.contains('nav-tabs') && 
                        !child.classList.contains('tab-content')) {
                        child.remove();
                    }
                });
            });

            document.querySelectorAll('.extended-tabs-container:not([data-tabs-initialized])').forEach(function(container) {
                container.setAttribute('data-tabs-initialized', 'true');
                
                const tabLinks = container.querySelectorAll('.nav-tabs a[data-toggle="tab"]');
                tabLinks.forEach(function(link) {
                    link.addEventListener('click', function(e) {
                        e.preventDefault();
                        
                        tabLinks.forEach(function(l) {
                            l.parentElement.classList.remove('active');
                        });
                        
                        container.querySelectorAll('.tab-pane').forEach(function(pane) {
                            pane.classList.remove('active');
                        });
                        
                        this.parentElement.classList.add('active');
                        const targetId = this.getAttribute('href').substring(1);
                        const targetPane = document.getElementById(targetId);
                        if (targetPane) {
                            targetPane.classList.add('active');
                        }
                    });
                });
            });

            document.querySelectorAll('.extended-markdown-collapsible:not([data-collapse-initialized])').forEach(function(button) {
                button.setAttribute('data-collapse-initialized', 'true');
                
                const target = document.querySelector(button.getAttribute('data-bs-target'));
                const icon = button.querySelector('.collapse-icon');
                
                button.addEventListener('click', function() {
                    if (target) {
                        if (target.classList.contains('show')) {
                            target.classList.remove('show');
                            if (icon) {
                                icon.classList.remove('fa-chevron-down');
                                icon.classList.add('fa-chevron-right');
                            }
                        } else {
                            target.classList.add('show');
                            if (icon) {
                                icon.classList.remove('fa-chevron-right');
                                icon.classList.add('fa-chevron-down');
                            }
                        }
                    }
                });
            });

            if (window.bootstrap && window.bootstrap.Tooltip) {
                document.querySelectorAll('[data-bs-toggle="tooltip"]:not([data-tooltip-initialized])').forEach(function(element) {
                    element.setAttribute('data-tooltip-initialized', 'true');
                    new window.bootstrap.Tooltip(element);
                });
            }
            
            applyThemeStyles();
            setupThemeWatcher();
        }, 100);
    }

    const observer = new MutationObserver(function(mutations) {
        let shouldUpdate = false;
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && 
               (mutation.attributeName === 'class' || 
                mutation.attributeName === 'data-theme' || 
                mutation.attributeName === 'data-bs-theme')) {
                shouldUpdate = true;
            }
        });
        if (shouldUpdate) {
            setTimeout(applyThemeStyles, 100);
        }
    });
    
    observer.observe(document.body, { attributes: true });
    observer.observe(document.documentElement, { attributes: true });
});
