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

    function applyExtendedMarkdownTheme(isDark) {
        const themeClass = 'extended-dark-theme';
        
        document.querySelectorAll('.markdown-alert, .code-group-container, .extended-tabs-container, .text-header, .extended-markdown-tooltip, .spoiler, .steps-container, .collapsible-wrapper').forEach(element => {
            if (isDark) {
                element.classList.add(themeClass);
            } else {
                element.classList.remove(themeClass);
            }
        });
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
                const $target = $(targetId);
                
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

    function initializeStepsNavigation() {
        $('.steps-container').each(function() {
            const $container = $(this);
            
            if (!$container.data('steps-initialized')) {
                $container.data('steps-initialized', true);
                
                const $tabs = $container.find('.nav-link');
                const $prevBtn = $container.find('.step-nav-btn.step-prev');
                const $nextBtn = $container.find('.step-nav-btn.step-next');
                const $currentStep = $container.find('.current-step');
                const $totalSteps = $container.find('.total-steps');
                const totalSteps = $tabs.length;
                let currentIndex = 0;
                
                if ($totalSteps.length) {
                    $totalSteps.text(totalSteps);
                }
                
                function updateButtons() {
                    $prevBtn.prop('disabled', currentIndex === 0);
                    $nextBtn.prop('disabled', currentIndex === totalSteps - 1);
                    if ($currentStep.length) {
                        $currentStep.text(currentIndex + 1);
                    }
                }
                
                $prevBtn.off('click.steps-nav').on('click.steps-nav', function(e) {
                    e.preventDefault();
                    if (currentIndex > 0) {
                        currentIndex--;
                        $tabs.eq(currentIndex).trigger('click');
                        updateButtons();
                    }
                });
                
                $nextBtn.off('click.steps-nav').on('click.steps-nav', function(e) {
                    e.preventDefault();
                    if (currentIndex < totalSteps - 1) {
                        currentIndex++;
                        $tabs.eq(currentIndex).trigger('click');
                        updateButtons();
                    }
                });
                
                $tabs.off('click.steps-tab').on('click.steps-tab', function(e) {
                    currentIndex = $tabs.index(this);
                    updateButtons();
                });
                
                updateButtons();
            }
        });
    }

    ExtendedMarkdown.prepareFormattingTools = async function () {
        try {
            const [formatting, controls] = await app.require(['composer/formatting', 'composer/controls']);
            
            if (formatting && controls) {
                let composerTextarea;
                let colorPickerButton = document.querySelector('.btn[data-format="color"]');
                
                if (colorPickerButton && !document.getElementById('nodebb-plugin-extended-markdown-colorpicker')) {
                    let hiddenPicker = document.createElement("input");
                    hiddenPicker.style.visibility = 'hidden';
                    hiddenPicker.style.width = '0';
                    hiddenPicker.style.padding = '0';
                    hiddenPicker.style.margin = '0';
                    hiddenPicker.style.height = '0';
                    hiddenPicker.style.border = '0';
                    hiddenPicker.type = 'color';
                    hiddenPicker.id = 'nodebb-plugin-extended-markdown-colorpicker';
                    colorPickerButton.parentNode.insertBefore(hiddenPicker, colorPickerButton.nextSibling);
                    
                    hiddenPicker.addEventListener('input', function() {
                        if (composerTextarea) {
                            let selectionStart = composerTextarea.selectionStart;
                            let selectionEnd = composerTextarea.selectionEnd;
                            composerTextarea.value = composerTextarea.value.slice(0, selectionStart) + this.value + composerTextarea.value.slice(selectionEnd);
                            $(composerTextarea).trigger('input').trigger('propertychange');
                            composerTextarea.selectionStart = selectionStart;
                            composerTextarea.selectionEnd = selectionStart + this.value.length;
                        }
                    });
                }

                formatting.addButtonDispatch('color', function (textarea, selectionStart, selectionEnd) {
                    composerTextarea = textarea;
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '%(#000000)[彩色文本]');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionStart + 9);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '%(#000000)[', ']');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionStart + 9);
                    }
                    
                    let hiddenPicker = document.getElementById('nodebb-plugin-extended-markdown-colorpicker');
                    if (hiddenPicker) {
                        hiddenPicker.click();
                    }
                });

                formatting.addButtonDispatch('left', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '|-左对齐文字');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionStart + 7);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '|-', '');
                    }
                });

                formatting.addButtonDispatch('center', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '|-居中文字-|');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionStart + 6);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '|-', '-|');
                    }
                });

                formatting.addButtonDispatch('right', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '右对齐文字-|');
                        controls.updateTextareaSelection(textarea, selectionStart, selectionStart + 5);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '', '-|');
                    }
                });

                formatting.addButtonDispatch('justify', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '|=两端对齐文字=|');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionStart + 8);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '|=', '=|');
                    }
                });

                formatting.addButtonDispatch('textheader', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '#anchor(标题)');
                        controls.updateTextareaSelection(textarea, selectionStart + 1, selectionStart + 7);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '#anchor(', ')');
                    }
                });

                formatting.addButtonDispatch('groupedcode', function (textarea, selectionStart, selectionEnd) {
                    const template = '===group\n```javascript\nconst hello = "world";\n```\n```python\nhello = "world"\n```\n===';
                    controls.insertIntoTextarea(textarea, template);
                });

                formatting.addButtonDispatch('bubbleinfo', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '°信息文本°(提示文本)');
                        controls.updateTextareaSelection(textarea, selectionStart + 1, selectionStart + 5);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '°', '°(提示文本)');
                    }
                });

                formatting.addButtonDispatch('collapsible', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '[spoiler=点击展开]隐藏内容[/spoiler]');
                        controls.updateTextareaSelection(textarea, selectionStart + 15, selectionStart + 19);
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

                formatting.addButtonDispatch('tabs', function (textarea, selectionStart, selectionEnd) {
                    controls.insertIntoTextarea(textarea, '\n[tabs]\n[tab=标签1]\n内容1\n[tab=标签2]\n内容2\n[/tabs]\n');
                });

                formatting.addButtonDispatch('steps', function (textarea, selectionStart, selectionEnd) {
                    controls.insertIntoTextarea(textarea, '\n[steps]\n[step]\n第一步描述\n[step]\n第二步描述\n[/steps]\n');
                });

                formatting.addButtonDispatch('ruby', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '[ruby=拼音]汉字[/ruby]');
                        controls.updateTextareaSelection(textarea, selectionStart + 7, selectionStart + 9);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '[ruby=拼音]', '[/ruby]');
                    }
                });

                formatting.addButtonDispatch('superscript', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, 'E=mc^2^');
                        controls.updateTextareaSelection(textarea, selectionStart + 5, selectionStart + 6);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '^', '^');
                    }
                });

                formatting.addButtonDispatch('subscript', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, 'H~2~O');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionStart + 3);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '~', '~');
                    }
                });
            }
        } catch (error) {
            console.warn('Extended Markdown: Could not load formatting tools', error);
        }
    };

    async function pageReady() {
        setupExtendedMarkdownTheme();
        initializeTabComponents();
        initializeCollapse();
        
        setTimeout(() => {
            initializeStepsNavigation();
        }, 500);
        
        require(['bootstrap'], function (bootstrap) {
            document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(function (element) {
                new bootstrap.Tooltip(element);
            });
        });
    }

    $(document).on('action:posts.loaded action:topic.loaded', function() {
        setTimeout(() => {
            initializeStepsNavigation();
            initializeTabComponents();
            initializeCollapse();
        }, 100);
    });
});
