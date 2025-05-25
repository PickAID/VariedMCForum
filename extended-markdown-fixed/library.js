'use strict';

const slugify = require.main.require('./src/slugify');

const textHeaderRegex = /<p dir="auto">#([a-zA-Z0-9-_]+)\(([^)]+)\)<\/p>/g;
const tooltipRegex = /(<code.*?>.*?<\/code>)|°(.+?)°\((.+?)\)/g;

const codeTabRegex = /(?:<p dir="auto">={3}group<\/p>\n)((?:<pre><code class=".+">[^]*?<\/code><\/pre>\n){2,})(?:<p dir="auto">={3}<\/p>)/g;
const langCodeRegex = /<code class="(.+)">/;

const colorRegex = /(<code.*>*?[^]<\/code>)|%\((#[\dA-Fa-f]{6}|rgb\(\d{1,3}, ?\d{1,3}, ?\d{1,3}\)|[a-z]+)\)\[(.+?)]/g;

const paragraphAndHeadingRegex = /<(h[1-6]|p dir="auto")>([^]*?)<\/(h[1-6]|p)>/g;

const noteRegex = /<p dir="auto">!!! (info|warning|important) \[([^\]]*)\]: ((.|<br \/>\n)*)<\/p>/g;

const superscriptRegex = /([^\s`<>])\^([^\s`<>^]+)\^/g;
const subscriptRegex = /([^\s`<>])~([^\s`<>~]+)~/g;

const rubyRegex = /@([^@(]+)\(([^)]+)\)/g;

const tabsRegex = /(?:<p dir="auto">)?\[tabs\](?:<\/p>)?([\s\S]*?)(?:<p dir="auto">)?\[\/tabs\](?:<\/p>)?/gi;
const tabRegex = /(?:<p dir="auto">)?\[tab=([^\]]+)\](?:<\/p>)?([\s\S]*?)(?=(?:<p dir="auto">)?\[tab=|(?:<p dir="auto">)?\[\/tabs\]|$)/gi;

const stepsRegex = /(?:<p dir="auto">)?\[steps\](?:<\/p>)?([\s\S]*?)(?:<p dir="auto">)?\[\/steps\](?:<\/p>)?/gi;
const stepRegex = /(?:<p dir="auto">)?\[step\](?:<\/p>)?([\s\S]*?)(?=(?:<p dir="auto">)?\[step\]|(?:<p dir="auto">)?\[\/steps\]|$)/gi;

const spoilerRegex = /(?:<p dir="auto">)?\[spoiler=([^\]]+)\](?:<\/p>)?([\s\S]*?)(?:<p dir="auto">)?\[\/spoiler\](?:<\/p>)?/gi;

const noteIcons = {
    info: 'fa-info-circle',
    warning: 'fa-exclamation-triangle',
    important: 'fa-exclamation-circle'
};

function cleanContent(content) {
    return content
        .replace(/^<p dir="auto">\s*/, '')
        .replace(/\s*<\/p>$/, '')
        .replace(/^<p>\s*/, '')
        .replace(/\s*<\/p>$/, '')
        .replace(/^\s+/, '')
        .replace(/\s+$/, '')
        .trim();
}

const ExtendedMarkdown = {
    async parsePost(data) {
        if (data && data.postData && data.postData.content) {
            data.postData.content = applyTabs(data.postData.content, data.postData.pid);
            data.postData.content = applySteps(data.postData.content, data.postData.pid);
            data.postData.content = applyCollapsible(data.postData.content, data.postData.pid);
            data.postData.content = await applyExtendedMarkdown(data.postData.content);
            data.postData.content = applyGroupCode(data.postData.content, data.postData.pid);
        }
        return data;
    },

    async parseSignature(data) {
        if (data && data.userData && data.userData.signature) {
            data.userData.signature = applyTabs(data.userData.signature, "sig");
            data.userData.signature = applySteps(data.userData.signature, "sig");
            data.userData.signature = applyCollapsible(data.userData.signature, "sig");
            data.userData.signature = await applyExtendedMarkdown(data.userData.signature);
            data.userData.signature = applyGroupCode(data.userData.signature, "sig");
        }
        return data;
    },

    async parseAboutMe(data) {
        if (data) {
            data = applyTabs(data, "about");
            data = applySteps(data, "about");
            data = applyCollapsible(data, "about");
            data = await applyExtendedMarkdown(data);
            data = applyGroupCode(data, "about");
        }
        return data;
    },

    async parseRaw(data) {
        if (data) {
            data = applyTabs(data, "preview");
            data = applySteps(data, "preview");
            data = applyCollapsible(data, "preview");
            data = await applyExtendedMarkdown(data);
            data = applyGroupCode(data, "preview");
        }
        return data;
    },

    async registerFormatting(payload) {
        const formatting = [
            { name: "color", className: "fa fa-eyedropper", title: "[[extendedmarkdown:composer.formatting.color]]" },
            { name: "left", className: "fa fa-align-left", title: "[[extendedmarkdown:composer.formatting.left]]" },
            { name: "center", className: "fa fa-align-center", title: "[[extendedmarkdown:composer.formatting.center]]" },
            { name: "right", className: "fa fa-align-right", title: "[[extendedmarkdown:composer.formatting.right]]" },
            { name: "justify", className: "fa fa-align-justify", title: "[[extendedmarkdown:composer.formatting.justify]]" },
            { name: "textheader", className: "fa fa-header", title: "[[extendedmarkdown:composer.formatting.textheader]]" },
            { name: "groupedcode", className: "fa fa-file-code-o", title: "[[extendedmarkdown:composer.formatting.groupedcode]]" },
            { name: "bubbleinfo", className: "fa fa-info-circle", title: "[[extendedmarkdown:composer.formatting.bubbleinfo]]" },
            { name: "noteinfo", className: "fa fa-info", title: "[[extendedmarkdown:composer.formatting.noteinfo]]" },
            { name: "notewarning", className: "fa fa-exclamation-triangle", title: "[[extendedmarkdown:composer.formatting.notewarning]]" },
            { name: "noteimportant", className: "fa fa-exclamation-circle", title: "[[extendedmarkdown:composer.formatting.noteimportant]]" },
            { name: "superscript", className: "fa fa-superscript", title: "[[extendedmarkdown:composer.formatting.superscript]]" },
            { name: "subscript", className: "fa fa-subscript", title: "[[extendedmarkdown:composer.formatting.subscript]]" },
            { name: "tabs", className: "fa fa-folder-open", title: "插入标签页" },
            { name: "steps", className: "fa fa-tasks", title: "插入步骤" },
            { name: "collapsible", className: "fa fa-compress", title: "插入折叠框" },
            { name: "ruby", className: "fa fa-language", title: "插入音注标记" }
        ];

        payload.options = payload.options.concat(formatting);
        return payload;
    },

    async sanitizerConfig(config) {
        config.allowedTags.push('div', 'span', 'button', 'ul', 'li', 'nav', 'ruby', 'rt', 'rp');
        config.allowedAttributes['*'].push('data-bs-toggle', 'data-bs-target', 'data-target', 'data-toggle', 'aria-expanded', 'aria-controls', 'role', 'type');
        config.allowedAttributes['*'].push('aria-labelledby', 'aria-selected', 'tabindex');
        config.allowedClasses['*'].push('nav', 'nav-tabs', 'nav-item', 'nav-link', 'tab-content', 'tab-pane', 'fade', 'show', 'active');
        config.allowedClasses['*'].push('extended-tabs-container', 'steps-container', 'code-group-container');
        config.allowedClasses['*'].push('tab-content-wrapper', 'steps-navigation', 'step-prev', 'step-next', 'step-indicator');
        config.allowedClasses['*'].push('current-step', 'total-steps', 'step-number');
        config.allowedClasses['*'].push('collapsible-wrapper', 'extended-markdown-collapsible', 'collapse-icon', 'collapsible-content');
        config.allowedClasses['*'].push('btn', 'btn-outline-primary', 'btn-outline-secondary', 'collapse', 'card', 'card-body', 'mt-2');
        config.allowedClasses['*'].push('alert', 'alert-info', 'alert-warning', 'alert-important');
        return config;
    }
};

function createTabComponent(type, items, uniqueId) {
    if (items.length === 0) return '';
    
    const containerClass = type === 'code-group' ? 'code-group-container' : 'extended-tabs-container';
    
    let navTabs = `<ul class="nav nav-tabs" role="tablist">`;
    let tabContent = `<div class="tab-content">`;
    
    items.forEach((item, index) => {
        const tabId = `${uniqueId}-${index}`;
        const isActive = index === 0;
        
        navTabs += `<li class="nav-item" role="presentation">
            <button class="nav-link${isActive ? ' active' : ''}" 
                    id="${tabId}-tab" 
                    data-bs-toggle="tab" 
                    data-bs-target="#${tabId}" 
                    type="button" 
                    role="tab" 
                    aria-controls="${tabId}" 
                    aria-selected="${isActive}">
                ${item.label}
            </button>
        </li>`;
        
        const cleanedContent = cleanContent(item.content);
        
        tabContent += `<div class="tab-pane${isActive ? ' show active' : ''}" 
                           id="${tabId}" 
                           role="tabpanel" 
                           aria-labelledby="${tabId}-tab">
            ${cleanedContent}
        </div>`;
    });
    
    navTabs += '</ul>';
    tabContent += '</div>';
    
    return `<div class="${containerClass}">${navTabs}${tabContent}</div>`;
}

function createStepComponent(items, uniqueId) {
    if (items.length === 0) return '';
    
    let navTabs = `<ul class="nav nav-tabs" role="tablist">`;
    let tabContent = `<div class="tab-content">`;
    
    items.forEach((item, index) => {
        const tabId = `${uniqueId}-${index}`;
        const isActive = index === 0;
        
        navTabs += `<li class="nav-item" role="presentation">
            <button class="nav-link${isActive ? ' active' : ''}" 
                    id="${tabId}-tab" 
                    data-bs-toggle="tab" 
                    data-bs-target="#${tabId}" 
                    type="button" 
                    role="tab" 
                    aria-controls="${tabId}" 
                    aria-selected="${isActive}">
                步骤 ${index + 1}
            </button>
        </li>`;
        
        const cleanedContent = cleanContent(item.content);
        
        tabContent += `<div class="tab-pane${isActive ? ' show active' : ''}" 
                           id="${tabId}" 
                           role="tabpanel" 
                           aria-labelledby="${tabId}-tab">
            ${cleanedContent}
        </div>`;
    });
    
    navTabs += '</ul>';
    tabContent += '</div>';
    
    const navigation = `<div class="steps-navigation">
        <button class="btn btn-secondary step-prev" disabled>
            <i class="fa fa-chevron-left"></i> 上一步
        </button>
        <span class="step-indicator">
            <span class="current-step">1</span> / <span class="total-steps">${items.length}</span>
        </span>
        <button class="btn btn-primary step-next">
            下一步 <i class="fa fa-chevron-right"></i>
        </button>
    </div>`;
    
    return `<div class="steps-container">${navTabs}${tabContent}${navigation}</div>`;
}

function applyTabs(textContent, id) {
    if (!textContent.match(tabsRegex)) return textContent;
    
    let count = 0;
    return textContent.replace(tabsRegex, (match, content) => {
        const items = [];
        const cleanContent = content.trim();
        
        tabRegex.lastIndex = 0;
        let tabMatch;
        while ((tabMatch = tabRegex.exec(cleanContent)) !== null) {
            const tabTitle = tabMatch[1].trim();
            const tabContent = tabMatch[2].trim();
            
            items.push({
                label: tabTitle,
                content: tabContent
            });
        }
        
        if (items.length === 0) return match;
        
        count++;
        return createTabComponent('extended-tabs', items, `tabs-${count}-${id}`);
    });
}

function applySteps(textContent, id) {
    if (!textContent.match(stepsRegex)) return textContent;
    
    let count = 0;
    return textContent.replace(stepsRegex, (match, content) => {
        const items = [];
        const cleanContent = content.trim();
        
        stepRegex.lastIndex = 0;
        let stepMatch;
        while ((stepMatch = stepRegex.exec(cleanContent)) !== null) {
            const stepContent = stepMatch[1].trim();
            
            items.push({
                content: stepContent
            });
        }
        
        if (items.length === 0) return match;
        
        count++;
        return createStepComponent(items, `steps-${count}-${id}`);
    });
}

function applyCollapsible(textContent, id) {
    if (!textContent.match(spoilerRegex)) return textContent;
    
    let count = 0;
    return textContent.replace(spoilerRegex, (match, title, content) => {
        count++;
        const spoilerId = `spoiler-${count}-${id}`;
        const cleanedContent = cleanContent(content);
        
        return `<div class="collapsible-wrapper">
            <button class="extended-markdown-collapsible" type="button" 
                    data-bs-toggle="collapse" data-bs-target="#${spoilerId}" 
                    aria-expanded="false" aria-controls="${spoilerId}">
                <i class="fa fa-chevron-right collapse-icon"></i>
                ${title}
            </button>
            <div class="collapse" id="${spoilerId}">
                <div class="collapsible-content">${cleanedContent}</div>
            </div>
        </div>`;
    });
}

async function applyExtendedMarkdown(textContent) {
    if (textContent.match(rubyRegex)) {
        textContent = textContent.replace(rubyRegex, '<ruby>$1<rt>$2</rt></ruby>');
    }
    
    if (textContent.match(textHeaderRegex)) {
        textContent = applyTextHeaders(textContent);
    }
    
    if (textContent.match(tooltipRegex)) {
        textContent = applyTooltips(textContent);
    }
    
    if (textContent.match(colorRegex)) {
        textContent = applyColors(textContent);
    }
    
    if (textContent.match(noteRegex)) {
        textContent = applyNotes(textContent);
    }
    
    if (textContent.match(paragraphAndHeadingRegex)) {
        textContent = applyAnchors(textContent);
    }
    
    if (textContent.match(superscriptRegex)) {
        textContent = applySuperscript(textContent);
    }
    
    if (textContent.match(subscriptRegex)) {
        textContent = applySubscript(textContent);
    }
    
    return textContent;
}

function applyTextHeaders(textContent) {
    return textContent.replace(textHeaderRegex, function (match, id, text) {
        return `<span id="${id}">${text}</span>`;
    });
}

function applyTooltips(textContent) {
    return textContent.replace(tooltipRegex, function (match, code, text, tooltipText) {
        if (typeof (code) !== "undefined") {
            return code;
        }
        
        if (text.trim() === "") {
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

function applySuperscript(textContent) {
    return textContent.replace(superscriptRegex, '$1<sup>$2</sup>');
}

function applySubscript(textContent) {
    return textContent.replace(subscriptRegex, '$1<sub>$2</sub>');
}

function applyNotes(textContent) {
    return textContent.replace(noteRegex, function (match, type, title, content) {
        const icon = noteIcons[type] || 'fa-info-circle';
        return `<div class="alert alert-${type}" role="alert">
            <h6><i class="fa ${icon}"></i> ${title || capitalizeFirstLetter(type)}</h6>
            <div>${content}</div>
        </div>`;
    });
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

function capitalizeFirstLetter(name) {
    return name.charAt(0).toUpperCase() + name.slice(1);
}

function generateAnchorFromHeading(heading) {
    return `<a class="anchor-offset" name="${slugify(heading)}"></a>`;
}

module.exports = ExtendedMarkdown;

