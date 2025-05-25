'use strict';

const slugify = require.main.require('./src/slugify');

const textHeaderRegex = /<p dir="auto">#([a-zA-Z0-9-_]+)\(([^)]+)\)<\/p>/g;
const tooltipRegex = /(<code.*?>.*?<\/code>)|°(.+?)°\((.+?)\)/g;

const codeTabRegex = /(?:<p dir="auto">={3}group<\/p>\n)((?:<pre><code class=".+">[^]*?<\/code><\/pre>\n){2,})(?:<p dir="auto">={3}<\/p>)/g;
const langCodeRegex = /<code class="(.+)">/;

const colorRegex = /(<code.*>*?[^]<\/code>)|%\((#[\dA-Fa-f]{6}|rgb\(\d{1,3}, ?\d{1,3}, ?\d{1,3}\)|[a-z]+)\)\[(.+?)]/g;

const paragraphAndHeadingRegex = /<(h[1-6]|p dir="auto")>([^]*?)<\/(h[1-6]|p)>/g;

const noteRegex = /<p dir="auto">!!! (info|warning|important) \[([^\]]*)\]: ((.|<br \/>\n)*)<\/p>/g;

const spoilerRegex = /(?:<p dir="auto">)(?:\|\|)([^]*?)(?:\|\|)(?:<\/p>)/g;

const superscriptRegex = /([^\s`<>])\^([^\s`<>^]+)\^/g;
const subscriptRegex = /([^\s`<>])~([^\s`<>~]+)~/g;

const tabsRegex = /<p dir="auto">:{3}tabs<\/p>\s*(.*?)\s*<p dir="auto">:{3}<\/p>/gs;
const stepsRegex = /<p dir="auto">:{3}steps<\/p>\s*(.*?)\s*<p dir="auto">:{3}<\/p>/gs;
const collapsibleRegex = /<p dir="auto">\+{3}\s+([^<]+)<\/p>\s*(.*?)\s*<p dir="auto">\+{3}<\/p>/gs;

const noteIcons = {
    info: 'fa-info-circle',
    warning: 'fa-exclamation-triangle',
    important: 'fa-exclamation-circle'
};

const ExtendedMarkdown = {
    async parsePost(data) {
        if (data && data.postData && data.postData.content) {
            data.postData.content = await applyExtendedMarkdown(data.postData.content);
            data.postData.content = applyGroupCode(data.postData.content, data.postData.pid);
            data.postData.content = await applySpoiler(data.postData.content, data.postData.pid);
            data.postData.content = applyTabs(data.postData.content, data.postData.pid);
            data.postData.content = applySteps(data.postData.content, data.postData.pid);
            data.postData.content = applyCollapsible(data.postData.content, data.postData.pid);
        }
        return data;
    },

    async parseSignature(data) {
        if (data && data.userData && data.userData.signature) {
            data.userData.signature = await applyExtendedMarkdown(data.userData.signature);
            data.userData.signature = applyTabs(data.userData.signature, "sig");
            data.userData.signature = applySteps(data.userData.signature, "sig");
            data.userData.signature = applyCollapsible(data.userData.signature, "sig");
        }
        return data;
    },

    async parseAboutMe(data) {
        if (data) {
            data = await applyExtendedMarkdown(data);
            data = applyTabs(data, "about");
            data = applySteps(data, "about");
            data = applyCollapsible(data, "about");
        }
        return data;
    },

    async parseRaw(data) {
        if (data) {
            data = await applyExtendedMarkdown(data);
            data = applyGroupCode(data, "preview");
            data = await applySpoiler(data, "preview");
            data = applyTabs(data, "preview");
            data = applySteps(data, "preview");
            data = applyCollapsible(data, "preview");
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
            { name: "spoiler", className: "fa fa-eye-slash", title: "[[extendedmarkdown:composer.formatting.spoiler]]" },
            { name: "noteinfo", className: "fa fa-info", title: "[[extendedmarkdown:composer.formatting.noteinfo]]" },
            { name: "notewarning", className: "fa fa-exclamation-triangle", title: "[[extendedmarkdown:composer.formatting.notewarning]]" },
            { name: "noteimportant", className: "fa fa-exclamation-circle", title: "[[extendedmarkdown:composer.formatting.noteimportant]]" },
            { name: "tabs", className: "fa fa-folder-open", title: "[[extendedmarkdown:composer.formatting.tabs]]" },
            { name: "superscript", className: "fa fa-superscript", title: "[[extendedmarkdown:composer.formatting.superscript]]" },
            { name: "subscript", className: "fa fa-subscript", title: "[[extendedmarkdown:composer.formatting.subscript]]" },
            { name: "collapsible", className: "fa fa-compress", title: "[[extendedmarkdown:composer.formatting.collapsible]]" },
            { name: "steps", className: "fa fa-tasks", title: "[[extendedmarkdown:composer.formatting.steps]]" }
        ];

        payload.options = payload.options.concat(formatting);
        return payload;
    },

    async sanitizerConfig(config) {
        config.allowedAttributes['a'] = config.allowedAttributes['a'] || [];
        config.allowedAttributes['a'].push('name');
        
        config.allowedAttributes['span'] = config.allowedAttributes['span'] || [];
        config.allowedAttributes['span'].push('class', 'style');
        
        config.allowedAttributes['div'] = config.allowedAttributes['div'] || [];
        config.allowedAttributes['div'].push('class', 'id', 'role');
        
        config.allowedAttributes['button'] = config.allowedAttributes['button'] || [];
        config.allowedAttributes['button'].push('class', 'type', 'data-bs-toggle', 'data-toggle', 'data-bs-target', 'data-target', 'aria-expanded', 'aria-controls', 'role', 'aria-selected', 'tabindex');
        
        config.allowedAttributes['ul'] = config.allowedAttributes['ul'] || [];
        config.allowedAttributes['ul'].push('class', 'role', 'id');
        
        config.allowedAttributes['li'] = config.allowedAttributes['li'] || [];
        config.allowedAttributes['li'].push('class', 'role');
        
        config.allowedAttributes['h4'] = config.allowedAttributes['h4'] || [];
        config.allowedAttributes['h4'].push('class');
        
        if (!config.allowedTags.includes('button')) {
            config.allowedTags.push('button');
        }
        if (!config.allowedTags.includes('sup')) {
            config.allowedTags.push('sup');
        }
        if (!config.allowedTags.includes('sub')) {
            config.allowedTags.push('sub');
        }
        
        return config;
    }
};

async function applyExtendedMarkdown(textContent) {
    if (textContent.match(superscriptRegex)) {
        textContent = textContent.replace(superscriptRegex, function (match, prefix, text) {
            return `${prefix}<sup>${text}</sup>`;
        });
    }

    if (textContent.match(subscriptRegex)) {
        textContent = textContent.replace(subscriptRegex, function (match, prefix, text) {
            return `${prefix}<sub>${text}</sub>`;
        });
    }

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

    return textContent;
}

function applyGroupCode(textContent, id) {
    if (textContent.match(codeTabRegex)) {
        let count = 0;
        textContent = textContent.replace(codeTabRegex, (match, codes) => {
            let cleanCodes = codes.trim();
            let codeArray = cleanCodes.substring(5, cleanCodes.length - 6).split(/<\/pre>\n<pre>/g);
            let lang = [];
            let processedCodeArray = [];
            
            for (let i in codeArray) {
                const langMatch = langCodeRegex.exec(codeArray[i]);
                if (langMatch) {
                    lang[i] = langMatch[1];
                    let codeContent = codeArray[i]
                        .replace(/<\/?pre[^>]*>/g, '')
                        .replace(/<code[^>]*>/g, '')
                        .replace(/<\/code>/g, '')
                        .trim();
                    processedCodeArray[i] = codeContent;
                }
            }
            
            const groupId = `codegroup-${count}-${id}`;
            let menuTab = `<ul class='nav nav-tabs' role='tablist' id='${groupId}-tabs'>`;
            let contentTab = `<div class='tab-content' id='${groupId}-content'>`;
            
            for (let i = 0; i < lang.length; i++) {
                const tabId = `${groupId}-${lang[i]}-${i}`;
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
                        ${capitalizeFirstLetter(lang[i])}
                    </button>
                </li>`;
                
                contentTab += `<div class="tab-pane fade ${isActive ? "show active" : ""}" 
                                   id="${tabId}" 
                                   role="tabpanel" 
                                   aria-labelledby="${tabId}-tab" 
                                   tabindex="0">
                    <pre><code class="${lang[i]}">${processedCodeArray[i]}</code></pre>
                </div>`;
            }
            
            menuTab += "</ul>";
            contentTab += "</div>";
            count++;
            
            return `<div class="code-group-container">${menuTab}${contentTab}</div>`;
        });
    }
    return textContent;
}

function applyTabs(textContent, id) {
    return textContent.replace(tabsRegex, (match, content) => {
        const tabsId = `tabs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const tabPattern = /<p dir="auto">@tab\s+([^<]+)<\/p>\s*(.*?)(?=<p dir="auto">@tab|$)/gs;
        const tabs = [];
        let tabMatch;
        
        while ((tabMatch = tabPattern.exec(content)) !== null) {
            tabs.push({
                title: tabMatch[1].trim(),
                content: tabMatch[2].trim()
            });
        }
        
        if (tabs.length === 0) return match;
        
        let html = `<div class="extended-tabs-container">
            <ul class="nav nav-tabs" role="tablist">`;
        
        tabs.forEach((tab, i) => {
            const active = i === 0 ? 'active' : '';
            html += `<li class="nav-item" role="presentation">
                <button class="nav-link ${active}" id="${tabsId}-tab-${i}" data-bs-toggle="tab" data-bs-target="#${tabsId}-pane-${i}" type="button" role="tab">
                    ${tab.title}
                </button>
            </li>`;
        });
        
        html += `</ul><div class="tab-content">`;
        
        tabs.forEach((tab, i) => {
            const active = i === 0 ? 'show active' : '';
            html += `<div class="tab-pane fade ${active}" id="${tabsId}-pane-${i}" role="tabpanel">
                <div class="tab-content-wrapper">${tab.content}</div>
            </div>`;
        });
        
        html += `</div></div>`;
        return html;
    });
}

function applySteps(textContent, id) {
    return textContent.replace(stepsRegex, (match, content) => {
        const stepsId = `steps-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const stepPattern = /<p dir="auto">(\d+)\.\s+([^<]+)<\/p>\s*(.*?)(?=<p dir="auto">\d+\.|$)/gs;
        const steps = [];
        let stepMatch;
        
        while ((stepMatch = stepPattern.exec(content)) !== null) {
            steps.push({
                number: stepMatch[1],
                title: stepMatch[2].trim(),
                content: stepMatch[3].trim()
            });
        }
        
        if (steps.length === 0) return match;
        
        let html = `<div class="steps-container">
            <ul class="nav nav-tabs steps-nav" role="tablist">`;
        
        steps.forEach((step, i) => {
            const active = i === 0 ? 'active' : '';
            html += `<li class="nav-item" role="presentation">
                <button class="nav-link ${active}" id="${stepsId}-tab-${i}" data-bs-toggle="tab" data-bs-target="#${stepsId}-pane-${i}" type="button" role="tab">
                    <span class="step-number">${step.number}</span>
                    ${step.title}
                </button>
            </li>`;
        });
        
        html += `</ul><div class="tab-content steps-content">`;
        
        steps.forEach((step, i) => {
            const active = i === 0 ? 'show active' : '';
            html += `<div class="tab-pane fade ${active}" id="${stepsId}-pane-${i}" role="tabpanel">
                <div class="step-content-wrapper">
                    <div class="step-header">
                        <h4><span class="step-badge">${step.number}</span> ${step.title}</h4>
                    </div>
                    <div class="step-body">${step.content}</div>
                </div>
            </div>`;
        });
        
        html += `</div>
            <div class="steps-navigation">
                <button class="btn btn-outline-secondary step-prev" type="button" disabled>
                    <i class="fa fa-chevron-left"></i> 上一步
                </button>
                <span class="step-indicator">
                    <span class="current-step">1</span> / <span class="total-steps">${steps.length}</span>
                </span>
                <button class="btn btn-outline-secondary step-next" type="button">
                    下一步 <i class="fa fa-chevron-right"></i>
                </button>
            </div>
        </div>`;
        
        return html;
    });
}

function applyCollapsible(textContent, id) {
    return textContent.replace(collapsibleRegex, (match, title, content) => {
        const collapseId = `collapse-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        return `<div class="collapsible-wrapper">
            <button class="btn btn-outline-primary extended-markdown-collapsible" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="false">
                <i class="fa fa-chevron-right collapse-icon"></i> ${title.trim()}
            </button>
            <div class="collapse" id="${collapseId}">
                <div class="card card-body mt-2 collapsible-content">${content.trim()}</div>
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

async function applySpoiler(textContent, id) {
    if (textContent.match(spoilerRegex)) {
        const translator = require.main.require('./src/translator');
        const spoilerText = await translator.translate('[[extendedmarkdown:spoiler]]');
        
        let count = 0;
        textContent = textContent.replace(spoilerRegex, (match, text) => {
            const spoilerButton = `
                <button class="btn btn-primary extended-markdown-spoiler" type="button" name="spoiler" data-bs-toggle="collapse" data-toggle="collapse" data-bs-target="#spoiler${count + id}" data-target="#spoiler${count + id}" aria-expanded="false" aria-controls="spoiler${count + id}">
                    ${spoilerText} <i class="fa fa-eye-slash"></i>
                </button>`;

            const spoilerContent = `
                <div class="collapse" id="spoiler${count + id}">
                    <div class="card card-body spoiler"><p dir="auto">${text}</p></div>
                </div>`;
            count++;
            return `<p>${spoilerButton}${spoilerContent}</p>`;
        });
    }
    return textContent;
}

module.exports = ExtendedMarkdown;

