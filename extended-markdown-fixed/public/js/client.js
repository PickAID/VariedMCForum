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
            await executeAnimationSequence(tokenMap, $display);
        } finally {
            isAnimating = false;
        }
    }

    function createTokenMapping(oldTokens, newTokens) {
        const oldTokenMap = new Map(oldTokens.map(token => [token.key, token]));
        const newTokenMap = new Map(newTokens.map(token => [token.key, token]));
        
        const operations = {
            keep: [],    // 保持不变的元素
            remove: [],  // 需要删除的元素
            add: []      // 需要添加的元素
        };
        
        oldTokenMap.forEach((token, key) => {
            if (!newTokenMap.has(key)) {
                operations.remove.push(token);
            } else {
                operations.keep.push(token);
            }
        });
        
        newTokenMap.forEach((token, key) => {
            if (!oldTokenMap.has(key)) {
                operations.add.push(token);
            }
        });
        
        return operations;
    }

    async function executeAnimationSequence(machine, $display) {
        await animateRemoval(machine.remove, $display);
        await animateMovement(machine.keep, $display);
        await animateAddition(machine.add, $display);
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

    ExtendedMarkdown.prepareFormattingTools = async function () {
        const [formatting, controls] = await app.require(['composer/formatting', 'composer/controls']);
        
        if (formatting && controls) {
            formatting.addButtonDispatch('color', function (textarea, selectionStart, selectionEnd) {
                const selectedText = textarea.value.substring(selectionStart, selectionEnd);
                const text = selectedText || '彩色文字';
                controls.insertIntoTextarea(textarea, `%(#ff0000)[${text}]`);
            });

            formatting.addButtonDispatch('left', function (textarea, selectionStart, selectionEnd) {
                const selectedText = textarea.value.substring(selectionStart, selectionEnd);
                const text = selectedText || '左对齐文字';
                controls.insertIntoTextarea(textarea, `|--${text}`);
            });

            formatting.addButtonDispatch('center', function (textarea, selectionStart, selectionEnd) {
                const selectedText = textarea.value.substring(selectionStart, selectionEnd);
                const text = selectedText || '居中文字';
                controls.insertIntoTextarea(textarea, `|-${text}-|`);
            });

            formatting.addButtonDispatch('right', function (textarea, selectionStart, selectionEnd) {
                const selectedText = textarea.value.substring(selectionStart, selectionEnd);
                const text = selectedText || '右对齐文字';
                controls.insertIntoTextarea(textarea, `${text}-|`);
            });

            formatting.addButtonDispatch('justify', function (textarea, selectionStart, selectionEnd) {
                const selectedText = textarea.value.substring(selectionStart, selectionEnd);
                const text = selectedText || '两端对齐文字';
                controls.insertIntoTextarea(textarea, `|=${text}=|`);
            });

            formatting.addButtonDispatch('textheader', function (textarea, selectionStart, selectionEnd) {
                const selectedText = textarea.value.substring(selectionStart, selectionEnd);
                const text = selectedText || '标题文字';
                controls.insertIntoTextarea(textarea, `#anchor-id(${text})`);
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
                const selectedText = textarea.value.substring(selectionStart, selectionEnd);
                const text = selectedText || '悬停文字';
                controls.insertIntoTextarea(textarea, `°${text}°(提示内容)`);
            });

            formatting.addButtonDispatch('collapsible', function (textarea, selectionStart, selectionEnd) {
                const selectedText = textarea.value.substring(selectionStart, selectionEnd);
                const content = selectedText || '隐藏内容';
                controls.insertIntoTextarea(textarea, `[spoiler=点击展开]${content}[/spoiler]`);
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
