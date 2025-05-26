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
        
        $('[data-bs-toggle="tooltip"]').each(function() {
            if (window.bootstrap && window.bootstrap.Tooltip) {
                new bootstrap.Tooltip(this);
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
            const animatedId = $container.data('animated-id');
            const $display = $container.find(`#${animatedId}-display`);
            const $tabs = $container.find('.nav-link');
            
            let currentContent = '';
            let isAnimating = false;
            
            if ($tabs.length > 0) {
                const firstTab = $tabs.first();
                const firstLang = firstTab.text().trim();
                currentContent = $display.text();
            }
            
            $tabs.on('click', function(e) {
                e.preventDefault();
                
                if (isAnimating) return;
                
                const $clickedTab = $(this);
                const targetLang = $clickedTab.text().trim();
                
                $tabs.removeClass('active');
                $clickedTab.addClass('active');
                
                animateCodeChange($display, currentContent, targetLang).then(() => {
                    currentContent = $display.text();
                });
            });
        });
    }

    async function animateCodeChange($display, oldContent, newLang) {
        isAnimating = true;
        
        try {
            $display.addClass('code-transitioning');
            
            await new Promise(resolve => setTimeout(resolve, 200));
            
            const newContent = generateCodeForLanguage(newLang);
            $display.text(newContent);
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            $display.removeClass('code-transitioning');
            
        } finally {
            isAnimating = false;
        }
    }

    function generateCodeForLanguage(lang) {
        const codeTemplates = {
            'Javascript': 'const hello = \'world\';\nconsole.log(hello);',
            'Python': 'hello = "world"\nprint(hello)',
            'Java': 'public class Test {\n    public static void main(String[] args) {\n        System.out.println("Hello World");\n    }\n}',
            'C++': '#include <iostream>\nint main() {\n    std::cout << "Hello World" << std::endl;\n    return 0;\n}'
        };
        
        return codeTemplates[lang] || 'console.log("Hello World");';
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    ExtendedMarkdown.prepareFormattingTools = async function () {
        const [formatting, controls, translator] = await app.require(['composer/formatting', 'composer/controls', 'translator']);
        
        if (formatting && controls) {
            translator.getTranslations(window.config.userLang || window.config.defaultLang, 'extendedmarkdown', function (strings) {
                var composerTextarea;
                var colorPickerButton = document.querySelector('.btn[data-format="color"]');
                
                if (colorPickerButton) {
                    var hiddenPicker = document.createElement("input");
                    hiddenPicker.style.visibility = 'hidden';
                    hiddenPicker.style.width = 0;
                    hiddenPicker.style.padding = 0;
                    hiddenPicker.style.margin = 0;
                    hiddenPicker.style.height = 0;
                    hiddenPicker.style.border = 0;
                    hiddenPicker.type = 'color';
                    hiddenPicker.id = 'extended-markdown-colorpicker';
                    colorPickerButton.parentNode.insertBefore(hiddenPicker, colorPickerButton.nextSibling);
                    
                    hiddenPicker.addEventListener('input', function() {
                        var selectionStart = composerTextarea.selectionStart;
                        var selectionEnd = composerTextarea.selectionEnd;
                        var currentValue = composerTextarea.value;
                        var colorRegex = /%\(#[0-9a-fA-F]{6}\)/;
                        var beforeCursor = currentValue.slice(0, selectionStart);
                        var afterCursor = currentValue.slice(selectionEnd);
                        
                        var match = beforeCursor.match(/.*%\(#[0-9a-fA-F]{0,6}$/);
                        if (match) {
                            var startPos = match.index + match[0].indexOf('%(#');
                            composerTextarea.value = currentValue.slice(0, startPos + 2) + this.value + ')' + currentValue.slice(selectionStart);
                            composerTextarea.selectionStart = composerTextarea.selectionEnd = startPos + 2 + this.value.length + 1;
                        }
                        
                        $(composerTextarea).trigger('input');
                    });
                }

                formatting.addButtonDispatch('color', function (textarea, selectionStart, selectionEnd) {
                    composerTextarea = textarea;
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '%(#ff0000)[彩色文字]');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionStart + 9);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '%(#ff0000)[', ']');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionStart + 9);
                    }
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
                        controls.insertIntoTextarea(textarea, '#anchor-id(标题文字)');
                        controls.updateTextareaSelection(textarea, selectionStart + 1, selectionStart + 10);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '#anchor-id(', ')');
                    }
                });

                formatting.addButtonDispatch('groupedcode', function (textarea, selectionStart, selectionEnd) {
                    const template = `===group
\`\`\`javascript
const hello = 'world';
console.log(hello);
\`\`\`

\`\`\`python
hello = 'world'
print(hello)
\`\`\`
===`;
                    controls.insertIntoTextarea(textarea, template);
                });

                formatting.addButtonDispatch('animatedcode', function (textarea, selectionStart, selectionEnd) {
                    const template = `===animated-group
\`\`\`javascript
const hello = 'world';
\`\`\`

\`\`\`javascript
const hello = 'world';
console.log(hello);
\`\`\`
===`;
                    controls.insertIntoTextarea(textarea, template);
                });

                formatting.addButtonDispatch('bubbleinfo', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '°悬停文字°(提示内容)');
                        controls.updateTextareaSelection(textarea, selectionStart + 1, selectionStart + 5);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '°', '°(提示内容)');
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
