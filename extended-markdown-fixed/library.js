'use strict';

const slugify = require.main.require('./src/slugify');
const { translator } = require.main.require('./src/translator');

const textHeaderRegex = /(<code.*?>.*?<\/code>)|<p dir="auto">#([a-zA-Z0-9-_]+)\(([^)]+)\)<\/p>/g;
const tooltipRegex = /(<code.*?>.*?<\/code>)|°(.+?)°\((.+?)\)/g;

const codeTabRegex = /(?:<p dir="auto">={3}group<\/p>\n)((?:<pre><code class=".+">[^]*?<\/code><\/pre>\n){2,})(?:<p dir="auto">={3}<\/p>)/g;
const animatedCodeTabRegex = /(?:<p dir="auto">={3}animated-group<\/p>\n)((?:<pre><code class=".+">[^]*?<\/code><\/pre>\n){2,})(?:<p dir="auto">={3}<\/p>)/g;
const langCodeRegex = /<code class="(.+)">/;

const colorRegex = /(<code.*?>.*?<\/code>)|%\((#[\dA-Fa-f]{6}|rgb\(\d{1,3}, ?\d{1,3}, ?\d{1,3}\)|[a-z]+)\)\[(.+?)]/g;

const paragraphAndHeadingRegex = /<(h[1-6]|p dir="auto")>([^]*?)<\/(h[1-6]|p)>/g;

const noteRegex = /(<code.*?>.*?<\/code>)|<p dir="auto">!!! (info|warning|important) \[([^\]]*)\]: ((.|<br \/>\n)*)<\/p>/g;

const superscriptRegex = /(<code.*?>.*?<\/code>)|([^\s`<>])\^([^\s`<>^]+)\^/g;
const subscriptRegex = /(<code.*?>.*?<\/code>)|([^\s`<>])~([^\s`<>~]+)~/g;

const rubyRegex = /(<pre><code[\s\S]*?<\/code><\/pre>|<code[\s\S]*?<\/code>)|\[ruby=([^\]]+)\]([^\[]+)\[\/ruby\]/g;

const extendedTabsRegex = /(?:<p dir="auto">)?\[tabs\](?:<\/p>)?([\s\S]*?)(?:<p dir="auto">)?\[\/tabs\](?:<\/p>)?/gi;
const tabRegex = /(?:<p dir="auto">)?\[tab=([^\]]+)\](?:<\/p>)?([\s\S]*?)(?=(?:<p dir="auto">)?\[tab=|(?:<p dir="auto">)?\[\/tabs\]|$)/gi;

const stepsRegex = /(?:<p dir="auto">)?\[steps\](?:<\/p>)?([\s\S]*?)(?:<p dir="auto">)?\[\/steps\](?:<\/p>)?/gi;
const stepRegex = /(?:<p dir="auto">)?\[step\](?:<\/p>)?([\s\S]*?)(?=(?:<p dir="auto">)?\[step\]|(?:<p dir="auto">)?\[\/steps\]|$)/gi;

const spoilerRegex = /(?:<p dir="auto">)?\[spoiler=([^\]]+)\](?:<\/p>)?(?:<br\s*\/?>|\s)*\n?([\s\S]*?)(?:<p dir="auto">)?\[\/spoiler\](?:<\/p>)?/gi;

const mermaidRegex = /(?:<p dir="auto">)?\[mermaid\](?:<\/p>)?([\s\S]*?)(?:<p dir="auto">)?\[\/mermaid\](?:<\/p>)?/gi;

const noteIcons = {
    info: 'fa-info-circle',
    warning: 'fa-exclamation-triangle',
    important: 'fa-exclamation-circle'
};

function cleanContent(content) {
    return content
        .replace(/^<p dir="auto">\s*/g, '')
        .replace(/\s*<\/p>$/g, '')
        .replace(/^<p>\s*/g, '')
        .replace(/\s*<\/p>$/g, '')
        .replace(/^<br \/>\s*/g, '')
        .replace(/\s*<br \/>$/g, '')
        .replace(/^\s+/gm, '')
        .replace(/\s+$/gm, '')
        .replace(/^\n+/, '')
        .replace(/\n+$/, '')
        .replace(/^[\r\n\s]*/, '')
        .replace(/[\r\n\s]*$/, '')
        .trim();
}

function createTabComponent(type, items, id) {
    let menuTab = `<ul class='nav nav-tabs' role='tablist' id='${id}-tabs'>`;
    let contentTab = `<div class='tab-content' id='${id}-content'>`;
    
    for (let i = 0; i < items.length; i++) {
        const tabId = `${id}-${i}`;
        const isActive = i === 0;
        
        menuTab += `<li class="nav-item" role="presentation">
            <button class="nav-link ${isActive ? "active" : ""}" 
                    id="${tabId}-tab" 
                    data-bs-toggle="tab" 
                    data-bs-target="#${tabId}" 
                    type="button" 
                    role="tab" 
                    aria-controls="${tabId}" 
                    aria-selected="${isActive ? "true" : "false"}">
                ${items[i].label}
            </button>
        </li>`;
        
        contentTab += `<div class="tab-pane fade ${isActive ? "show active" : ""}" 
                           id="${tabId}" 
                           role="tabpanel" 
                           aria-labelledby="${tabId}-tab" 
                           tabindex="0">${items[i].content}</div>`;
    }
    
    menuTab += "</ul>";
    contentTab += "</div>";
    
    return `<div class="${type}-container">${menuTab}${contentTab}</div>`;
}

function createAnimatedCodeComponent(items, id) {
    let menuTab = `<ul class='nav nav-tabs animated-code-nav' role='tablist' id='${id}-tabs'>`;
    let contentTab = `<div class='animated-code-content' id='${id}-content'>`;
    
    for (let i = 0; i < items.length; i++) {
        const tabId = `${id}-${i}`;
        const isActive = i === 0;
        
        menuTab += `<li class="nav-item" role="presentation">
            <button class="nav-link ${isActive ? "active" : ""}" 
                    id="${tabId}-tab" 
                    data-animated-target="${tabId}" 
                    type="button" 
                    role="tab" 
                    data-keyed-tokens='${JSON.stringify(items[i].keyedTokens).replace(/'/g, "&apos;")}'
                    data-lang="${items[i].lang}">
                ${items[i].label}
            </button>
        </li>`;
    }
    
    menuTab += "</ul>";
    contentTab += `<div class="animated-code-display">
        <pre><code class="${items[0].lang}" id="${id}-display"></code></pre>
    </div>`;
    contentTab += "</div>";
    
    return `<div class="animated-code-group-container" data-animated-id="${id}" data-initial-tokens='${JSON.stringify(items[0].keyedTokens).replace(/'/g, "&apos;")}'>${menuTab}${contentTab}</div>`;
}

function codeToKeyedTokens(code, lang) {
    const lines = code.split('\n');
    const keyedTokens = [];
    
    lines.forEach((line, lineIndex) => {
        if (line.trim() === '') {
            keyedTokens.push({
                type: 'line',
                key: `line-${lineIndex}-empty`,
                content: '',
                offset: [lineIndex, 0, lineIndex, 0],
                tokens: []
            });
            return;
        }
        
        // 简单的 token 分割 - 在实际应用中可以集成 Shiki
        const tokens = tokenizeSimple(line, lineIndex);
        keyedTokens.push({
            type: 'line',
            key: `line-${lineIndex}`,
            content: line,
            offset: [lineIndex, 0, lineIndex, line.length],
            tokens: tokens
        });
    });
    
    return keyedTokens;
}

function tokenizeSimple(line, lineIndex) {
    const tokens = [];
    let charIndex = 0;
    
    // 基础的词法分析 - 识别关键字、字符串、注释等
    const words = line.split(/(\s+|[{}()[\];,.]|\/\/|\/\*|\*\/|"|')/);
    
    words.forEach((word, wordIndex) => {
        if (word && word.trim()) {
            const tokenType = getTokenType(word);
            tokens.push({
                type: 'token',
                key: `token-${lineIndex}-${wordIndex}-${hashString(word)}`,
                content: word,
                offset: [lineIndex, charIndex, lineIndex, charIndex + word.length],
                style: tokenType
            });
        }
        charIndex += word.length;
    });
    
    return tokens;
}

function getTokenType(word) {
    // 简单的语法高亮类型判断
    const keywords = ['const', 'let', 'var', 'function', 'if', 'else', 'for', 'while', 'return', 'class', 'import', 'export'];
    const operators = ['+', '-', '*', '/', '=', '==', '===', '!=', '!==', '&&', '||'];
    
    if (keywords.includes(word)) return 'keyword';
    if (operators.includes(word)) return 'operator';
    if (word.startsWith('"') || word.startsWith("'")) return 'string';
    if (word.startsWith('//')) return 'comment';
    if (/^\d+$/.test(word)) return 'number';
    if (/^[{}()[\];,.]$/.test(word)) return 'punctuation';
    
    return 'identifier';
}

function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(36);
}

function applyTextHeaders(textContent) {
    return textContent.replace(textHeaderRegex, function (match, code, anchor, title) {
        if (typeof (code) !== "undefined") {
            return code;
        }
        return `<div class="text-header" id="${anchor}">${title}</div>`;
    });
}

function applyTooltips(textContent) {
    return textContent.replace(tooltipRegex, function (match, code, text, tooltipText) {
        if (typeof (code) !== "undefined") {
            return code;
        } else if ("fa-info" === text) {
            return `<i class="fa fa-info-circle extended-markdown-tooltip" data-bs-toggle="tooltip" data-bs-placement="top" title="${tooltipText}"></i>`;
        } else {
            return `<span class="extended-markdown-tooltip" data-bs-toggle="tooltip" data-bs-placement="top" title="${tooltipText}">${text}</span>`;
        }
    });
}

function applyColors(textContent) {
    return textContent.replace(colorRegex, function (match, code, color, text) {
        if (typeof (code) !== "undefined") {
            return code;
        }
        return `<span style="color: ${color};">${text}</span>`;
    });
}

function applyTabs(textContent, id) {
    return textContent.replace(extendedTabsRegex, function (match, tabsContent) {
        const cleanTabsContent = cleanContent(tabsContent);
        let tabMatches = [];
        let tabMatch;
        
        const tabRegexForMatch = /(?:<p dir="auto">)?\[tab=([^\]]+)\](?:<\/p>)?(?:<br\s*\/?>|<p\s+dir="auto">|\s)*([^]*?)(?=(?:<p dir="auto">)?\[tab=|$)/gi;
        
        while ((tabMatch = tabRegexForMatch.exec(cleanTabsContent)) !== null) {
            let tabContent = tabMatch[2];
            
            tabContent = tabContent.replace(/^<p\s+dir="auto">\s*/, '');
            tabContent = cleanContent(tabContent);
                
            if (tabContent) {
                tabMatches.push({
                    title: tabMatch[1].trim(),
                    content: tabContent
                });
            }
        }
        
        if (tabMatches.length === 0) return match;
        
        const tabsId = `tabs-${id}-${Math.random().toString(36).substr(2, 9)}`;
        
        let items = tabMatches.map(tab => ({
            label: tab.title,
            content: tab.content
        }));
        
        return createTabComponent('extended-tabs', items, tabsId);
    });
}

function applySteps(textContent, id) {
    return textContent.replace(stepsRegex, function (match, stepsContent) {
        const cleanStepsContent = cleanContent(stepsContent);
        let stepMatches = [];
        let stepMatch;
        
        const stepRegexForMatch = /(?:<p dir="auto">)?\[step\](?:<\/p>)?(?:<br\s*\/?>|<p\s+dir="auto">|\s)*([^]*?)(?=(?:<p dir="auto">)?\[step\]|$)/gi;
        
        while ((stepMatch = stepRegexForMatch.exec(cleanStepsContent)) !== null) {
            let stepContent = stepMatch[1];
            
            stepContent = stepContent.replace(/^<p\s+dir="auto">\s*/, '');
            stepContent = cleanContent(stepContent);
                
            if (stepContent) {
                stepMatches.push(stepContent);
            }
        }
        
        if (stepMatches.length === 0) return match;
        
        const stepsId = `steps-${id}-${Math.random().toString(36).substr(2, 9)}`;
        
        let items = stepMatches.map((content, index) => ({
            label: `第 ${index + 1} 步`,
            content: content
        }));
        
        let menuTab = `<ul class='nav nav-tabs' role='tablist' id='${stepsId}-tabs'>`;
        let contentTab = `<div class='tab-content' id='${stepsId}-content'>`;
        
        for (let i = 0; i < items.length; i++) {
            const tabId = `${stepsId}-${i}`;
            const isActive = i === 0;
            
            menuTab += `<li class="nav-item" role="presentation">
                <button class="nav-link ${isActive ? "active" : ""}" 
                        id="${tabId}-tab" 
                        data-bs-toggle="tab" 
                        data-bs-target="#${tabId}" 
                        type="button" 
                        role="tab" 
                        aria-controls="${tabId}" 
                        aria-selected="${isActive ? "true" : "false"}">
                    ${items[i].label}
                </button>
            </li>`;
            
            contentTab += `<div class="tab-pane fade ${isActive ? "show active" : ""}" 
                               id="${tabId}" 
                               role="tabpanel" 
                               aria-labelledby="${tabId}-tab" 
                               tabindex="0">${items[i].content}</div>`;
        }
        
        menuTab += "</ul>";
        contentTab += "</div>";
        
        const stepsHeader = `
            <div class="steps-header">
                <div class="step-counter">
                    <span class="current-step">1</span> / <span class="total-steps">${items.length}</span>
                </div>
                <div class="steps-navigation">
                    <button class="step-nav-btn step-prev" disabled>上一步</button>
                    <button class="step-nav-btn step-next">下一步</button>
                </div>
            </div>
        `;
        
        return `<div class="steps-container">${menuTab}${contentTab}${stepsHeader}</div>`;
    });
}

function applySpoiler(textContent, id) {
    return textContent.replace(spoilerRegex, function (match, title, content) {
        const spoilerId = `spoiler-${id}-${Math.random().toString(36).substr(2, 9)}`;
        const cleanContent = content.trim();
        
        return `
            <div class="collapsible-wrapper">
                <button class="extended-markdown-collapsible" 
                        type="button" 
                        data-bs-target="${spoilerId}" 
                        aria-expanded="false" 
                        aria-controls="${spoilerId}">
                    <i class="fa fa-chevron-right collapse-icon"></i>
                    ${title}
                </button>
                <div class="collapsible-content" id="${spoilerId}" style="display: none;">
                    <div style="padding: 1rem;">
                        ${cleanContent}
                    </div>
                </div>
            </div>
        `;
    });
}

function applyNotes(textContent) {
    return textContent.replace(noteRegex, function (match, code, type, title, content) {
        if (typeof (code) !== "undefined") {
            return code;
        }
        const icon = noteIcons[type] || 'fa-info-circle';
        const cleanTitle = title || type.charAt(0).toUpperCase() + type.slice(1);
        const cleanContent = content.replace(/<br \/>\n/g, '\n').trim();
        
        return `
            <div class="markdown-alert markdown-alert-${type}">
                <h6><i class="fa ${icon}"></i>${cleanTitle}</h6>
                <div>${cleanContent}</div>
            </div>
        `;
    });
}

function applyRuby(textContent) {
    return textContent.replace(rubyRegex, function (match, codeBlock, ruby, text) {
        if (typeof (codeBlock) !== "undefined") {
            return codeBlock;
        }
        return `<ruby>${text}<rt>${ruby}</rt></ruby>`;
    });
}

function applySuperscriptAndSubscript(textContent) {
    textContent = textContent.replace(superscriptRegex, function (match, code, base, script) {
        if (typeof (code) !== "undefined") {
            return code;
        }
        return `${base}<sup>${script}</sup>`;
    });
    
    textContent = textContent.replace(subscriptRegex, function (match, code, base, script) {
        if (typeof (code) !== "undefined") {
            return code;
        }
        return `${base}<sub>${script}</sub>`;
    });
    
    return textContent;
}

function applyAnchors(textContent) {
    return textContent.replace(paragraphAndHeadingRegex, function (match, tag, text, closeTag) {
        let anchor = tag.charAt(0) == "h" ? generateAnchorFromHeading(text) : "";
        
        if (text.startsWith("|=") && text.endsWith("=|")) {
            const cleanText = text.slice(2, -2);
            return `<${tag} style="text-align:justify;">${anchor}${cleanText}</${closeTag}>`;
        } else if (text.startsWith("|-") && text.endsWith("-|")) {
            const cleanText = text.slice(2, -2);
            return `<${tag} style="text-align:center;">${anchor}${cleanText}</${closeTag}>`;
        } else if (text.endsWith("-|")) {
            const cleanText = text.slice(0, -2);
            return `<${tag} style="text-align:right;">${anchor}${cleanText}</${closeTag}>`;
        } else if (text.startsWith("|-")) {
            const cleanText = text.slice(2);
            return `<${tag} style="text-align:left;">${anchor}${cleanText}</${closeTag}>`;
        }
        return `<${tag}>${anchor}${text}</${closeTag}>`;
    });
}

function applyGroupCode(textContent, id) {
    if (textContent.match(codeTabRegex)) {
        let count = 0;
        textContent = textContent.replace(codeTabRegex, (match, codes) => {
            let cleanCodes = codes.trim();
            let codeArray = cleanCodes.substring(5, cleanCodes.length - 6).split(/<\/pre>\n<pre>/g);
            let items = [];
            
            for (let i in codeArray) {
                const langMatch = langCodeRegex.exec(codeArray[i]);
                if (langMatch) {
                    const lang = langMatch[1];
                    let codeContent = codeArray[i]
                        .replace(/<\/?pre[^>]*>/g, '')
                        .replace(/<code[^>]*>/g, '')
                        .replace(/<\/code>/g, '')
                        .trim();
                    
                    items.push({
                        label: capitalizeFirstLetter(lang),
                        content: `<pre><code class="${lang}">${codeContent}</code></pre>`
                    });
                }
            }
            
            count++;
            return createTabComponent('code-group', items, `cg-${count}-${id}`);
        });
    }
    return textContent;
}

function applyAnimatedGroupCode(textContent, id) {
    if (textContent.match(animatedCodeTabRegex)) {
        let count = 0;
        textContent = textContent.replace(animatedCodeTabRegex, (match, codes) => {
            let cleanCodes = codes.trim();
            let codeArray = cleanCodes.substring(5, cleanCodes.length - 6).split(/<\/pre>\n<pre>/g);
            let items = [];
            
            for (let i in codeArray) {
                const langMatch = langCodeRegex.exec(codeArray[i]);
                if (langMatch) {
                    const lang = langMatch[1];
                    let codeContent = codeArray[i]
                        .replace(/<\/?pre[^>]*>/g, '')
                        .replace(/<code[^>]*>/g, '')
                        .replace(/<\/code>/g, '')
                        .trim();
                    
                    const keyedTokens = codeToKeyedTokens(codeContent, lang);
                    
                    items.push({
                        label: capitalizeFirstLetter(lang),
                        content: codeContent,
                        lang: lang,
                        keyedTokens: keyedTokens
                    });
                }
            }
            
            count++;
            return createAnimatedCodeComponent(items, `acg-${count}-${id}`);
        });
    }
    return textContent;
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function generateAnchorFromHeading(heading) {
    return `<a class="anchor-offset" name="${slugify(heading)}"></a>`;
}

function applyMermaid(textContent, id) {
    let mermaidCount = 0;
    return textContent.replace(mermaidRegex, function (match, mermaidCode) {
        mermaidCount++;
        const mermaidId = `mermaid-${mermaidCount}-${id}`;
        const cleanCode = cleanContent(mermaidCode);
        
        return `<div class="mermaid-container">
            <pre class="mermaid" id="${mermaidId}">${cleanCode}</pre>
        </div>`;
    });
}

function applyExtendedMarkdown(textContent) {
    textContent = applyNotes(textContent);
    textContent = applyTextHeaders(textContent);
    textContent = applyTooltips(textContent);
    textContent = applyColors(textContent);
    textContent = applyRuby(textContent);
    textContent = applySuperscriptAndSubscript(textContent);
    textContent = applyAnchors(textContent);
    
    return textContent;
}

const ExtendedMarkdown = {
    async parsePost(data) {
        if (data && data.postData && data.postData.content) {
            data.postData.content = applyTabs(data.postData.content, data.postData.pid);
            data.postData.content = applySteps(data.postData.content, data.postData.pid);
            data.postData.content = applySpoiler(data.postData.content, data.postData.pid);
            data.postData.content = applyMermaid(data.postData.content, data.postData.pid);
            data.postData.content = await applyExtendedMarkdown(data.postData.content);
            data.postData.content = applyGroupCode(data.postData.content, data.postData.pid);
            data.postData.content = applyAnimatedGroupCode(data.postData.content, data.postData.pid);
        }
        return data;
    },

    async parseSignature(data) {
        if (data && data.userData && data.userData.signature) {
            data.userData.signature = applyTabs(data.userData.signature, "sig");
            data.userData.signature = applySteps(data.userData.signature, "sig");
            data.userData.signature = applySpoiler(data.userData.signature, "sig");
            data.userData.signature = applyMermaid(data.userData.signature, "sig");
            data.userData.signature = await applyExtendedMarkdown(data.userData.signature);
            data.userData.signature = applyGroupCode(data.userData.signature, "sig");
            data.userData.signature = applyAnimatedGroupCode(data.userData.signature, "sig");
        }
        return data;
    },

    async parseAboutMe(data) {
        if (data) {
            data = applyTabs(data, "about");
            data = applySteps(data, "about");
            data = applySpoiler(data, "about");
            data = applyMermaid(data, "about");
            data = await applyExtendedMarkdown(data);
            data = applyGroupCode(data, "about");
            data = applyAnimatedGroupCode(data, "about");
        }
        return data;
    },

    parseRaw: function (textContent, callback) {
        const postId = Math.floor(Math.random() * 100000);
        
        textContent = applyTextHeaders(textContent);
        textContent = applyTooltips(textContent);
        textContent = applyColors(textContent);
        textContent = applyNotes(textContent);
        textContent = applyTabs(textContent, postId);
        textContent = applySteps(textContent, postId);
        textContent = applySpoiler(textContent, postId);
        textContent = applyMermaid(textContent, postId);
        textContent = applyGroupCode(textContent, postId);
        textContent = applyAnimatedGroupCode(textContent, postId);
        textContent = applyRuby(textContent);
        textContent = applySuperscriptAndSubscript(textContent);
        textContent = applyAnchors(textContent);

        callback(null, textContent);
    },
    
    async registerFormatting(payload) {
        const formatting = [
            { name: "color", className: "fa fa-eyedropper", title: "颜色" },
            { name: "left", className: "fa fa-align-left", title: "左对齐" },
            { name: "center", className: "fa fa-align-center", title: "居中对齐" },
            { name: "right", className: "fa fa-align-right", title: "右对齐" },
            { name: "justify", className: "fa fa-align-justify", title: "两端对齐" },
            { name: "textheader", className: "fa fa-header", title: "文本标题" },
            { name: "groupedcode", className: "fa fa-file-code-o", title: "代码组" },
            { name: "bubbleinfo", className: "fa fa-info-circle", title: "气泡信息" },
            { name: "collapsible", className: "fa fa-eye-slash", title: "折叠内容" },
            { name: "noteinfo", className: "fa fa-info", title: "信息提示" },
            { name: "notewarning", className: "fa fa-exclamation-triangle", title: "警告提示" },
            { name: "noteimportant", className: "fa fa-exclamation-circle", title: "重要提示" },
            { name: 'tabs', className: 'fa fa-folder-open', title: '插入标签卡' },
            { name: 'steps', className: 'fa fa-tasks', title: '插入步骤' },
            { name: 'ruby', className: 'fa fa-language', title: '插入音注标记' },
            { name: 'superscript', className: 'fa fa-superscript', title: '上标' },
            { name: 'subscript', className: 'fa fa-subscript', title: '下标' },
            { name: 'mermaid', className: 'fa fa-sitemap', title: '插入图表' }
        ];

        payload.options = payload.options.concat(formatting);
        return payload;
    },
    
    async sanitizerConfig(config) {
        config.allowedAttributes['a'].push('name');
        config.allowedAttributes['div'] = config.allowedAttributes['div'] || [];
        config.allowedAttributes['div'].push('class', 'id', 'data-mermaid-source');
        config.allowedAttributes['pre'] = config.allowedAttributes['pre'] || [];
        config.allowedAttributes['pre'].push('class', 'id', 'data-processed', 'data-preview-processed');
        config.allowedTags.push('svg', 'g', 'path', 'text', 'rect', 'circle', 'line', 'polygon', 'polyline', 'ellipse', 'defs', 'marker', 'foreignObject');
        config.allowedAttributes['svg'] = ['class', 'id', 'width', 'height', 'viewBox', 'xmlns', 'style'];
        config.allowedAttributes['g'] = ['class', 'id', 'transform', 'style'];
        config.allowedAttributes['path'] = ['class', 'id', 'd', 'fill', 'stroke', 'stroke-width', 'style'];
        config.allowedAttributes['text'] = ['class', 'id', 'x', 'y', 'text-anchor', 'style', 'font-size', 'font-family'];
        config.allowedAttributes['rect'] = ['class', 'id', 'x', 'y', 'width', 'height', 'fill', 'stroke', 'style'];
        config.allowedAttributes['circle'] = ['class', 'id', 'cx', 'cy', 'r', 'fill', 'stroke', 'style'];
        config.allowedAttributes['line'] = ['class', 'id', 'x1', 'y1', 'x2', 'y2', 'stroke', 'style'];
        config.allowedAttributes['polygon'] = ['class', 'id', 'points', 'fill', 'stroke', 'style'];
        config.allowedAttributes['polyline'] = ['class', 'id', 'points', 'fill', 'stroke', 'style'];
        config.allowedAttributes['ellipse'] = ['class', 'id', 'cx', 'cy', 'rx', 'ry', 'fill', 'stroke', 'style'];
        config.allowedAttributes['defs'] = ['class', 'id'];
        config.allowedAttributes['marker'] = ['class', 'id', 'markerWidth', 'markerHeight', 'refX', 'refY', 'orient', 'markerUnits'];
        config.allowedAttributes['foreignObject'] = ['class', 'id', 'x', 'y', 'width', 'height'];
        return config;
    }
};

module.exports = ExtendedMarkdown;

