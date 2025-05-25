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

const extendedTabsRegex = /(?:<p dir="auto">)?\[tabs\](?:<\/p>)?([\s\S]*?)(?:<p dir="auto">)?\[\/tabs\](?:<\/p>)?/gi;
const tabRegex = /(?:<p dir="auto">)?\[tab=([^\]]+)\](?:<\/p>)?([\s\S]*?)(?=(?:<p dir="auto">)?\[tab=|(?:<p dir="auto">)?\[\/tabs\]|$)/gi;

const stepsRegex = /(?:<p dir="auto">)?\[steps\](?:<\/p>)?([\s\S]*?)(?:<p dir="auto">)?\[\/steps\](?:<\/p>)?/gi;
const stepRegex = /(?:<p dir="auto">)?\[step\](?:<\/p>)?([\s\S]*?)(?=(?:<p dir="auto">)?\[step\]|(?:<p dir="auto">)?\[\/steps\]|$)/gi;

const spoilerRegex = /(?:<p dir="auto">)?\[spoiler=([^\]]+)\](?:<\/p>)?(?:<br\s*\/?>|\s)*\n?([\s\S]*?)(?:<p dir="auto">)?\[\/spoiler\](?:<\/p>)?/gi;

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

function applyTextHeaders(textContent) {
    return textContent.replace(textHeaderRegex, function (match, anchorId, text) {
        return `<div class="text-header" id="${anchorId}">${text}</div>`;
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
            label: `步骤 ${index + 1}`,
            content: content
        }));
        
        const tabsContent = createTabComponent('', items, stepsId);
        
        let stepsHeader = `<div class="steps-header">
            <div class="steps-counter">
                <span class="current-step">1</span> / <span class="total-steps">${stepMatches.length}</span>
            </div>
            <div class="steps-navigation">
                <button class="btn step-prev" disabled>上一步</button>
                <button class="btn step-next">下一步</button>
            </div>
        </div>`;
        
        return `<div class="steps-container">${tabsContent}${stepsHeader}</div>`;
    });
}

function applySpoiler(textContent, id) {
    return textContent.replace(spoilerRegex, function (match, title, content) {
        const cleanTitle = title.trim();
        const cleanContent = content
            .replace(/^<br\s*\/?>/, '')
            .replace(/<br\s*\/?>$/, '')
            .replace(/^\n+/, '')
            .replace(/\n+$/, '')
            .trim();
        
        const spoilerId = `spoiler-${id}-${Math.random().toString(36).substr(2, 9)}`;
        
        return `<div class="collapsible-wrapper">
            <button class="extended-markdown-collapsible" 
                    type="button" 
                    data-bs-toggle="collapse" 
                    data-bs-target="#${spoilerId}" 
                    aria-expanded="false" 
                    aria-controls="${spoilerId}">
                <i class="fa fa-chevron-right collapse-icon" aria-hidden="true"></i>
                ${cleanTitle}
            </button>
            <div class="collapse collapsible-content" id="${spoilerId}">
                <div class="card-body">${cleanContent}</div>
            </div>
        </div>`;
    });
}

function applyRuby(textContent) {
    return textContent.replace(rubyRegex, '<ruby>$1<rt>$2</rt></ruby>');
}

function applySuperscriptAndSubscript(textContent) {
    textContent = textContent.replace(superscriptRegex, '$1<sup>$2</sup>');
    return textContent.replace(subscriptRegex, '$1<sub>$2</sub>');
}

function applyNotes(textContent) {
    return textContent.replace(noteRegex, function (match, type, title, content) {
        const icon = noteIcons[type] || 'fa-info-circle';
        return `<div class="markdown-alert markdown-alert-${type}" role="alert">
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

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function generateAnchorFromHeading(heading) {
    return `<a class="anchor-offset" name="${slugify(heading)}"></a>`;
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
            data.postData.content = await applyExtendedMarkdown(data.postData.content);
            data.postData.content = applyGroupCode(data.postData.content, data.postData.pid);
        }
        return data;
    },

    async parseSignature(data) {
        if (data && data.userData && data.userData.signature) {
            data.userData.signature = applyTabs(data.userData.signature, "sig");
            data.userData.signature = applySteps(data.userData.signature, "sig");
            data.userData.signature = applySpoiler(data.userData.signature, "sig");
            data.userData.signature = await applyExtendedMarkdown(data.userData.signature);
            data.userData.signature = applyGroupCode(data.userData.signature, "sig");
        }
        return data;
    },

    async parseAboutMe(data) {
        if (data) {
            data = applyTabs(data, "about");
            data = applySteps(data, "about");
            data = applySpoiler(data, "about");
            data = await applyExtendedMarkdown(data);
            data = applyGroupCode(data, "about");
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
        textContent = applyGroupCode(textContent, postId);
        textContent = applyRuby(textContent);
        textContent = applySuperscriptAndSubscript(textContent);
        textContent = applyAnchors(textContent);

        callback(null, textContent);
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
            { name: "collapsible", className: "fa fa-eye-slash", title: "[[extendedmarkdown:composer.formatting.spoiler]]" },
            { name: "noteinfo", className: "fa fa-info", title: "[[extendedmarkdown:composer.formatting.noteinfo]]" },
            { name: "notewarning", className: "fa fa-exclamation-triangle", title: "[[extendedmarkdown:composer.formatting.notewarning]]" },
            { name: "noteimportant", className: "fa fa-exclamation-circle", title: "[[extendedmarkdown:composer.formatting.noteimportant]]" }
        ];

        payload.options = payload.options.concat(formatting);

        return payload;
    },
    
    async sanitizerConfig(config) {
        config.allowedAttributes['a'].push('name');
        return config;
    }
};

module.exports = ExtendedMarkdown;

