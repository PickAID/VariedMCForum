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

function applyTextHeaders(textContent) {
    return textContent.replace(textHeaderRegex, function (match, id, content) {
        return `<div class="text-header" id="${id}">${content}</div>`;
    });
}

function applyTooltips(textContent) {
    return textContent.replace(tooltipRegex, function (match, codeBlock, text, tooltip) {
        if (codeBlock) {
            return codeBlock;
        }
        return `<span class="extended-markdown-tooltip" data-bs-toggle="tooltip" data-bs-placement="top" title="${tooltip}">${text}</span>`;
    });
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

function applySteps(textContent, id) {
    return textContent.replace(stepsRegex, function (match, stepsContent) {
        const cleanStepsContent = cleanContent(stepsContent);
        let stepMatches = [];
        let stepMatch;
        
        const stepRegexForMatch = /(?:<p dir="auto">)?\[step\](?:<\/p>)?([\s\S]*?)(?=(?:<p dir="auto">)?\[step\]|$)/gi;
        while ((stepMatch = stepRegexForMatch.exec(cleanStepsContent)) !== null) {
            const stepContent = stepMatch[1]
                .replace(/^[\s\n\r]*/, '')
                .replace(/[\s\n\r]*$/, '')
                .trim();
            
            if (stepContent) {
                stepMatches.push(cleanContent(stepContent));
            }
        }
        
        if (stepMatches.length === 0) return match;
        
        const stepsId = `steps-${id}-${Math.random().toString(36).substr(2, 9)}`;
        
        let stepsHeader = `<div class="steps-header">
            <div class="steps-counter">
                <span class="current-step">1</span> / <span class="total-steps">${stepMatches.length}</span>
            </div>
            <div class="steps-navigation">
                <button class="btn step-prev" disabled>上一步</button>
                <button class="btn step-next">下一步</button>
            </div>
        </div>`;
        
        let items = stepMatches.map((content, index) => ({
            label: `步骤 ${index + 1}`,
            content: content
        }));
        
        const tabsContent = createTabComponent('', items, stepsId);
        
        return `<div class="steps-container">${stepsHeader}${tabsContent}</div>`;
    });
}

function applyTabs(textContent, id) {
    return textContent.replace(tabsRegex, function (match, tabsContent) {
        const cleanTabsContent = cleanContent(tabsContent);
        let tabMatches = [];
        let tabMatch;
        
        const tabRegexForMatch = /(?:<p dir="auto">)?\[tab=([^\]]+)\](?:<\/p>)?([\s\S]*?)(?=(?:<p dir="auto">)?\[tab=|$)/gi;
        while ((tabMatch = tabRegexForMatch.exec(cleanTabsContent)) !== null) {
            const tabContent = tabMatch[2]
                .replace(/^[\s\n\r]*/, '')
                .replace(/[\s\n\r]*$/, '')
                .trim();
                
            if (tabContent) {
                tabMatches.push({
                    title: tabMatch[1].trim(),
                    content: cleanContent(tabContent)
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

function applySpoiler(textContent, id) {
    return textContent.replace(spoilerRegex, function (match, title, content) {
        const cleanedContent = cleanContent(content);
        const spoilerId = `spoiler-${id}-${Math.random().toString(36).substr(2, 9)}`;
        
        return `<div class="collapsible-wrapper">
            <button class="btn btn-outline-secondary extended-markdown-collapsible" 
                    type="button" 
                    data-bs-toggle="collapse" 
                    data-bs-target="#${spoilerId}" 
                    aria-expanded="false" 
                    aria-controls="${spoilerId}">
                <i class="fa fa-chevron-right collapse-icon"></i>
                ${title}
            </button>
            <div class="collapse collapsible-content" id="${spoilerId}">
                <div class="card-body">
                    ${cleanedContent}
                </div>
            </div>
        </div>`;
    });
}

function applyColors(textContent) {
    return textContent.replace(colorRegex, function (match, codeBlock, color, text) {
        if (codeBlock) {
            return codeBlock;
        }
        return `<span style="color: ${color};">${text}</span>`;
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

const ExtendedMarkdown = {
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

    registerFormatting: function (payload, callback) {
        var formatting = payload.options;

        if (formatting) {
            formatting.push(
                { name: 'text-header', className: 'fa fa-header', title: 'Text Header', shortcut: 'Ctrl+Shift+H' },
                { name: 'groupedcode', className: 'fa fa-code', title: 'Grouped Code Blocks', shortcut: 'Ctrl+Shift+G' },
                { name: 'bubbleinfo', className: 'fa fa-info-circle', title: 'Tooltip', shortcut: 'Ctrl+Shift+I' },
                { name: 'spoiler', className: 'fa fa-eye-slash', title: 'Spoiler', shortcut: 'Ctrl+Shift+S' },
                { name: 'noteinfo', className: 'fa fa-info', title: 'Info Note', shortcut: 'Ctrl+Shift+1' },
                { name: 'notewarning', className: 'fa fa-exclamation-triangle', title: 'Warning Note', shortcut: 'Ctrl+Shift+2' },
                { name: 'noteimportant', className: 'fa fa-exclamation-circle', title: 'Important Note', shortcut: 'Ctrl+Shift+3' },
                { name: 'tabs', className: 'fa fa-folder', title: 'Tabs', shortcut: 'Ctrl+Shift+T' },
                { name: 'steps', className: 'fa fa-list-ol', title: 'Steps', shortcut: 'Ctrl+Shift+O' },
                { name: 'superscript', className: 'fa fa-superscript', title: 'Superscript', shortcut: 'Ctrl+Shift+=' },
                { name: 'subscript', className: 'fa fa-subscript', title: 'Subscript', shortcut: 'Ctrl+Shift+-' },
                { name: 'collapsible', className: 'fa fa-compress', title: 'Collapsible Section', shortcut: 'Ctrl+Shift+C' }
            );
        }

        callback(null, payload);
    }
};

module.exports = ExtendedMarkdown;

