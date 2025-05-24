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
        
        document.querySelectorAll('.admonition').forEach(element => {
            element.classList.remove('theme-light', 'theme-dark');
            element.classList.add(`theme-${theme}`);
        });
        
        document.querySelectorAll('.code-group-container').forEach(element => {
            element.classList.remove('theme-light', 'theme-dark');
            element.classList.add(`theme-${theme}`);
            
            const navTabs = element.querySelector('.nav-tabs');
            if (navTabs) {
                navTabs.classList.remove('theme-light', 'theme-dark');
                navTabs.classList.add(`theme-${theme}`);
            }
            
            const tabContent = element.querySelector('.tab-content');
            if (tabContent) {
                tabContent.classList.remove('theme-light', 'theme-dark');
                tabContent.classList.add(`theme-${theme}`);
            }
        });
        
        document.querySelectorAll('.spoiler').forEach(element => {
            element.classList.remove('theme-light', 'theme-dark');
            element.classList.add(`theme-${theme}`);
        });
        
        document.querySelectorAll('.text-header').forEach(element => {
            element.classList.remove('theme-light', 'theme-dark');
            element.classList.add(`theme-${theme}`);
        });
        
        document.querySelectorAll('.extended-markdown-tooltip').forEach(element => {
            element.classList.remove('theme-light', 'theme-dark');
            element.classList.add(`theme-${theme}`);
        });
    }

    function initThemeWatcher() {
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
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1 && node.tagName === 'LINK' && 
                        node.href && node.href.includes('bootstrap')) {
                        setTimeout(applyThemeStyles, 100);
                    }
                });
            });
        });
        
        linkObserver.observe(document.head, { childList: true });
    }

    ExtendedMarkdown.prepareFormattingTools = async function () {
        const [formatting, controls] = await app.require(['composer/formatting', 'composer/controls']);
        
        if (formatting && controls) {
            formatting.addButtonDispatch('textheader', function (textarea, selectionStart, selectionEnd) {
                controls.wrapSelectionInTextareaWith(textarea, '[h=anchor]', '[/h]');
            });
            
            formatting.addButtonDispatch('groupedcode', function (textarea, selectionStart, selectionEnd) {
                controls.insertIntoTextarea(textarea, '\n[code=java,kotlin]\n' + app.translator.translate('[[extendedmarkdown:groupedcode_firstlang]]') + '\n\n---\n\n' + app.translator.translate('[[extendedmarkdown:groupedcode_secondlang]]') + '\n[/code]\n');
            });
            
            formatting.addButtonDispatch('bubbleinfo', function (textarea, selectionStart, selectionEnd) {
                controls.wrapSelectionInTextareaWith(textarea, '°', '°(' + app.translator.translate('[[extendedmarkdown:bubbleinfo_text]]') + ')');
            });
            
            formatting.addButtonDispatch('color', function (textarea, selectionStart, selectionEnd) {
                controls.wrapSelectionInTextareaWith(textarea, '%(#hexColorCode)[', ']');
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
        }
    };

    function pageReady() {
        setTimeout(function() {
            document.querySelectorAll('.spoiler').forEach(function(spoiler) {
                if (!spoiler.hasAttribute('data-spoiler-initialized')) {
                    spoiler.setAttribute('data-spoiler-initialized', 'true');
                    spoiler.addEventListener('click', function() {
                        this.classList.toggle('spoiler-revealed');
                    });
                }
            });

            setTimeout(function() {
                document.querySelectorAll('.code-group-container').forEach(function(container) {
                    if (container.hasAttribute('data-processed')) {
                        return;
                    }
                    container.setAttribute('data-processed', 'true');
                    
                    const unwantedSelectors = [
                        '.fa-chevron-left', '.fa-chevron-right', '.fa-angle-left', '.fa-angle-right',
                        '.fa-arrow-left', '.fa-arrow-right', '.fa-caret-left', '.fa-caret-right',
                        '.carousel-control', '.carousel-control-prev', '.carousel-control-next',
                        '.slick-prev', '.slick-next', '.swiper-button-prev', '.swiper-button-next',
                        '.owl-prev', '.owl-next', '.prev', '.next',
                        '[class*="chevron"]', '[class*="angle"]', '[class*="arrow"]', '[class*="caret"]',
                        '[data-slide]', '[data-bs-slide]'
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
            }, 50);
            
            initThemeWatcher();
        }, 50);
    }
});
