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
        
        document.querySelectorAll('.code-group-container').forEach(element => {
            if (!element.classList.contains(`theme-${theme}`)) {
                element.classList.remove('theme-light', 'theme-dark');
                element.classList.add(`theme-${theme}`);
            }
        });
        
        document.querySelectorAll('.text-header, .extended-markdown-tooltip, .spoiler').forEach(element => {
            if (!element.classList.contains(`theme-${theme}`)) {
                element.classList.remove('theme-light', 'theme-dark');
                element.classList.add(`theme-${theme}`);
            }
        });
    }

    ExtendedMarkdown.prepareFormattingTools = async function () {
        const [formatting, controls] = await app.require(['composer/formatting', 'composer/controls']);
        
        if (formatting && controls) {
            formatting.addButtonDispatch('textheader', function (textarea, selectionStart, selectionEnd) {
                controls.wrapSelectionInTextareaWith(textarea, '[h=anchor]', '[/h]');
            });
            
            formatting.addButtonDispatch('groupedcode', function (textarea, selectionStart, selectionEnd) {
                controls.insertIntoTextarea(textarea, '\n[code=java,kotlin]\njava code\n\n---\n\nkotlin code\n[/code]\n');
            });
            
            formatting.addButtonDispatch('bubbleinfo', function (textarea, selectionStart, selectionEnd) {
                controls.wrapSelectionInTextareaWith(textarea, '°', '°(tooltip text)');
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
            
            applyThemeStyles();
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
