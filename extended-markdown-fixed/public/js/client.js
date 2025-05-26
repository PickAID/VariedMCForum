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
            const animatedId = $container.data('animated-id');
            const $display = $container.find(`#${animatedId}-display`);
            const $tabs = $container.find('.nav-link');
            
            let currentTokens = [];
            let isAnimating = false;
            
            if ($tabs.length > 0) {
                const initialTokensData = $container.attr('data-initial-tokens');
                if (initialTokensData) {
                    currentTokens = JSON.parse(initialTokensData.replace(/&apos;/g, "'"));
                    renderTokens(currentTokens, $display);
                }
            }
            
            $tabs.on('click', function(e) {
                e.preventDefault();
                
                if (isAnimating) return;
                
                const $clickedTab = $(this);
                const newTokensData = $clickedTab.attr('data-keyed-tokens');
                if (!newTokensData) return;
                
                const newTokens = JSON.parse(newTokensData.replace(/&apos;/g, "'"));
                
                $tabs.removeClass('active');
                $clickedTab.addClass('active');
                
                animateCodeTransition(currentTokens, newTokens, $display).then(() => {
                    currentTokens = newTokens;
                });
            });
        });
    }

    function renderTokens(tokens, $display) {
        let html = '';
        tokens.forEach(token => {
            if (token.type === 'line') {
                if (token.tokens && token.tokens.length > 0) {
                    const tokenElements = token.tokens.map(t => 
                        `<span class="token ${t.style}" data-token-key="${t.key}">${escapeHtml(t.content)}</span>`
                    ).join('');
                    html += `<div class="code-line" data-line-key="${token.key}">${tokenElements}</div>`;
                } else {
                    html += `<div class="code-line" data-line-key="${token.key}">${escapeHtml(token.content)}</div>`;
                }
            }
        });
        $display.html(html);
    }

    async function animateCodeTransition(oldTokens, newTokens, $display) {
        isAnimating = true;
        
        try {
            const tokenMap = createTokenMapping(oldTokens, newTokens);
            
            await animateRemoval(tokenMap.toRemove, $display);
            await animateMovement(tokenMap.toKeep, $display);
            await animateAddition(tokenMap.toAdd, $display);
            
            renderTokens(newTokens, $display);
            
        } finally {
            isAnimating = false;
        }
    }

    function createTokenMapping(oldTokens, newTokens) {
        const oldMap = new Map();
        const newMap = new Map();
        
        oldTokens.forEach(token => {
            oldMap.set(token.key, token);
            if (token.tokens) {
                token.tokens.forEach(t => oldMap.set(t.key, t));
            }
        });
        
        newTokens.forEach(token => {
            newMap.set(token.key, token);
            if (token.tokens) {
                token.tokens.forEach(t => newMap.set(t.key, t));
            }
        });
        
        const toRemove = [];
        const toKeep = [];
        const toAdd = [];
        
        oldMap.forEach((token, key) => {
            if (!newMap.has(key)) {
                toRemove.push(token);
            } else {
                toKeep.push(token);
            }
        });
        
        newMap.forEach((token, key) => {
            if (!oldMap.has(key)) {
                toAdd.push(token);
            }
        });
        
        return { toRemove, toKeep, toAdd };
    }

    async function animateRemoval(tokensToRemove, $display) {
        if (tokensToRemove.length === 0) return;
        
        return new Promise(resolve => {
            tokensToRemove.forEach(token => {
                const $element = $display.find(`[data-token-key="${token.key}"], [data-line-key="${token.key}"]`);
                $element.addClass('magic-move-leaving');
            });
            
            setTimeout(() => {
                tokensToRemove.forEach(token => {
                    const $element = $display.find(`[data-token-key="${token.key}"], [data-line-key="${token.key}"]`);
                    $element.remove();
                });
                resolve();
            }, 300);
        });
    }

    async function animateMovement(tokensToKeep, $display) {
        return new Promise(resolve => {
            tokensToKeep.forEach(token => {
                const $element = $display.find(`[data-token-key="${token.key}"], [data-line-key="${token.key}"]`);
                $element.addClass('magic-move-moving');
            });
            
            setTimeout(() => {
                resolve();
            }, 200);
        });
    }

    async function animateAddition(tokensToAdd, $display) {
        if (tokensToAdd.length === 0) return;
        
        return new Promise(resolve => {
            tokensToAdd.forEach(token => {
                let elementHtml = '';
                if (token.type === 'line') {
                    if (token.tokens && token.tokens.length > 0) {
                        const tokenElements = token.tokens.map(t => 
                            `<span class="token ${t.style} magic-move-entering" data-token-key="${t.key}">${escapeHtml(t.content)}</span>`
                        ).join('');
                        elementHtml = `<div class="code-line magic-move-entering" data-line-key="${token.key}">${tokenElements}</div>`;
                    } else {
                        elementHtml = `<div class="code-line magic-move-entering" data-line-key="${token.key}">${escapeHtml(token.content)}</div>`;
                    }
                } else if (token.type === 'token') {
                    elementHtml = `<span class="token ${token.style} magic-move-entering" data-token-key="${token.key}">${escapeHtml(token.content)}</span>`;
                }
                
                $display.append(elementHtml);
            });
            
            setTimeout(() => {
                $display.find('.magic-move-entering').removeClass('magic-move-entering');
                resolve();
            }, 300);
        });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    ExtendedMarkdown.prepareFormattingTools = function () {
        require(['composer/formatting'], function (formatting) {
            if (formatting && formatting.addButtonDispatch) {
                
                formatting.addButtonDispatch('color', function(textarea, selectionStart, selectionEnd) {
                    const selectedText = textarea.value.substring(selectionStart, selectionEnd);
                    const colorCode = prompt('请输入颜色代码 (例如: #ff0000, red, rgb(255,0,0))', '#ff0000');
                    if (colorCode) {
                        const replacement = selectedText ? 
                            `%(${colorCode})[${selectedText}]` : 
                            `%(${colorCode})[文字内容]`;
                        formatting.insertIntoTextarea(textarea, replacement);
                        if (!selectedText) {
                            textarea.selectionStart = selectionStart + colorCode.length + 3;
                            textarea.selectionEnd = selectionStart + colorCode.length + 7;
                        }
                    }
                });

                formatting.addButtonDispatch('left', function(textarea, selectionStart, selectionEnd) {
                    const selectedText = textarea.value.substring(selectionStart, selectionEnd);
                    const replacement = selectedText ? `|-${selectedText}` : `|-左对齐文字`;
                    formatting.insertIntoTextarea(textarea, replacement);
                    if (!selectedText) {
                        textarea.selectionStart = selectionStart + 2;
                        textarea.selectionEnd = selectionStart + 7;
                    }
                });

                formatting.addButtonDispatch('center', function(textarea, selectionStart, selectionEnd) {
                    const selectedText = textarea.value.substring(selectionStart, selectionEnd);
                    const replacement = selectedText ? `|-${selectedText}-|` : `|-居中文字-|`;
                    formatting.insertIntoTextarea(textarea, replacement);
                    if (!selectedText) {
                        textarea.selectionStart = selectionStart + 2;
                        textarea.selectionEnd = selectionStart + 6;
                    }
                });

                formatting.addButtonDispatch('right', function(textarea, selectionStart, selectionEnd) {
                    const selectedText = textarea.value.substring(selectionStart, selectionEnd);
                    const replacement = selectedText ? `${selectedText}-|` : `右对齐文字-|`;
                    formatting.insertIntoTextarea(textarea, replacement);
                    if (!selectedText) {
                        textarea.selectionStart = selectionStart;
                        textarea.selectionEnd = selectionStart + 4;
                    }
                });

                formatting.addButtonDispatch('justify', function(textarea, selectionStart, selectionEnd) {
                    const selectedText = textarea.value.substring(selectionStart, selectionEnd);
                    const replacement = selectedText ? `|=${selectedText}=|` : `|=两端对齐文字=|`;
                    formatting.insertIntoTextarea(textarea, replacement);
                    if (!selectedText) {
                        textarea.selectionStart = selectionStart + 2;
                        textarea.selectionEnd = selectionStart + 8;
                    }
                });

                formatting.addButtonDispatch('textheader', function(textarea, selectionStart, selectionEnd) {
                    const selectedText = textarea.value.substring(selectionStart, selectionEnd);
                    const headerId = prompt('请输入锚点ID', 'header-id');
                    if (headerId) {
                        const replacement = selectedText ? 
                            `#${headerId}(${selectedText})` : 
                            `#${headerId}(标题文字)`;
                        formatting.insertIntoTextarea(textarea, replacement);
                        if (!selectedText) {
                            textarea.selectionStart = selectionStart + headerId.length + 2;
                            textarea.selectionEnd = selectionStart + headerId.length + 6;
                        }
                    }
                });

                formatting.addButtonDispatch('groupedcode', function(textarea, selectionStart, selectionEnd) {
                    const template = `===group
\`\`\`javascript
console.log('Hello World');
\`\`\`

\`\`\`python
print('Hello World')
\`\`\`
===`;
                    formatting.insertIntoTextarea(textarea, template);
                });

                formatting.addButtonDispatch('animatedcode', function(textarea, selectionStart, selectionEnd) {
                    const template = `===animated-group
\`\`\`javascript
const hello = 'world';
\`\`\`

\`\`\`javascript
const hello = 'world';
console.log(hello);
\`\`\`
===`;
                    formatting.insertIntoTextarea(textarea, template);
                });

                formatting.addButtonDispatch('bubbleinfo', function(textarea, selectionStart, selectionEnd) {
                    const selectedText = textarea.value.substring(selectionStart, selectionEnd);
                    const tooltipText = prompt('请输入提示文字', '这是一个提示');
                    if (tooltipText) {
                        const replacement = selectedText ? 
                            `°${selectedText}°(${tooltipText})` : 
                            `°悬停文字°(${tooltipText})`;
                        formatting.insertIntoTextarea(textarea, replacement);
                        if (!selectedText) {
                            textarea.selectionStart = selectionStart + 1;
                            textarea.selectionEnd = selectionStart + 5;
                        }
                    }
                });

                formatting.addButtonDispatch('collapsible', function(textarea, selectionStart, selectionEnd) {
                    const selectedText = textarea.value.substring(selectionStart, selectionEnd);
                    const title = prompt('请输入折叠标题', '点击展开');
                    if (title) {
                        const replacement = selectedText ? 
                            `[spoiler=${title}]${selectedText}[/spoiler]` : 
                            `[spoiler=${title}]隐藏内容[/spoiler]`;
                        formatting.insertIntoTextarea(textarea, replacement);
                        if (!selectedText) {
                            textarea.selectionStart = selectionStart + title.length + 10;
                            textarea.selectionEnd = selectionStart + title.length + 14;
                        }
                    }
                });

                formatting.addButtonDispatch('noteinfo', function(textarea, selectionStart, selectionEnd) {
                    const selectedText = textarea.value.substring(selectionStart, selectionEnd);
                    const title = prompt('请输入信息标题', '信息');
                    if (title) {
                        const replacement = selectedText ? 
                            `!!! info [${title}]: ${selectedText}` : 
                            `!!! info [${title}]: 这是一条信息提示`;
                        formatting.insertIntoTextarea(textarea, replacement);
                        if (!selectedText) {
                            textarea.selectionStart = selectionStart + title.length + 15;
                            textarea.selectionEnd = selectionStart + title.length + 23;
                        }
                    }
                });

                formatting.addButtonDispatch('notewarning', function(textarea, selectionStart, selectionEnd) {
                    const selectedText = textarea.value.substring(selectionStart, selectionEnd);
                    const title = prompt('请输入警告标题', '警告');
                    if (title) {
                        const replacement = selectedText ? 
                            `!!! warning [${title}]: ${selectedText}` : 
                            `!!! warning [${title}]: 这是一条警告提示`;
                        formatting.insertIntoTextarea(textarea, replacement);
                        if (!selectedText) {
                            textarea.selectionStart = selectionStart + title.length + 18;
                            textarea.selectionEnd = selectionStart + title.length + 26;
                        }
                    }
                });

                formatting.addButtonDispatch('noteimportant', function(textarea, selectionStart, selectionEnd) {
                    const selectedText = textarea.value.substring(selectionStart, selectionEnd);
                    const title = prompt('请输入重要标题', '重要');
                    if (title) {
                        const replacement = selectedText ? 
                            `!!! important [${title}]: ${selectedText}` : 
                            `!!! important [${title}]: 这是一条重要提示`;
                        formatting.insertIntoTextarea(textarea, replacement);
                        if (!selectedText) {
                            textarea.selectionStart = selectionStart + title.length + 20;
                            textarea.selectionEnd = selectionStart + title.length + 28;
                        }
                    }
                });
            }
        });
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
    
    $(window).on('action:composer.enhanced', function (evt, data) {
        ExtendedMarkdown.prepareFormattingTools();
    });
    
    pageReady();
});
