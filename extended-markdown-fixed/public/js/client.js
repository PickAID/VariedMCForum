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
                    
                    $tabs.off('click.step-nav').on('click.step-nav', function(e) {
                        e.preventDefault();
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
            const $display = $container.find('.animated-code-display code');
            const $tabs = $container.find('.nav-link');
            
            if (!$container.data('animated-initialized') && $tabs.length > 0) {
                $container.data('animated-initialized', true);
                
                // 解析所有代码块为 tokens
                const codeBlocks = [];
                $tabs.each(function() {
                    const codeContent = $(this).data('code-content');
                    const lang = $(this).data('lang');
                    if (codeContent) {
                        codeBlocks.push({
                            content: codeContent,
                            lang: lang,
                            tokens: tokenizeCode(codeContent, lang)
                        });
                    }
                });
                
                // 初始化显示第一个代码块
                if (codeBlocks.length > 0) {
                    renderTokens($display, codeBlocks[0].tokens, codeBlocks[0].lang);
                }
                
                // 绑定标签切换事件
                $tabs.on('click', function(e) {
                    e.preventDefault();
                    
                    const clickedIndex = $tabs.index(this);
                    if (clickedIndex >= 0 && clickedIndex < codeBlocks.length) {
                        $tabs.removeClass('active');
                        $(this).addClass('active');
                        
                        // 执行魔法移动动画
                        const currentTokens = getCurrentTokens($display);
                        const newTokens = codeBlocks[clickedIndex].tokens;
                        
                        animateMagicMove($display, currentTokens, newTokens, codeBlocks[clickedIndex].lang);
                    }
                });
            }
        });
    }

    // Token 化代码
    function tokenizeCode(code, lang) {
        const lines = code.split('\n');
        const tokens = [];
        let tokenId = 0;
        
        lines.forEach((line, lineIndex) => {
            if (line.trim()) {
                // 简单的基于正则的 token 化
                const lineTokens = tokenizeLine(line, tokenId, lineIndex);
                tokens.push(...lineTokens);
                tokenId += lineTokens.length;
            } else {
                tokens.push({
                    id: tokenId++,
                    type: 'newline',
                    content: '',
                    line: lineIndex,
                    hash: hashString('')
                });
            }
        });
        
        return tokens;
    }

    function tokenizeLine(line, startId, lineIndex) {
        const tokens = [];
        const patterns = [
            { type: 'keyword', regex: /\b(const|let|var|function|class|if|else|for|while|return|import|export|from|as|async|await)\b/g },
            { type: 'string', regex: /(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g },
            { type: 'number', regex: /\b\d+(\.\d+)?\b/g },
            { type: 'comment', regex: /\/\/.*$|\/\*[\s\S]*?\*\//g },
            { type: 'operator', regex: /[+\-*/%=<>!&|^~?:]/g },
            { type: 'punctuation', regex: /[{}[\]();,\.]/g },
            { type: 'identifier', regex: /\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g }
        ];
        
        let matches = [];
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.regex.exec(line)) !== null) {
                matches.push({
                    type: pattern.type,
                    content: match[0],
                    start: match.index,
                    end: match.index + match[0].length
                });
            }
        });
        
        // 按位置排序
        matches.sort((a, b) => a.start - b.start);
        
        // 填充空白和创建 tokens
        let pos = 0;
        let tokenId = startId;
        
        matches.forEach(match => {
            // 添加之前的空白
            if (pos < match.start) {
                const whitespace = line.slice(pos, match.start);
                if (whitespace.trim() === '') {
                    tokens.push({
                        id: tokenId++,
                        type: 'whitespace',
                        content: whitespace,
                        line: lineIndex,
                        hash: hashString(whitespace)
                    });
                }
            }
            
            // 添加匹配的 token
            tokens.push({
                id: tokenId++,
                type: match.type,
                content: match.content,
                line: lineIndex,
                hash: hashString(match.content + match.type)
            });
            
            pos = match.end;
        });
        
        // 添加行尾剩余内容
        if (pos < line.length) {
            const remaining = line.slice(pos);
            tokens.push({
                id: tokenId++,
                type: 'text',
                content: remaining,
                line: lineIndex,
                hash: hashString(remaining)
            });
        }
        
        return tokens;
    }

    function hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    }

    function renderTokens($display, tokens, lang) {
        const html = tokens.map(token => {
            const className = token.type ? `token ${token.type}` : '';
            return `<span class="${className}" data-token-id="${token.id}" data-hash="${token.hash}">${escapeHtml(token.content)}</span>`;
        }).join('');
        
        $display.html(html);
        $display.attr('class', `language-${lang}`);
    }

    function getCurrentTokens($display) {
        const tokens = [];
        $display.find('span[data-token-id]').each(function() {
            const $span = $(this);
            tokens.push({
                id: parseInt($span.data('token-id')),
                hash: parseInt($span.data('hash')),
                content: $span.text(),
                element: $span[0]
            });
        });
        return tokens;
    }

    async function animateMagicMove($display, oldTokens, newTokens, lang) {
        const operations = computeTokenOperations(oldTokens, newTokens);
        
        // 阶段 1: 标记要删除的 tokens
        operations.removed.forEach(token => {
            if (token.element) {
                $(token.element).addClass('magic-move-leaving');
            }
        });
        
        await sleep(150);
        
        // 阶段 2: 移除已删除的 tokens
        operations.removed.forEach(token => {
            if (token.element) {
                $(token.element).remove();
            }
        });
        
        // 阶段 3: 添加新 tokens 并标记
        operations.added.forEach(addOp => {
            const $newSpan = $(`<span class="token ${addOp.token.type || ''} magic-move-entering" data-token-id="${addOp.token.id}" data-hash="${addOp.token.hash}">${escapeHtml(addOp.token.content)}</span>`);
            
            if (addOp.position === 'start') {
                $display.prepend($newSpan);
            } else if (addOp.position === 'end') {
                $display.append($newSpan);
            } else if (addOp.afterElement) {
                $(addOp.afterElement).after($newSpan);
            } else {
                $display.append($newSpan);
            }
        });
        
        await sleep(50);
        
        // 阶段 4: 清理动画类
        $display.find('.magic-move-entering').removeClass('magic-move-entering');
        
        // 更新语言类
        $display.attr('class', `language-${lang}`);
    }

    function computeTokenOperations(oldTokens, newTokens) {
        const oldMap = new Map(oldTokens.map(t => [t.hash, t]));
        const newMap = new Map(newTokens.map(t => [t.hash, t]));
        
        const removed = oldTokens.filter(t => !newMap.has(t.hash));
        const added = [];
        
        newTokens.forEach((newToken, index) => {
            if (!oldMap.has(newToken.hash)) {
                let afterElement = null;
                let position = 'end';
                
                if (index > 0) {
                    const prevToken = newTokens[index - 1];
                    const prevElement = oldMap.get(prevToken.hash);
                    if (prevElement && prevElement.element) {
                        afterElement = prevElement.element;
                        position = 'after';
                    }
                } else {
                    position = 'start';
                }
                
                added.push({
                    token: newToken,
                    position: position,
                    afterElement: afterElement
                });
            }
        });
        
        return { removed, added };
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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
                
                // 创建隐藏的颜色选择器
                var colorPickerButton = document.querySelector('.btn[data-format="color"]');
                if (colorPickerButton && !document.getElementById('nodebb-plugin-extended-markdown-colorpicker')) {
                    var hiddenPicker = document.createElement("input");
                    hiddenPicker.style.position = 'absolute';
                    hiddenPicker.style.left = '-9999px';
                    hiddenPicker.style.opacity = '0';
                    hiddenPicker.style.width = '1px';
                    hiddenPicker.style.height = '1px';
                    hiddenPicker.type = 'color';
                    hiddenPicker.id = 'nodebb-plugin-extended-markdown-colorpicker';
                    hiddenPicker.value = '#000000';
                    
                    document.body.appendChild(hiddenPicker);
                    
                    hiddenPicker.addEventListener('change', function() {
                        if (composerTextarea) {
                            const colorValue = this.value;
                            const start = composerTextarea.selectionStart;
                            const end = composerTextarea.selectionEnd;
                            const text = composerTextarea.value;
                            
                            // 查找颜色值的位置并替换
                            const beforeCursor = text.substring(0, start);
                            const colorMatch = beforeCursor.match(/%\(#[0-9a-fA-F]{6}\)\[$/);
                            
                            if (colorMatch) {
                                const colorStart = start - colorMatch[0].length + 2;
                                const colorEnd = colorStart + 7;
                                
                                composerTextarea.value = text.substring(0, colorStart) + colorValue + text.substring(colorEnd);
                                composerTextarea.selectionStart = colorEnd;
                                composerTextarea.selectionEnd = colorEnd;
                                
                                // 触发更新事件
                                $(composerTextarea).trigger('input').trigger('propertychange');
                            }
                        }
                    });
                }

                formatting.addButtonDispatch('color', function (textarea, selectionStart, selectionEnd) {
                    composerTextarea = textarea;
                    const hiddenPicker = document.getElementById('nodebb-plugin-extended-markdown-colorpicker');
                    
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '%(#000000)[' + (strings.color_text || 'colored text') + ']');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionStart + 9);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '%(#000000)[', ']');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionStart + 9);
                    }
                    
                    if (hiddenPicker) {
                        setTimeout(() => hiddenPicker.click(), 100);
                    }
                });

                formatting.addButtonDispatch('left', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '|-' + (strings.align_left || 'left aligned text'));
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionStart + 2 + (strings.align_left || 'left aligned text').length);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '|-', '');
                    }
                });

                formatting.addButtonDispatch('center', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '|-' + (strings.align_center || 'center aligned text') + '-|');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionStart + 2 + (strings.align_center || 'center aligned text').length);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '|-', '-|');
                    }
                });

                formatting.addButtonDispatch('right', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, (strings.align_right || 'right aligned text') + '-|');
                        controls.updateTextareaSelection(textarea, selectionStart, selectionStart + (strings.align_right || 'right aligned text').length);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '', '-|');
                    }
                });

                formatting.addButtonDispatch('justify', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '|=' + (strings.align_justify || 'justified text') + '=|');
                        controls.updateTextareaSelection(textarea, selectionStart + 2, selectionStart + 2 + (strings.align_justify || 'justified text').length);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '|=', '=|');
                    }
                });

                formatting.addButtonDispatch('textheader', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '#' + (strings.textheader_anchor || 'anchor-id') + '(' + (strings.textheader_title || 'Header Title') + ')');
                        controls.updateTextareaSelection(textarea, selectionStart + 1, selectionStart + 1 + (strings.textheader_anchor || 'anchor-id').length);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '#' + (strings.textheader_anchor || 'anchor-id') + '(', ')');
                    }
                });

                formatting.addButtonDispatch('groupedcode', function (textarea, selectionStart, selectionEnd) {
                    const template = `===group
\`\`\`${strings.groupedcode_firstlang || 'javascript'}

\`\`\`

\`\`\`${strings.groupedcode_secondlang || 'python'}

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
                        controls.insertIntoTextarea(textarea, '°' + (strings.bubbleinfo_text || 'tooltip content') + '°(提示内容)');
                        controls.updateTextareaSelection(textarea, selectionStart + 1, selectionStart + 1 + (strings.bubbleinfo_text || 'tooltip content').length);
                    } else {
                        controls.wrapSelectionInTextareaWith(textarea, '°', '°(提示内容)');
                    }
                });

                formatting.addButtonDispatch('collapsible', function (textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        controls.insertIntoTextarea(textarea, '[spoiler=点击展开]' + (strings.spoiler || 'hidden content') + '[/spoiler]');
                        controls.updateTextareaSelection(textarea, selectionStart + 15, selectionStart + 15 + (strings.spoiler || 'hidden content').length);
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
