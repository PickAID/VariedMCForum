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
        
        document.querySelectorAll('.markdown-alert, .code-group-container, .extended-tabs-container, .text-header, .extended-markdown-tooltip, .spoiler, .steps-container, .collapsible-wrapper, .bubble-info, .animated-code-group-container').forEach(element => {
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
        $('.collapsible-wrapper').each(function() {
            const $wrapper = $(this);
            const $button = $wrapper.find('.extended-markdown-collapsible');
            
            if ($button.length && !$button.data('collapse-initialized')) {
                $button.data('collapse-initialized', true);
                
                const targetId = $button.attr('data-bs-target');
                const $target = $('#' + targetId);
                
                if ($target.length) {
                    const $icon = $button.find('.collapse-icon');
                    
                    $target.hide();
                    
                    $button.on('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        if ($target.is(':visible')) {
                            $target.hide();
                            $button.attr('aria-expanded', 'false');
                            $icon.css('transform', 'rotate(0deg)');
                        } else {
                            $target.show();
                            $button.attr('aria-expanded', 'true');
                            $icon.css('transform', 'rotate(90deg)');
                        }
                    });
                }
            }
        });
    }

    function initializeAnimatedCodeGroups() {
        $('.animated-code-group-container').each(function() {
            const $container = $(this);
            const animatedId = $container.data('animated-id');
            const $display = $container.find(`#${animatedId}-display`);
            const $tabs = $container.find('.nav-link');
            
            if (!$container.data('animated-initialized')) {
                $container.data('animated-initialized', true);
                
                if ($tabs.length > 0 && $display.length > 0) {
                    $tabs.first().addClass('active');
                    
                    const firstCode = $tabs.first().data('code');
                    if (firstCode) {
                        $display.html(`<pre><code>${firstCode}</code></pre>`);
                    }
                    
                    $tabs.off('click.animated-code').on('click.animated-code', function(e) {
                        e.preventDefault();
                        
                        const code = $(this).data('code');
                        if (code && $display.length > 0) {
                            $tabs.removeClass('active');
                            $(this).addClass('active');
                            
                            $display.fadeOut(200, function() {
                                $display.html(`<pre><code>${code}</code></pre>`);
                                $display.fadeIn(200);
                            });
                        }
                    });
                }
            }
        });
    }

    ExtendedMarkdown.prepareFormattingTools = async function () {
        const [formatting, controls, translator] = await app.require(['composer/formatting', 'composer/controls', 'translator']);
        
        if (formatting && controls) {
            translator.getTranslations(window.config.userLang || window.config.defaultLang, 'extendedmarkdown', function (strings) {
                var composerTextarea;
                var colorPickerButton = document.querySelector('.btn[data-format="color"]');
                
                if (colorPickerButton && !document.getElementById('nodebb-plugin-extended-markdown-colorpicker')) {
                    var hiddenPicker = document.createElement("input");
                    hiddenPicker.style.position = 'absolute';
                    hiddenPicker.style.left = '-9999px';
                    hiddenPicker.style.top = '-9999px';
                    hiddenPicker.style.width = '1px';
                    hiddenPicker.style.height = '1px';
                    hiddenPicker.style.opacity = '0';
                    hiddenPicker.type = 'color';
                    hiddenPicker.value = '#000000';
                    hiddenPicker.id = 'nodebb-plugin-extended-markdown-colorpicker';
                    document.body.appendChild(hiddenPicker);
                    
                    hiddenPicker.addEventListener('change', function() {
                        if (composerTextarea && this.value) {
                            var value = composerTextarea.value;
                            var selectionStart = composerTextarea.selectionStart;
                            var selectionEnd = composerTextarea.selectionEnd;
                            
                            var beforeCursor = value.substring(0, selectionStart);
                            var colorRegex = /%\(#[0-9a-fA-F]{6}\)$/;
                            var match = beforeCursor.match(colorRegex);
                            
                            if (match) {
                                var matchStart = beforeCursor.lastIndexOf(match[0]);
                                var newValue = value.substring(0, matchStart) + `%(${this.value})` + value.substring(selectionStart);
                                
                                composerTextarea.value = newValue;
                                composerTextarea.selectionStart = matchStart + 2;
                                composerTextarea.selectionEnd = matchStart + 9;
                                
                                $(composerTextarea).trigger('input').trigger('propertychange');
                            }
                        }
                    });
                }

                formatting.addButtonDispatch('color', function (textarea, selectionStart, selectionEnd) {
                    composerTextarea = textarea;
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '%(#000000)[' + (strings.color_text || '彩色文本') + ']');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionStart + 9);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '%(#000000)[', ']');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionStart + 9);
                    }
                    
                    const hiddenPicker = document.getElementById('nodebb-plugin-extended-markdown-colorpicker');
                    if (hiddenPicker) {
                        setTimeout(() => {
                            hiddenPicker.click();
                        }, 100);
                    }
                });

                formatting.addButtonDispatch('left', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '|-' + (strings.align_left || '左对齐文字'));
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionStart + 2 + (strings.align_left || '左对齐文字').length);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '|-', '');
                    }
                });

                formatting.addButtonDispatch('center', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '|-' + (strings.align_center || '居中文字') + '-|');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionStart + 2 + (strings.align_center || '居中文字').length);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '|-', '-|');
                    }
                });

                formatting.addButtonDispatch('right', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, (strings.align_right || '右对齐文字') + '-|');
                        controls.updateTextareaSelection(textarea, selectionStart, selectionStart + (strings.align_right || '右对齐文字').length);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '', '-|');
                    }
                });

                formatting.addButtonDispatch('justify', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '|=' + (strings.align_justify || '两端对齐文字') + '=|');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionStart + 2 + (strings.align_justify || '两端对齐文字').length);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '|=', '=|');
                    }
                });

                formatting.addButtonDispatch('textheader', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '#' + (strings.textheader_anchor || 'anchor') + '(' + (strings.textheader_title || '标题') + ')');
                        controls.updateTextareaSelection(textarea, selectionStart + 1, selectionStart + 1 + (strings.textheader_anchor || 'anchor').length);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '#' + (strings.textheader_anchor || 'anchor') + '(', ')');
                    }
                });

                formatting.addButtonDispatch('groupedcode', function (textarea, selectionStart, selectionEnd) {
                    const template = '===group\n```' + (strings.groupedcode_firstlang || 'javascript') + '\nconst hello = "world";\n```\n```' + (strings.groupedcode_secondlang || 'python') + '\nhello = "world"\n```\n===';
                    controls.insertIntoTextarea(textarea, template);
                });

                formatting.addButtonDispatch('bubbleinfo', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '°' + (strings.bubbleinfo_text || '信息文本') + '°(' + (strings.bubbleinfo_text || '信息文本') + ')');
                        controls.updateTextareaSelection(textarea, selectionStart + 1, selectionStart + 1 + (strings.bubbleinfo_text || '信息文本').length);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '°', '°(' + (strings.bubbleinfo_text || '信息文本') + ')');
                    }
                });

                formatting.addButtonDispatch('collapsible', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '[spoiler=点击展开]' + (strings.spoiler || '剧透') + '[/spoiler]');
                        controls.updateTextareaSelection(textarea, selectionStart + 15, selectionStart + 15 + (strings.spoiler || '剧透').length);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '[spoiler=点击展开]', '[/spoiler]');
                    }
                });

                formatting.addButtonDispatch('noteinfo', function (textarea, selectionStart, selectionEnd) {
                    controls.insertIntoTextarea(textarea, '!!! info [信息]: 这是一条信息提示');
                });

                formatting.addButtonDispatch('notewarning', function (textarea, selectionStart, selectionEnd) {
                    controls.insertIntoTextarea(textarea, '!!! warning [警告]: 这是一条警告提示');
                });

                formatting.addButtonDispatch('noteimportant', function (textarea, selectionStart, selectionEnd) {
                    controls.insertIntoTextarea(textarea, '!!! important [重要]: 这是一条重要提示');
                });
            });
        }
    };

    async function pageReady() {
        setupExtendedMarkdownTheme();
        initializeTabComponents();
        initializeCollapse();
        initializeAnimatedCodeGroups();
        
        require(['bootstrap'], function (bootstrap) {
            document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(function (element) {
                new bootstrap.Tooltip(element);
            });
        });

        document.querySelectorAll('button.extended-markdown-spoiler').forEach(function (element) {
            element.onclick = function() {
                element.children[0].className = element.attributes.getNamedItem("aria-expanded").value === "true" ? "fa fa-eye-slash" : "fa fa-eye";
            };
        });
    }
});
