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
            const formattingOptions = [
                {
                    name: "textheader",
                    className: "fa fa-header",
                    title: "[[extendedmarkdown:composer.formatting.textheader]]"
                },
                {
                    name: "groupedcode",
                    className: "fa fa-code",
                    title: "[[extendedmarkdown:composer.formatting.groupedcode]]"
                },
                {
                    name: "bubbleinfo",
                    className: "fa fa-info-circle",
                    title: "[[extendedmarkdown:composer.formatting.bubbleinfo]]"
                },
                {
                    name: "left",
                    className: "fa fa-align-left",
                    title: "[[extendedmarkdown:composer.formatting.left]]"
                },
                {
                    name: "center",
                    className: "fa fa-align-center",
                    title: "[[extendedmarkdown:composer.formatting.center]]"
                },
                {
                    name: "right",
                    className: "fa fa-align-right",
                    title: "[[extendedmarkdown:composer.formatting.right]]"
                },
                {
                    name: "justify",
                    className: "fa fa-align-justify",
                    title: "[[extendedmarkdown:composer.formatting.justify]]"
                },
                {
                    name: "spoiler",
                    className: "fa fa-eye-slash",
                    title: "[[extendedmarkdown:composer.formatting.spoiler]]"
                },
                {
                    name: "noteinfo",
                    className: "fa fa-info",
                    title: "[[extendedmarkdown:composer.formatting.noteinfo]]"
                },
                {
                    name: "notewarning",
                    className: "fa fa-exclamation-triangle",
                    title: "[[extendedmarkdown:composer.formatting.notewarning]]"
                },
                {
                    name: "noteimportant",
                    className: "fa fa-exclamation-circle",
                    title: "[[extendedmarkdown:composer.formatting.noteimportant]]"
                }
            ];

            formattingOptions.forEach(function(option) {
                formatting.addButtonDispatch(option.name, function (textarea, selectionStart, selectionEnd) {
                    switch(option.name) {
                        case 'textheader':
                            controls.insertIntoTextarea(textarea, '#anchor(' + controls.getSelectedText(textarea) + ')');
                            break;
                        case 'groupedcode':
                            controls.insertIntoTextarea(textarea, '\n===group\n```language\n' + controls.getSelectedText(textarea) + '\n```\n```language2\ncode here\n```\n===\n');
                            break;
                        case 'bubbleinfo':
                            controls.insertIntoTextarea(textarea, '°' + controls.getSelectedText(textarea) + '°(tooltip text)');
                            break;
                        case 'left':
                            controls.insertIntoTextarea(textarea, '|-' + controls.getSelectedText(textarea));
                            break;
                        case 'center':
                            controls.insertIntoTextarea(textarea, '|-' + controls.getSelectedText(textarea) + '-|');
                            break;
                        case 'right':
                            controls.insertIntoTextarea(textarea, controls.getSelectedText(textarea) + '-|');
                            break;
                        case 'justify':
                            controls.insertIntoTextarea(textarea, '|=' + controls.getSelectedText(textarea) + '=|');
                            break;
                        case 'spoiler':
                            controls.insertIntoTextarea(textarea, '||' + controls.getSelectedText(textarea) + '||');
                            break;
                        case 'noteinfo':
                            controls.insertIntoTextarea(textarea, '\n!!! info [Title]: ' + controls.getSelectedText(textarea) + '\n');
                            break;
                        case 'notewarning':
                            controls.insertIntoTextarea(textarea, '\n!!! warning [Title]: ' + controls.getSelectedText(textarea) + '\n');
                            break;
                        case 'noteimportant':
                            controls.insertIntoTextarea(textarea, '\n!!! important [Title]: ' + controls.getSelectedText(textarea) + '\n');
                            break;
                    }
                });
            });
        }
    };

    function pageReady() {
        setTimeout(function() {
            document.querySelectorAll('.spoiler').forEach(function(spoiler) {
                spoiler.addEventListener('click', function() {
                    this.classList.toggle('spoiler-revealed');
                });
            });

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
