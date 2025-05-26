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

    function initializeTooltips() {
        $('.extended-markdown-tooltip').off('click.tooltip').on('click.tooltip', function(e) {
            e.preventDefault();
            const tooltip = $(this).attr('data-tooltip');
            if (tooltip) {
                alert(tooltip);
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
                const $counter = $container.find('.current-step');
                const $tabs = $container.find('.nav-link');
                
                if ($tabs.length > 0) {
                    let currentIndex = 0;
                    const totalSteps = $tabs.length;
                    
                    function updateStepNavigation() {
                        $tabs.removeClass('active').attr('aria-selected', 'false');
                        $container.find('.tab-pane').removeClass('show active');
                        
                        $tabs.eq(currentIndex).addClass('active').attr('aria-selected', 'true');
                        const targetId = $tabs.eq(currentIndex).attr('data-bs-target');
                        $(targetId).addClass('show active');
                        
                        $prevBtn.prop('disabled', currentIndex === 0);
                        $nextBtn.prop('disabled', currentIndex === totalSteps - 1);
                        
                        $counter.text(currentIndex + 1);
                    }
                    
                    $prevBtn.off('click.step-nav').on('click.step-nav', function() {
                        if (currentIndex > 0) {
                            currentIndex--;
                            updateStepNavigation();
                        }
                    });
                    
                    $nextBtn.off('click.step-nav').on('click.step-nav', function() {
                        if (currentIndex < totalSteps - 1) {
                            currentIndex++;
                            updateStepNavigation();
                        }
                    });
                    
                    $tabs.off('click.step-update').on('click.step-update', function() {
                        currentIndex = $tabs.index(this);
                        updateStepNavigation();
                    });
                    
                    updateStepNavigation();
                }
            }
        });
    }

    function initializeAnimatedCodeGroups() {
        $('.animated-code-group-container').each(function() {
            const $container = $(this);
            const $display = $container.find('.animated-code-display code');
            const $tabs = $container.find('.nav-link');
            
            if (!$container.data('animated-initialized') && $tabs.length > 0) {
                $container.data('animated-initialized', true);
                
                const codeBlocks = [];
                $tabs.each(function() {
                    const codeContent = $(this).data('code-content');
                    if (codeContent) {
                        codeBlocks.push(codeContent);
                    }
                });
                
                if (codeBlocks.length > 0) {
                    $display.text(codeBlocks[0]);
                }
                
                $tabs.on('click', function(e) {
                    e.preventDefault();
                    
                    const clickedIndex = $tabs.index(this);
                    if (clickedIndex >= 0 && clickedIndex < codeBlocks.length) {
                        $tabs.removeClass('active');
                        $(this).addClass('active');
                        
                        $display.fadeOut(150, function() {
                            $(this).text(codeBlocks[clickedIndex]).fadeIn(150);
                        });
                    }
                });
            }
        });
    }

    ExtendedMarkdown.prepareFormattingTools = async function () {
        const [formatting, controls, translator] = await app.require(['composer/formatting', 'composer/controls', 'translator']);
        
        if (formatting && controls) {
            translator.getTranslations(window.config.userLang || window.config.defaultLang, 'extendedmarkdown', function (strings) {
                let composerTextarea;
                let hiddenColorPicker;

                function createColorPicker() {
                    if (!hiddenColorPicker) {
                        hiddenColorPicker = document.createElement("input");
                        hiddenColorPicker.type = 'color';
                        hiddenColorPicker.style.position = 'absolute';
                        hiddenColorPicker.style.left = '-9999px';
                        hiddenColorPicker.style.visibility = 'hidden';
                        hiddenColorPicker.style.width = '0';
                        hiddenColorPicker.style.height = '0';
                        hiddenColorPicker.id = 'extended-markdown-color-picker';
                        document.body.appendChild(hiddenColorPicker);

                        hiddenColorPicker.addEventListener('input', function() {
                            if (composerTextarea) {
                                updateColorInTextarea(this.value);
                            }
                        });
                    }
                }

                function updateColorInTextarea(newColor) {
                    const value = composerTextarea.value;
                    const start = composerTextarea.selectionStart;
                    const end = composerTextarea.selectionEnd;
                    
                    const beforeCursor = value.substring(0, start);
                    const afterCursor = value.substring(end);
                    
                    const colorMatch = beforeCursor.match(/%\(#[0-9a-fA-F]{6}\)$/);
                    if (colorMatch) {
                        const matchStart = beforeCursor.lastIndexOf(colorMatch[0]);
                        const newValue = value.substring(0, matchStart) + `%(${newColor})` + value.substring(start);
                        
                        composerTextarea.value = newValue;
                        composerTextarea.selectionStart = matchStart + 2;
                        composerTextarea.selectionEnd = matchStart + 9;
                        
                        $(composerTextarea).trigger('input');
                    }
                }

                formatting.addButtonDispatch('color', function (textarea, selectionStart, selectionEnd) {
                    composerTextarea = textarea;
                    createColorPicker();
                    
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '%(#000000)[' + (strings.color_text || '彩色文本') + ']');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionStart + 9);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '%(#000000)[', ']');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionStart + 9);
                    }
                    
                    setTimeout(() => {
                        if (hiddenColorPicker) {
                            hiddenColorPicker.click();
                        }
                    }, 200);
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
                        controls.insertIntoTextarea(textarea, '#' + (strings.textheader_anchor || 'anchor-id') + '(' + (strings.textheader_title || '标题文字') + ')');
                        controls.updateTextareaSelection(textarea, selectionStart + 1, selectionStart + 1 + (strings.textheader_anchor || 'anchor-id').length);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '#' + (strings.textheader_anchor || 'anchor-id') + '(', ')');
                    }
                });

                formatting.addButtonDispatch('groupedcode', function (textarea, selectionStart, selectionEnd) {
                    const template = `===group
\`\`\`${strings.groupedcode_firstlang || 'javascript'}
const hello = 'world';
console.log(hello);
\`\`\`

\`\`\`${strings.groupedcode_secondlang || 'python'}
hello = 'world'
print(hello)
\`\`\`
===`;
                    controls.insertIntoTextarea(textarea, template);
                });

                formatting.addButtonDispatch('bubbleinfo', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '°' + (strings.bubbleinfo_text || '悬停文字') + '°(提示内容)');
                        controls.updateTextareaSelection(textarea, selectionStart + 1, selectionStart + 1 + (strings.bubbleinfo_text || '悬停文字').length);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '°', '°(提示内容)');
                    }
                });

                formatting.addButtonDispatch('collapsible', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '[spoiler=点击展开]' + (strings.spoiler || '隐藏内容') + '[/spoiler]');
                        controls.updateTextareaSelection(textarea, selectionStart + 15, selectionStart + 15 + (strings.spoiler || '隐藏内容').length);
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

    function pageReady() {
        setupExtendedMarkdownTheme();
        initializeTabComponents();
        initializeCollapse();
        initializeTooltips();
        initStepsNavigation();
        initializeAnimatedCodeGroups();
    }

    let initTimeout;
    const observer = new MutationObserver(function(mutations) {
        let shouldInit = false;
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) {
                        if (node.matches && (
                            node.matches('.code-group-container, .extended-tabs-container, .steps-container, .collapsible-wrapper, .animated-code-group-container') ||
                            node.querySelector('.code-group-container, .extended-tabs-container, .steps-container, .collapsible-wrapper, .animated-code-group-container')
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
        }, 150);
    });
    
    pageReady();
});
