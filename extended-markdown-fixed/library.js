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

function ensureString(text) {
    if (typeof text !== 'string') {
        console.warn('Expected string but got:', typeof text, text);
        return '';
    }
    return text;
}

function cleanContent(content) {
    return ensureString(content).trim();
}

function applyColor(textContent) {
    textContent = ensureString(textContent);
    return textContent.replace(colorRegex, function (match, code, color, content) {
        if (code) return code;
        return `<span style="color: ${color}">${content}</span>`;
    });
}

function applyTextHeaders(textContent) {
    textContent = ensureString(textContent);
    return textContent.replace(textHeaderRegex, function (match, code, id, content) {
        if (code) return code;
        return `<h2 class="text-header" id="${slugify(id)}">${content}</h2>`;
    });
}

function applyTooltips(textContent) {
    textContent = ensureString(textContent);
    return textContent.replace(tooltipRegex, function (match, code, content, tooltip) {
        if (code) return code;
        return `<span class="extended-markdown-tooltip" data-bs-toggle="tooltip" data-bs-placement="top" title="${tooltip}">${content}</span>`;
    });
}

function applyAlignments(textContent) {
    textContent = ensureString(textContent);
    return textContent.replace(paragraphAndHeadingRegex, function (match, tag, content, closingTag) {
        if (content.includes('--left--')) {
            return match.replace('--left--', '').replace(`<${tag}>`, `<${tag} style="text-align: left;">`);
        } else if (content.includes('--center--')) {
            return match.replace('--center--', '').replace(`<${tag}>`, `<${tag} style="text-align: center;">`);
        } else if (content.includes('--right--')) {
            return match.replace('--right--', '').replace(`<${tag}>`, `<${tag} style="text-align: right;">`);
        } else if (content.includes('--justify--')) {
            return match.replace('--justify--', '').replace(`<${tag}>`, `<${tag} style="text-align: justify;">`);
        }
        return match;
    });
}

function applyMermaid(textContent, id) {
    textContent = ensureString(textContent);
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

function applyNote(textContent) {
    textContent = ensureString(textContent);
    return textContent.replace(noteRegex, function (match, code, type, title, content) {
        if (code) return code;
        return `<div class="markdown-alert alert-${type}">
            <div class="alert-title">
                <i class="fa ${noteIcons[type]}"></i>
                ${title || type.charAt(0).toUpperCase() + type.slice(1)}
            </div>
            <div class="alert-content">${content}</div>
        </div>`;
    });
}

function applySuperscriptAndSubscript(textContent) {
    textContent = ensureString(textContent);
    textContent = textContent.replace(superscriptRegex, function (match, code, prefix, content) {
        if (code) return code;
        return `${prefix}<sup>${content}</sup>`;
    });
    
    textContent = textContent.replace(subscriptRegex, function (match, code, prefix, content) {
        if (code) return code;
        return `${prefix}<sub>${content}</sub>`;
    });
    
    return textContent;
}

function applyRuby(textContent) {
    textContent = ensureString(textContent);
    return textContent.replace(rubyRegex, function (match, codeBlock, reading, text) {
        if (codeBlock) return codeBlock;
        return `<ruby>${text}<rt>${reading}</rt></ruby>`;
    });
}

function applyAnchors(textContent) {
    textContent = ensureString(textContent);
    return textContent.replace(/<h([1-6])[^>]*id="([^"]*)"[^>]*>([^<]*)<\/h[1-6]>/g, function (match, level, id, content) {
        return `${match}<a name="${id}"></a>`;
    });
}

function applyGroupCode(textContent, id) {
    textContent = ensureString(textContent);
    if (textContent.match(codeTabRegex)) {
        let count = 0;
        textContent = textContent.replace(codeTabRegex, (match, codes) => {
            count++;
            let cleanCodes = codes.trim();
            let codeArray = cleanCodes.substring(5, cleanCodes.length - 6).split(/<\/pre>\n<pre>/g);
            
            let tabsHtml = '<ul class="nav nav-tabs code-tabs" role="tablist">';
            let contentHtml = '<div class="tab-content code-content">';
            
            for (let i in codeArray) {
                const langMatch = langCodeRegex.exec(codeArray[i]);
                if (langMatch) {
                    const lang = langMatch[1];
                    let codeContent = codeArray[i]
                        .replace(/<\/?pre[^>]*>/g, '')
                        .replace(/<code[^>]*>/g, '')
                        .replace(/<\/code>/g, '')
                        .trim();
                    
                    const isActive = i == 0 ? 'active' : '';
                    const tabId = `tab-${id}-${count}-${i}`;
                    const contentId = `content-${id}-${count}-${i}`;
                    
                    tabsHtml += `<li class="nav-item" role="presentation">
                        <button class="nav-link ${isActive}" id="${tabId}" data-bs-toggle="tab" data-bs-target="#${contentId}" type="button" role="tab" aria-controls="${contentId}" aria-selected="${i == 0}">
                            ${lang}
                        </button>
                    </li>`;
                    
                    contentHtml += `<div class="tab-pane fade show ${isActive}" id="${contentId}" role="tabpanel" aria-labelledby="${tabId}">
                        <pre><code class="${lang}">${codeContent}</code></pre>
                    </div>`;
                }
            }
            
            tabsHtml += '</ul>';
            contentHtml += '</div>';
            
            return `<div class="code-group-container">${tabsHtml}${contentHtml}</div>`;
        });
    }
    return textContent;
}

function applyExtendedTabs(textContent, id) {
    textContent = ensureString(textContent);
    return textContent.replace(extendedTabsRegex, function(match, content) {
        let tabCount = 0;
        let tabsHtml = '<ul class="nav nav-tabs extended-tabs-nav" role="tablist">';
        let contentHtml = '<div class="tab-content extended-tabs-content">';
        
        content = content.replace(tabRegex, function(tabMatch, title, tabContent) {
            const isActive = tabCount === 0 ? 'active' : '';
            const tabId = `extended-tab-${id}-${tabCount}`;
            const contentId = `extended-content-${id}-${tabCount}`;
            
            tabsHtml += `<li class="nav-item" role="presentation">
                <button class="nav-link ${isActive}" id="${tabId}" data-bs-toggle="tab" data-bs-target="#${contentId}" type="button" role="tab" aria-controls="${contentId}" aria-selected="${tabCount === 0}">
                    ${title.trim()}
                </button>
            </li>`;
            
            contentHtml += `<div class="tab-pane fade show ${isActive}" id="${contentId}" role="tabpanel" aria-labelledby="${tabId}">
                ${tabContent.trim()}
            </div>`;
            
            tabCount++;
            return '';
        });
        
        tabsHtml += '</ul>';
        contentHtml += '</div>';
        
        return `<div class="extended-tabs-container">${tabsHtml}${contentHtml}</div>`;
    });
}

function applySteps(textContent, id) {
    textContent = ensureString(textContent);
    return textContent.replace(stepsRegex, function(match, content) {
        let stepCount = 0;
        let tabsHtml = '<ul class="nav nav-tabs steps-nav" role="tablist">';
        let contentHtml = '<div class="tab-content steps-content">';
        let navigationHtml = '<div class="steps-navigation"><button class="btn btn-secondary step-prev" disabled>上一步</button><span class="step-indicator">第 <span class="current-step">1</span> 步，共 ';
        
        content = content.replace(stepRegex, function(stepMatch, stepContent) {
            const isActive = stepCount === 0 ? 'active' : '';
            const tabId = `step-tab-${id}-${stepCount}`;
            const contentId = `step-content-${id}-${stepCount}`;
            
            tabsHtml += `<li class="nav-item" role="presentation">
                <button class="nav-link ${isActive}" id="${tabId}" data-bs-toggle="tab" data-bs-target="#${contentId}" type="button" role="tab" aria-controls="${contentId}" aria-selected="${stepCount === 0}">
                    ${stepCount + 1}
                </button>
            </li>`;
            
            contentHtml += `<div class="tab-pane fade show ${isActive}" id="${contentId}" role="tabpanel" aria-labelledby="${tabId}">
                ${stepContent.trim()}
            </div>`;
            
            stepCount++;
            return '';
        });
        
        tabsHtml += '</ul>';
        contentHtml += '</div>';
        navigationHtml += `${stepCount} 步</span><button class="btn btn-primary step-next">下一步</button></div>`;
        
        return `<div class="steps-container">${tabsHtml}${contentHtml}${navigationHtml}</div>`;
    });
}

function applySpoiler(textContent, id) {
    textContent = ensureString(textContent);
    return textContent.replace(spoilerRegex, function(match, title, content) {
        const spoilerId = `spoiler-${id}-${Math.random().toString(36).substr(2, 9)}`;
        const cleanTitle = title.trim();
        const cleanContent = content.trim();
        
        return `<div class="spoiler">
            <button class="btn btn-outline-secondary extended-markdown-spoiler" type="button" data-bs-toggle="collapse" data-bs-target="#${spoilerId}" aria-expanded="false" aria-controls="${spoilerId}">
                <i class="fa fa-eye-slash"></i> ${cleanTitle}
            </button>
            <div class="collapse" id="${spoilerId}">
                <div class="spoiler-content">${cleanContent}</div>
            </div>
        </div>`;
    });
}

const ExtendedMarkdown = {
    parseRaw: function (textContent, callback) {
        if (!textContent || typeof textContent !== 'string') {
            console.warn('ExtendedMarkdown: Invalid textContent received:', typeof textContent);
            return callback(null, '');
        }

        try {
            const postId = Math.random().toString(36).substr(2, 9);
            
            textContent = applyColor(textContent);
            textContent = applyTextHeaders(textContent);
            textContent = applyTooltips(textContent);
            textContent = applyAlignments(textContent);
            textContent = applyNote(textContent);
            textContent = applySpoiler(textContent, postId);
            textContent = applyExtendedTabs(textContent, postId);
            textContent = applySteps(textContent, postId);
            textContent = applyGroupCode(textContent, postId);
            textContent = applyMermaid(textContent, postId);
            textContent = applyRuby(textContent);
            textContent = applySuperscriptAndSubscript(textContent);
            textContent = applyAnchors(textContent);

            callback(null, textContent);
        } catch (error) {
            console.error('ExtendedMarkdown parsing error:', error);
            callback(null, textContent || '');
        }
    },

    parseSignature: function (textContent, callback) {
        this.parseRaw(textContent, callback);
    },

    parseAboutMe: function (textContent, callback) {
        this.parseRaw(textContent, callback);
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
        config.allowedAttributes['div'].push('class', 'id');
        config.allowedAttributes['pre'] = config.allowedAttributes['pre'] || [];
        config.allowedAttributes['pre'].push('class', 'id');
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

