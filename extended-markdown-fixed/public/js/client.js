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
        
        document.querySelectorAll('.markdown-alert, .code-group-container, .extended-tabs-container, .text-header, .extended-markdown-tooltip, .spoiler, .steps-container, .collapsible-wrapper, .bubble-info').forEach(element => {
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
        $('[data-bs-toggle="tab"]').on('click', function(e) {
            e.preventDefault();
            const targetId = $(this).attr('data-bs-target');
            const $target = $(targetId);
            
            $(this).closest('.nav-tabs').find('.nav-link').removeClass('active');
            $(this).addClass('active');
            
            $target.closest('.tab-content').find('.tab-pane').removeClass('show active');
            $target.addClass('show active');
        });
    }

    function initializeCollapse() {
        $('.extended-markdown-collapsible').off('click').on('click', function (e) {
            e.preventDefault();
            const $button = $(this);
            const $icon = $button.find('.collapse-icon');
            const targetId = $button.attr('data-bs-target') || $button.attr('aria-controls');
            const $target = targetId ? $('#' + targetId.replace('#', '')) : $button.next('.collapsible-content');

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

    function initializeTooltips() {
        $('[data-bs-toggle="tooltip"]').each(function() {
            if (window.bootstrap && window.bootstrap.Tooltip) {
                new bootstrap.Tooltip(this);
            }
        });
    }

    function initStepsNavigation() {
        $('.steps-container').each(function() {
            const $container = $(this);
            const $prevBtn = $container.find('.step-prev');
            const $nextBtn = $container.find('.step-next');
            const $currentStep = $container.find('.current-step');
            const $totalSteps = $container.find('.total-steps');
            const $tabs = $container.find('.nav-link');
            
            let currentStepIndex = 0;
            const totalStepsCount = $tabs.length;
            
            function updateStepDisplay() {
                $currentStep.text(currentStepIndex + 1);
                $prevBtn.prop('disabled', currentStepIndex === 0);
                $nextBtn.prop('disabled', currentStepIndex === totalStepsCount - 1);
                
                $tabs.removeClass('active');
                $tabs.eq(currentStepIndex).addClass('active').tab('show');
            }
            
            $prevBtn.on('click', function() {
                if (currentStepIndex > 0) {
                    currentStepIndex--;
                    updateStepDisplay();
                }
            });
            
            $nextBtn.on('click', function() {
                if (currentStepIndex < totalStepsCount - 1) {
                    currentStepIndex++;
                    updateStepDisplay();
                }
            });
            
            $tabs.on('click', function() {
                currentStepIndex = $tabs.index(this);
                updateStepDisplay();
            });
        });
    }

    ExtendedMarkdown.prepareFormattingTools = function () {
        require(['composer/formatting'], function (formatting) {
            if (formatting && formatting.addButtonDispatch) {
                formatting.addButtonDispatch('spoiler', function(textarea, selectionStart, selectionEnd) {
                    if (selectionStart === selectionEnd) {
                        formatting.insertIntoTextarea(textarea, '[spoiler=点击展开]隐藏内容[/spoiler]');
                        textarea.selectionStart = selectionStart + 15;
                        textarea.selectionEnd = selectionStart + 19;
                    } else {
                        const selectedText = textarea.value.substring(selectionStart, selectionEnd);
                        formatting.insertIntoTextarea(textarea, `[spoiler=点击展开]${selectedText}[/spoiler]`);
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

    function initializeAnimatedCodeGroups() {
        $('.animated-code-group-container').each(function() {
            const $container = $(this);
            const animatedId = $container.data('animated-id');
            const $display = $container.find(`#${animatedId}-display`);
            const $tabs = $container.find('.nav-link');
            
            let currentTokens = [];
            let isAnimating = false;
            
            // 初始化第一个标签的内容
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
                
                // 更新激活状态
                $tabs.removeClass('active');
                $clickedTab.addClass('active');
                
                // 执行魔法移动动画
                performMagicMove(currentTokens, newTokens, $display).then(() => {
                    currentTokens = newTokens;
                });
            });
        });
    }

    function renderTokens(keyedTokens, $display) {
        const content = keyedTokens.map(line => {
            if (line.tokens && line.tokens.length > 0) {
                const tokenElements = line.tokens.map(token => 
                    `<span class="token ${token.style}" data-token-key="${token.key}">${escapeHtml(token.content)}</span>`
                ).join('');
                return `<div class="code-line" data-line-key="${line.key}">${tokenElements}</div>`;
            } else {
                return `<div class="code-line" data-line-key="${line.key}">${escapeHtml(line.content)}</div>`;
            }
        }).join('');
        
        $display.html(content);
    }

    async function performMagicMove(oldTokens, newTokens, $display) {
        isAnimating = true;
        
        try {
            // 创建魔法移动状态机
            const machine = createMagicMoveMachine(oldTokens, newTokens);
            
            // 执行动画序列
            await executeAnimationSequence(machine, $display);
            
            // 最终渲染
            renderTokens(newTokens, $display);
            
        } finally {
            isAnimating = false;
        }
    }

    function createMagicMoveMachine(oldTokens, newTokens) {
        const oldTokenMap = new Map();
        const newTokenMap = new Map();
        
        // 构建 token 映射
        oldTokens.forEach(line => {
            oldTokenMap.set(line.key, line);
            if (line.tokens) {
                line.tokens.forEach(token => {
                    oldTokenMap.set(token.key, token);
                });
            }
        });
        
        newTokens.forEach(line => {
            newTokenMap.set(line.key, line);
            if (line.tokens) {
                line.tokens.forEach(token => {
                    newTokenMap.set(token.key, token);
                });
            }
        });
        
        // 分类操作
        const operations = {
            keep: [],    // 保持不变的元素
            move: [],    // 需要移动的元素
            remove: [],  // 需要删除的元素
            add: []      // 需要添加的元素
        };
        
        // 找出需要删除的元素
        oldTokenMap.forEach((token, key) => {
            if (!newTokenMap.has(key)) {
                operations.remove.push(token);
            } else {
                operations.keep.push(token);
            }
        });
        
        // 找出需要添加的元素
        newTokenMap.forEach((token, key) => {
            if (!oldTokenMap.has(key)) {
                operations.add.push(token);
            }
        });
        
        return operations;
    }

    async function executeAnimationSequence(machine, $display) {
        // 阶段1：标记删除的元素
        await animateRemoval(machine.remove, $display);
        
        // 阶段2：移动现有元素
        await animateMovement(machine.keep, $display);
        
        // 阶段3：添加新元素
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
            // 在正确位置插入新元素
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
                
                // 简化插入逻辑 - 在实际应用中需要更精确的位置计算
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
