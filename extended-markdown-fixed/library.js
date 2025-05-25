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

// 使用更简单的BBCode风格语法
const tabsRegex = /(?:<p dir="auto">)?\[tabs\](?:<\/p>)?([\s\S]*?)(?:<p dir="auto">)?\[\/tabs\](?:<\/p>)?/gi;
const tabRegex = /(?:<p dir="auto">)?\[tab=([^\]]+)\](?:<\/p>)?([\s\S]*?)(?=(?:<p dir="auto">)?\[tab=|(?:<p dir="auto">)?\[\/tabs\])/gi;

const stepsRegex = /(?:<p dir="auto">)?\[steps\](?:<\/p>)?([\s\S]*?)(?:<p dir="auto">)?\[\/steps\](?:<\/p>)?/gi;
const stepRegex = /(?:<p dir="auto">)?\[step=([^\]]+)\](?:<\/p>)?([\s\S]*?)(?=(?:<p dir="auto">)?\[step=|(?:<p dir="auto">)?\[\/steps\])/gi;

const collapsibleRegex = /(?:<p dir="auto">)?\[spoiler=([^\]]+)\](?:<\/p>)?([\s\S]*?)(?:<p dir="auto">)?\[\/spoiler\](?:<\/p>)?/gi;

const noteIcons = {
    info: 'fa-info-circle',
    warning: 'fa-exclamation-triangle',
    important: 'fa-exclamation-circle'
};

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
            { name: "collapsible", className: "fa fa-compress", title: "插入折叠框" }
        ];

        payload.options = payload.options.concat(formatting);
        return payload;
    },

    async sanitizerConfig(config) {
        config.allowedTags.push('div', 'span', 'button', 'ul', 'li', 'nav');
        config.allowedAttributes['*'].push('data-bs-toggle', 'data-bs-target', 'data-target', 'data-toggle', 'aria-expanded', 'aria-controls', 'role', 'type');
        config.allowedClasses['*'] = ['*'];
        config.allowedAttributes['a'].push('name');
        return config;
    }
};

function createTabComponent(componentType, items, id, extraContent = '') {
    if (!items || items.length === 0) return '';
    
    const componentId = `${componentType}-${id}`;
    const containerClass = componentType === 'codegroup' ? 'code-group-container' : 
                          componentType === 'steps' ? 'steps-container' : 'extended-tabs-container';
    
    let html = `<div class="${containerClass}">
        <ul class="nav nav-tabs ${componentType}-nav" role="tablist">`;
    
    items.forEach((item, index) => {
        const isActive = index === 0;
        const tabId = `${componentId}-tab-${index}`;
        const paneId = `${componentId}-pane-${index}`;
        
        html += `<li class="nav-item" role="presentation">
            <button class="nav-link ${isActive ? 'active' : ''}" 
                    id="${tabId}" 
                    data-bs-toggle="tab" 
                    data-bs-target="#${paneId}" 
                    type="button" 
                    role="tab" 
                    aria-controls="${paneId}" 
                    aria-selected="${isActive}">
                ${item.label}
            </button>
        </li>`;
    });
    
    html += `</ul><div class="tab-content ${componentType}-content">`;
    
    items.forEach((item, index) => {
        const isActive = index === 0;
        const paneId = `${componentId}-pane-${index}`;
        const tabId = `${componentId}-tab-${index}`;
        
        html += `<div class="tab-pane fade ${isActive ? 'show active' : ''}" 
                     id="${paneId}" 
                     role="tabpanel" 
                     aria-labelledby="${tabId}">
            ${item.content}
        </div>`;
    });
    
    html += `</div>${extraContent}</div>`;
    return html;
}

function applyExtendedMarkdown(textContent) {
    if (textContent.match(noteRegex)) {
        textContent = textContent.replace(noteRegex, function (match, type, title, text) {
            return `<div class="admonition ${type.toLowerCase()}"><p class="admonition-title"><i class="fa ${noteIcons[type.toLowerCase()]}"></i>${title}</p><p>${text}</p></div>`;
        });
    }

    if (textContent.match(textHeaderRegex)) {
        textContent = textContent.replace(textHeaderRegex, function (match, anchorId, text) {
            return `<h2 class="text-header"><a class="anchor-offset" name="${anchorId}"></a>${text}</h2>`;
        });
    }

    if (textContent.match(tooltipRegex)) {
        textContent = textContent.replace(tooltipRegex, function (match, code, text, tooltipText) {
            if (typeof (code) !== "undefined") {
                return code;
            } else if ("fa-info" === text) {
                return `<i class="fa fa-info-circle extended-markdown-tooltip" data-bs-toggle="tooltip" data-bs-placement="top" title="${tooltipText}"></i>`;
            } else {
                return `<span class="extended-markdown-tooltip" data-bs-toggle="tooltip" data-bs-placement="top" title="${tooltipText}">${text}</span>`;
            }
        });
    }

    if (textContent.match(colorRegex)) {
        textContent = textContent.replace(colorRegex, function (match, code, color, text) {
            if (typeof (code) !== "undefined") {
                return code;
            }
            return `<span style="color: ${color};">${text}</span>`;
        });
    }

    if (textContent.match(paragraphAndHeadingRegex)) {
        textContent = textContent.replace(paragraphAndHeadingRegex, function (match, tag, text, closeTag) {
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

    if (textContent.match(superscriptRegex)) {
        textContent = textContent.replace(superscriptRegex, '$1<sup>$2</sup>');
    }

    if (textContent.match(subscriptRegex)) {
        textContent = textContent.replace(subscriptRegex, '$1<sub>$2</sub>');
    }

    return textContent;
}

function applyGroupCode(textContent, id) {
    if (!textContent.match(codeTabRegex)) return textContent;
    
    let count = 0;
    return textContent.replace(codeTabRegex, (match, codes) => {
        const items = [];
        let cleanCodes = codes.trim();
        let codeArray = cleanCodes.substring(5, cleanCodes.length - 6).split(/<\/pre>\n<pre>/g);
        
        for (let i = 0; i < codeArray.length; i++) {
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
        return createTabComponent('codegroup', items, `cg-${count}-${id}`);
    });
}

function applyTabs(textContent, id) {
    if (!textContent.match(tabsRegex)) return textContent;
    
    let count = 0;
    return textContent.replace(tabsRegex, (match, content) => {
        const tabs = [];
        const cleanContent = content.trim();
        
        tabRegex.lastIndex = 0;
        let tabMatch;
        while ((tabMatch = tabRegex.exec(cleanContent)) !== null) {
            const tabTitle = tabMatch[1].trim();
            const tabContent = tabMatch[2].trim().replace(/^<p dir="auto">|<\/p>$/g, '');
            
            tabs.push({
                label: tabTitle,
                content: `<div class="tab-content-body">${tabContent}</div>`
            });
        }
        
        if (tabs.length === 0) return match;
        
        count++;
        return createTabComponent('tabs', tabs, `tb-${count}-${id}`);
    });
}

function applySteps(textContent, id) {
    if (!textContent.match(stepsRegex)) return textContent;
    
    let count = 0;
    return textContent.replace(stepsRegex, (match, content) => {
        const steps = [];
        const cleanContent = content.trim();
        
        stepRegex.lastIndex = 0;
        let stepMatch;
        while ((stepMatch = stepRegex.exec(cleanContent)) !== null) {
            const stepNumber = stepMatch[1].trim();
            const stepContent = stepMatch[2].trim().replace(/^<p dir="auto">|<\/p>$/g, '');
            
            steps.push({
                label: `<span class="step-number">${stepNumber}</span> 步骤 ${stepNumber}`,
                content: `<div class="step-content-wrapper">
                    <div class="step-header">
                        <h4><span class="step-badge">${stepNumber}</span> 步骤 ${stepNumber}</h4>
                    </div>
                    <div class="step-body">${stepContent}</div>
                </div>`
            });
        }
        
        if (steps.length === 0) return match;
        
        const extraContent = `<div class="steps-navigation">
            <button class="btn btn-outline-secondary step-prev" type="button" disabled>
                <i class="fa fa-chevron-left"></i> 上一步
            </button>
            <span class="step-indicator">
                <span class="current-step">1</span> / <span class="total-steps">${steps.length}</span>
            </span>
            <button class="btn btn-outline-secondary step-next" type="button">
                下一步 <i class="fa fa-chevron-right"></i>
            </button>
        </div>`;
        
        count++;
        return createTabComponent('steps', steps, `st-${count}-${id}`, extraContent);
    });
}

function applyCollapsible(textContent, id) {
    return textContent.replace(collapsibleRegex, (match, title, content) => {
        const collapseId = `collapse-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const cleanContent = content.trim().replace(/^<p dir="auto">|<\/p>$/g, '');
        
        return `<div class="collapsible-wrapper">
            <button class="btn btn-outline-primary extended-markdown-collapsible" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="false">
                <i class="fa fa-chevron-right collapse-icon"></i> ${title.trim()}
            </button>
            <div class="collapse" id="${collapseId}">
                <div class="card card-body mt-2 collapsible-content">${cleanContent}</div>
            </div>
        </div>`;
    });
}

function capitalizeFirstLetter(name) {
    return name.charAt(0).toUpperCase() + name.slice(1);
}

function generateAnchorFromHeading(heading) {
    return `<a class="anchor-offset" name="${slugify(heading)}"></a>`;
}

module.exports = ExtendedMarkdown;

