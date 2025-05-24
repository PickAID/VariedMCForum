"use strict";

/* global $ */

$(document).ready(function () {
    var ExtendedMarkdown = {};

    pageReady();

    $(window).on('action:ajaxify.end', function (ev, data) {
        pageReady();
    });

    $(window).on('action:composer.enhanced', function (evt, data) {
        ExtendedMarkdown.prepareFormattingTools();
    });

    function detectTheme() {
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
        
        const selectors = [
            '.code-group-container',
            '.text-header',
            '.extended-markdown-tooltip',
            '.admonition',
            '.admonition .admonition-title',
            '.extended-markdown-spoiler',
            '.spoiler'
        ];
        
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.classList.remove('theme-light', 'theme-dark');
                element.classList.add(`theme-${theme}`);
            });
        });
    }

    function initThemeWatcher() {
        applyThemeStyles();
        
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && 
                    (mutation.attributeName === 'class' || 
                     mutation.attributeName === 'data-theme' || 
                     mutation.attributeName === 'data-bs-theme')) {
                    setTimeout(applyThemeStyles, 50);
                }
            });
        });
        
        observer.observe(document.body, { attributes: true });
        observer.observe(document.documentElement, { attributes: true });
        
        const linkObserver = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.tagName === 'LINK' && node.href && node.href.includes('bootstrap')) {
                            setTimeout(applyThemeStyles, 100);
                        }
                    });
                }
            });
        });
        
        linkObserver.observe(document.head, { childList: true });
    }

    ExtendedMarkdown.prepareFormattingTools = async function () {
        const [formatting, controls] = await app.require(['composer/formatting', 'composer/controls']);
        
        if (formatting && controls) {
            formatting.addButtonDispatch('textheader', function (textarea, selectionStart, selectionEnd) {
                controls.wrapSelectionInTextareaWith(textarea, '#anchor(', ')');
            });
            
            formatting.addButtonDispatch('groupedcode', function (textarea, selectionStart, selectionEnd) {
                controls.insertIntoTextarea(textarea, '\n===group\n```java\n// Java code here\n```\n```kotlin\n// Kotlin code here\n```\n===\n');
            });
            
            formatting.addButtonDispatch('bubbleinfo', function (textarea, selectionStart, selectionEnd) {
                controls.wrapSelectionInTextareaWith(textarea, '°', '°(tooltip text)');
            });
            
            formatting.addButtonDispatch('color', function (textarea, selectionStart, selectionEnd) {
                controls.wrapSelectionInTextareaWith(textarea, '%(#FF0000)[', ']');
            });
            
            formatting.addButtonDispatch('left', function (textarea, selectionStart, selectionEnd) {
                controls.wrapSelectionInTextareaWith(textarea, '<p align="left">', '</p>');
            });
            
            formatting.addButtonDispatch('center', function (textarea, selectionStart, selectionEnd) {
                controls.wrapSelectionInTextareaWith(textarea, '<p align="center">', '</p>');
            });
            
            formatting.addButtonDispatch('right', function (textarea, selectionStart, selectionEnd) {
                controls.wrapSelectionInTextareaWith(textarea, '<p align="right">', '</p>');
            });
            
            formatting.addButtonDispatch('justify', function (textarea, selectionStart, selectionEnd) {
                controls.wrapSelectionInTextareaWith(textarea, '<p align="justify">', '</p>');
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
        }
    };

    function pageReady() {
        setTimeout(function() {
            if (window.hljs) {
                document.querySelectorAll('pre code').forEach(function(codeBlock) {
                    if (!codeBlock.classList.contains('hljs')) {
                        window.hljs.highlightElement(codeBlock);
                    }
                });
            }

            if (window.hljs) {
                document.querySelectorAll('.code-group-container code').forEach(function(codeBlock) {
                    window.hljs.highlightElement(codeBlock);
                });
            }

            setTimeout(function() {
                document.querySelectorAll('.code-group-container').forEach(function(container) {
                    const unwantedSelectors = [
                        '.fa-chevron-left', '.fa-chevron-right', '.fa-angle-left', '.fa-angle-right',
                        '.fa-arrow-left', '.fa-arrow-right', '.fa-caret-left', '.fa-caret-right',
                        '.carousel-control', '.carousel-control-prev', '.carousel-control-next',
                        '.slick-prev', '.slick-next', '.swiper-button-prev', '.swiper-button-next',
                        '.owl-prev', '.owl-next', '.prev', '.next',
                        '[class*="chevron"]', '[class*="angle"]', '[class*="arrow"]', '[class*="caret"]',
                        '[data-slide]', '[data-bs-slide]',
                        'i.fa-chevron-left', 'i.fa-chevron-right', 'i.fa-angle-left', 'i.fa-angle-right',
                        'span.fa-chevron-left', 'span.fa-chevron-right', 'span.fa-angle-left', 'span.fa-angle-right'
                    ];
                    
                    unwantedSelectors.forEach(function(selector) {
                        try {
                            const elements = container.querySelectorAll(selector);
                            elements.forEach(function(el) {
                                el.remove();
                            });
                        } catch (e) {
                        }
                    });
                    
                    Array.from(container.children).forEach(function(child) {
                        if (!child.classList.contains('nav-tabs') && 
                            !child.classList.contains('tab-content')) {
                            child.remove();
                        }
                    });
                    
                    const allIcons = container.querySelectorAll('i[class*="fa-"], span[class*="fa-"]');
                    allIcons.forEach(function(icon) {
                        const parent = icon.parentElement;
                        if (!parent || !parent.classList.contains('nav-link')) {
                            icon.remove();
                        }
                    });
                });
                
                applyThemeStyles();
            }, 100);
            
            initThemeWatcher();
        }, 100);
    }
});
