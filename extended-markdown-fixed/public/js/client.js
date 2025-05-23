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
        const containers = document.querySelectorAll('.code-group-container');
        
        containers.forEach(container => {
            container.classList.remove('theme-light', 'theme-dark');
            container.classList.add(`theme-${theme}`);
        });
    }

    ExtendedMarkdown.prepareFormattingTools = async function () {
        const [formatting, controls, translator] = await app.require(['composer/formatting', 'composer/controls', 'translator']);
        if (formatting && controls) {
            translator.getTranslations(window.config.userLang || window.config.defaultLang, 'extendedmarkdown', function (strings) {
                var composerTextarea;
                var colorPickerButton = document.querySelector('.btn[data-format="color"]');
                var hiddenPicker = document.createElement("input");
                hiddenPicker.style.visibility = 'hidden';
                hiddenPicker.style.width = 0;
                hiddenPicker.style.padding = 0;
                hiddenPicker.style.margin = 0;
                hiddenPicker.style.height = 0;
                hiddenPicker.style.border = 0;
                hiddenPicker.type = 'color';
                hiddenPicker.id = 'nodebb-plugin-extended-markdown-colorpicker';
                colorPickerButton.parentNode.insertBefore(hiddenPicker, colorPickerButton.nextSibling);
                hiddenPicker.addEventListener('input', function() {
                    var selectionStart = composerTextarea.selectionStart;
                    var selectionEnd = composerTextarea.selectionEnd;
                    composerTextarea.value = composerTextarea.value.slice(0, selectionStart) + this.value + composerTextarea.value.slice(selectionEnd);
                    $(composerTextarea).trigger('propertychange');
                    composerTextarea.selectionStart = selectionStart;
                    composerTextarea.selectionEnd = selectionEnd;
                });

                formatting.addButtonDispatch('color', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '%(#000000)[' + strings.color_text + ']');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionStart + 9);
                    } else {
                        var wrapDelta = controls.wrapSelectionInTextareaWith(textarea, '%(#000000)[', ']');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionStart + 9);
                    }
                    composerTextarea = textarea;
                    hiddenPicker.click();
                });

                formatting.addButtonDispatch('left', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '|-' + strings.align_left + '-|');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionStart + 2 + strings.align_left.length);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '|-', '-|');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionEnd + 2);
                    }
                });

                formatting.addButtonDispatch('center', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '|-' + strings.align_center + '-|');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionStart + 2 + strings.align_center.length);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '|-', '-|');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionEnd + 2);
                    }
                });

                formatting.addButtonDispatch('right', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '|-' + strings.align_right + '-|');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionStart + 2 + strings.align_right.length);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '|-', '-|');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionEnd + 2);
                    }
                });

                formatting.addButtonDispatch('justify', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '|-' + strings.align_justify + '-|');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionStart + 2 + strings.align_justify.length);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '|-', '-|');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionEnd + 2);
                    }
                });

                formatting.addButtonDispatch('textheader', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '#anchor(' + strings.textheader_title + ')');
                        controls.updateTextareaSelection(textarea, selectionStart + 1, selectionStart + 7);
                    } else {
                        var selectedText = textarea.value.substring(selectionStart, selectionEnd);
                        var anchorId = selectedText.toLowerCase().replace(/[^a-z0-9]/g, '');
                        if (!anchorId) {
                            anchorId = 'anchor';
                        }
                        controls.wrapSelectionInTextareaWith(textarea, '#' + anchorId + '(', ')');
                        controls.updateTextareaSelection(textarea, selectionStart + 1, selectionStart + 1 + anchorId.length);
                    }
                });

                formatting.addButtonDispatch('groupedcode', function (textarea, selectionStart, selectionEnd) {
                    controls.insertIntoTextarea(textarea, '===group\n```' + strings.groupedcode_firstlang + '\n\n```\n```' + strings.groupedcode_secondlang + '\n\n```\n===');
                    controls.updateTextareaSelection(textarea, selectionStart + 16 + strings.groupedcode_firstlang.length, selectionStart + 16 + strings.groupedcode_firstlang.length);
                });

                formatting.addButtonDispatch('bubbleinfo', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '°' + strings.bubbleinfo_text + '°(tooltip)');
                        controls.updateTextareaSelection(textarea, selectionStart + 1, selectionStart + 1 + strings.bubbleinfo_text.length);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '°', '°(tooltip)');
                        controls.updateTextareaSelection(textarea, selectionEnd + 2, selectionEnd + 9);
                    }
                });

                formatting.addButtonDispatch('spoiler', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '||spoiler||');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionStart + 9);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '||', '||');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionEnd + 2);
                    }
                });

                formatting.addButtonDispatch('noteinfo', function (textarea, selectionStart, selectionEnd) {
                    controls.insertIntoTextarea(textarea, '!!! info [' + strings.note_title + ']: ' + strings.note_content);
                    controls.updateTextareaSelection(textarea, selectionStart + 11, selectionStart + 11 + strings.note_title.length);
                });

                formatting.addButtonDispatch('notewarning', function (textarea, selectionStart, selectionEnd) {
                    controls.insertIntoTextarea(textarea, '!!! warning [' + strings.note_title + ']: ' + strings.note_content);
                    controls.updateTextareaSelection(textarea, selectionStart + 14, selectionStart + 14 + strings.note_title.length);
                });

                formatting.addButtonDispatch('noteimportant', function (textarea, selectionStart, selectionEnd) {
                    controls.insertIntoTextarea(textarea, '!!! important [' + strings.note_title + ']: ' + strings.note_content);
                    controls.updateTextareaSelection(textarea, selectionStart + 16, selectionStart + 16 + strings.note_title.length);
                });
            });
        }
    };

    function pageReady() {
        applyThemeStyles();
        
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && 
                    (mutation.attributeName === 'class' || 
                     mutation.attributeName === 'data-theme' || 
                     mutation.attributeName === 'data-bs-theme')) {
                    applyThemeStyles();
                }
            });
        });
        
        observer.observe(document.body, { attributes: true });
        observer.observe(document.documentElement, { attributes: true });

        document.querySelectorAll('button.extended-markdown-spoiler').forEach(function (element) {
            element.onclick = function() {
                const isExpanded = element.getAttribute("aria-expanded") === "true";
                element.children[0].className = isExpanded ? "fa fa-eye-slash" : "fa fa-eye";
            };
        });

        document.querySelectorAll('.code-group-container .nav-tabs button[data-bs-toggle="tab"]').forEach(function(tabButton) {
            tabButton.addEventListener('shown.bs.tab', function (event) {
                const targetPane = document.querySelector(event.target.getAttribute('data-bs-target'));
                if (targetPane) {
                    const codeBlock = targetPane.querySelector('code');
                    if (codeBlock && window.hljs) {
                        window.hljs.highlightElement(codeBlock);
                    }
                }
            });
        });

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
    }
});
