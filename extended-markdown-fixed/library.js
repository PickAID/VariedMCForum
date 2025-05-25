'use strict';

const slugify = require.main.require('./src/slugify');

const textHeaderRegex = /<p dir="auto">#([a-zA-Z0-9-]*)\((.*)\)<\/p>/g;
const tooltipRegex = /(<code.*>*?[^]<\/code>)|°(.*)°\((.*)\)/g;
const codeTabRegex = /(?:<p dir="auto">={3}group<\/p>\n)((?:<pre><code class=".+">[^]*?<\/code><\/pre>\n){2,})(?:<p dir="auto">={3}<\/p>)/g;
const langCodeRegex = /<code class="(.+)">/;
const colorRegex = /(<code.*>*?[^]<\/code>)|%\((#[\dA-Fa-f]{6}|rgb\(\d{1,3}, ?\d{1,3}, ?\d{1,3}\)|[a-z]+)\)\[(.+?)]/g;
const paragraphAndHeadingRegex = /<(h[1-6]|p dir="auto")>([^]*?)<\/(h[1-6]|p)>/g;
const noteRegex = /<p dir="auto">!!! (info|warning|important) \[([a-zA-Z0-9]*)\]: ((.|<br \/>\n)*)<\/p>/g;
const spoilerRegex = /(?:<p dir="auto">)(?:\|\|)([^]*?)(?:\|\|)(?:<\/p>)/g;

const tabsRegex = /<p dir="auto">:{3}tabs<\/p>\n((?:<p dir="auto">@tab [^]*?<\/p>\n(?:(?!<p dir="auto">@tab|<p dir="auto">:{3}<\/p>).*\n?)*)*)<p dir="auto">:{3}<\/p>/g;
const tabItemRegex = /<p dir="auto">@tab ([^]*?)<\/p>\n?((?:(?!<p dir="auto">@tab|<p dir="auto">:{3}<\/p>).*\n?)*)/g;

const superscriptRegex = /([^`<>\s])\^([^`<>\s^]+)\^/g;
const subscriptRegex = /([^`<>\s])~([^`<>\s~]+)~/g;
const annotationRegex = /\[([^\]]+)\]\{\.([^}]+)\}/g;

const collapsibleRegex = /<p dir="auto">\+{3} ([^]*?)<\/p>\n((?:(?!<p dir="auto">\+{3}<\/p>).*\n?)*)<p dir="auto">\+{3}<\/p>/g;

const stepsRegex = /<p dir="auto">:{3}steps<\/p>\n((?:<p dir="auto">\d+\. [^]*?<\/p>\n?)*)<p dir="auto">:{3}<\/p>/g;
const stepItemRegex = /<p dir="auto">(\d+)\. ([^]*?)<\/p>/g;

const noteIcons = {
    info: 'fa-info-circle',
    warning: 'fa-exclamation-triangle',
    important: 'fa-exclamation-circle'
};

const ExtendedMarkdown = {
    async parsePost(data) {
        if (data && data.postData && data.postData.content) {
            data.postData.content = applyExtendedMarkdown(data.postData.content);
            data.postData.content = applyGroupCode(data.postData.content, data.postData.pid);
            data.postData.content = await applySpoiler(data.postData.content, data.postData.pid);
            data.postData.content = applyTabs(data.postData.content, data.postData.pid);
            data.postData.content = applyCollapsible(data.postData.content, data.postData.pid);
            data.postData.content = applySteps(data.postData.content);
        }
        return data;
    },

    async parseSignature(data) {
        if (data && data.userData && data.userData.signature) {
            data.userData.signature = applyExtendedMarkdown(data.userData.signature);
            data.userData.signature = applyTabs(data.userData.signature, "sig");
            data.userData.signature = applyCollapsible(data.userData.signature, "sig");
            data.userData.signature = applySteps(data.userData.signature);
        }
        return data;
    },

    async parseAboutMe(data) {
        if (data) {
            data = applyExtendedMarkdown(data);
            data = applyTabs(data, "about");
            data = applyCollapsible(data, "about");
            data = applySteps(data);
        }
        return data;
    },

    async parseRaw(data) {
        if (data) {
            data = applyExtendedMarkdown(data);
            data = applyGroupCode(data, "");
            data = await applySpoiler(data, "");
            data = applyTabs(data, "");
            data = applyCollapsible(data, "");
            data = applySteps(data);
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
            { name: "annotation", className: "fa fa-sticky-note", title: "[[extendedmarkdown:composer.formatting.annotation]]" },
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
        config.allowedAttributes['span'].push('class', 'data-annotation', 'title', 'data-bs-toggle', 'data-bs-placement');
        
        config.allowedAttributes['div'] = config.allowedAttributes['div'] || [];
        config.allowedAttributes['div'].push('class', 'id', 'data-bs-toggle', 'data-bs-target', 'aria-expanded', 'aria-controls', 'role');
        
        config.allowedAttributes['button'] = config.allowedAttributes['button'] || [];
        config.allowedAttributes['button'].push('class', 'type', 'data-bs-toggle', 'data-bs-target', 'aria-expanded', 'aria-controls');
        
        config.allowedAttributes['ul'] = config.allowedAttributes['ul'] || [];
        config.allowedAttributes['ul'].push('class', 'role');
        
        config.allowedAttributes['li'] = config.allowedAttributes['li'] || [];
        config.allowedAttributes['li'].push('class', 'role');
        
        config.allowedAttributes['a'].push('href', 'aria-controls', 'role', 'data-toggle', 'data-bs-toggle');
        
        config.allowedTags = config.allowedTags || [];
        config.allowedTags.push('sup', 'sub');
        
        return config;
    }
};

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

    if (textContent.match(superscriptRegex)) {
        textContent = textContent.replace(superscriptRegex, function (match, before, content) {
            return `${before}<sup>${content}</sup>`;
        });
    }

    if (textContent.match(subscriptRegex)) {
        textContent = textContent.replace(subscriptRegex, function (match, before, content) {
            return `${before}<sub>${content}</sub>`;
        });
    }

    if (textContent.match(annotationRegex)) {
        textContent = textContent.replace(annotationRegex, function (match, text, annotation) {
            return `<span class="annotation-mark" data-annotation="${annotation}" title="${annotation}" data-bs-toggle="tooltip" data-bs-placement="top">${text}</span>`;
        });
    }

    if (textContent.match(paragraphAndHeadingRegex)) {
        textContent = textContent.replace(paragraphAndHeadingRegex, function (match, tag, text, closeTag) {
            let hasStartPattern = text.startsWith("|-");
            let hasEndPattern = text.endsWith("-|");
            let anchor = tag.charAt(0) == "h" ? generateAnchorFromHeading(text) : "";
            if (text.startsWith("|=") && text.endsWith("=|")) {
                return `<${tag} style="text-align:justify;">${anchor}${text.slice(2).slice(0, -2)}</${closeTag}>`;
            } else if (hasStartPattern && hasEndPattern) {
                return `<${tag} style="text-align:center;">${anchor}${text.slice(2).slice(0, -2)}</${closeTag}>`;
            } else if (hasEndPattern) {
                return `<${tag} style="text-align:right;">${anchor}${text.slice(0, -2)}</${closeTag}>`;
            } else if (hasStartPattern) {
                return `<${tag} style="text-align:left;">${anchor}${text.slice(2)}</${closeTag}>`;
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
            let codeArray = codes.substring(5, codes.length - 6).split(/<\/pre>\n<pre>/g);
            let lang = [];
            for (let i in codeArray) {
                const langMatch = langCodeRegex.exec(codeArray[i]);
                if (langMatch) {
                    lang[i] = langMatch[1];
                    codeArray[i] = "<pre>" + codeArray[i] + "</pre>\n";
                }
            }
            let menuTab = "<ul class='nav nav-tabs code-group-tabs' role='tablist'>";
            let contentTab = "<div class='tab-content code-group-content'>";
            for (let i = 0; i < lang.length; i++) {
                const tabId = `${lang[i]}-${count}-${id}`;
                const isActive = i === 0;
                menuTab += `<li class="nav-item" role="presentation"><a class="nav-link ${isActive ? 'active' : ''}" href="#${tabId}" aria-controls="${lang[i]}" role="tab" data-bs-toggle="tab">${capitalizeFirstLetter(lang[i])}</a></li>`;
                contentTab += `<div role="tabpanel" class="tab-pane ${isActive ? 'active' : ''}" id="${tabId}">${codeArray[i]}</div>`;
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
    if (textContent.match(tabsRegex)) {
        let count = 0;
        textContent = textContent.replace(tabsRegex, (match, tabsContent) => {
            const tabs = [];
            let tabMatch;
            while ((tabMatch = tabItemRegex.exec(tabsContent)) !== null) {
                tabs.push({
                    title: tabMatch[1].trim(),
                    content: tabMatch[2].trim()
                });
            }
            
            if (tabs.length === 0) return match;
            
            const groupId = `tabs-${count}-${id}`;
            let menuTab = `<ul class='nav nav-tabs extended-tabs-nav' role='tablist' id='${groupId}-tabs'>`;
            let contentTab = `<div class='tab-content extended-tabs-content' id='${groupId}-content'>`;
            
            for (let i = 0; i < tabs.length; i++) {
                const tabId = `${groupId}-tab-${i}`;
                const isActive = i === 0;
                menuTab += `<li class="nav-item" role="presentation"><a class="nav-link ${isActive ? 'active' : ''}" href="#${tabId}" aria-controls="${tabId}" role="tab" data-bs-toggle="tab">${tabs[i].title}</a></li>`;
                contentTab += `<div role="tabpanel" class="tab-pane ${isActive ? 'active' : ''}" id="${tabId}">${tabs[i].content}</div>`;
            }
            
            menuTab += "</ul>";
            contentTab += "</div>";
            count++;
            
            return `<div class="extended-tabs-container">${menuTab}${contentTab}</div>`;
        });
    }
    return textContent;
}

function applyCollapsible(textContent, id) {
    if (textContent.match(collapsibleRegex)) {
        let count = 0;
        textContent = textContent.replace(collapsibleRegex, (match, title, content) => {
            const collapseId = `collapse-${count}-${id}`;
            
            const collapseButton = `<button class="btn btn-outline-primary extended-markdown-collapsible" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="false" aria-controls="${collapseId}"><i class="fa fa-chevron-right collapse-icon"></i> ${title}</button>`;

            const collapseContent = `<div class="collapse" id="${collapseId}"><div class="card card-body mt-2 collapsible-content">${content}</div></div>`;
            
            count++;
            return `<div class="collapsible-wrapper">${collapseButton}${collapseContent}</div>`;
        });
    }
    return textContent;
}

function applySteps(textContent) {
    if (textContent.match(stepsRegex)) {
        textContent = textContent.replace(stepsRegex, (match, stepsContent) => {
            const steps = [];
            let stepMatch;
            while ((stepMatch = stepItemRegex.exec(stepsContent)) !== null) {
                steps.push({
                    number: stepMatch[1],
                    content: stepMatch[2].trim()
                });
            }
            
            if (steps.length === 0) return match;
            
            let stepsHtml = '<div class="steps-container">';
            
            for (let i = 0; i < steps.length; i++) {
                const isLast = i === steps.length - 1;
                stepsHtml += `<div class="step-item ${isLast ? 'step-last' : ''}"><div class="step-marker"><span class="step-number">${steps[i].number}</span></div><div class="step-content"><div class="step-text">${steps[i].content}</div></div>${!isLast ? '<div class="step-connector"></div>' : ''}</div>`;
            }
            
            stepsHtml += '</div>';
            return stepsHtml;
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

async function applySpoiler(textContent, id) {
    if (textContent.match(spoilerRegex)) {
        const translator = require.main.require('./src/translator');
        let spoilerText;
        try {
            spoilerText = await translator.translate('[[extendedmarkdown:spoiler]]');
        } catch (err) {
            spoilerText = 'Spoiler';
        }
        
        let count = 0;
        textContent = textContent.replace(spoilerRegex, (match, text) => {
            const spoilerButton = `<button class="btn btn-primary extended-markdown-spoiler" type="button" name="spoiler" data-bs-toggle="collapse" data-bs-target="#spoiler${count + id}" aria-expanded="false" aria-controls="spoiler${count + id}">${spoilerText} <i class="fa fa-eye-slash"></i></button>`;
            const spoilerContent = `<div class="collapse" id="spoiler${count + id}"><div class="card card-body spoiler"><p dir="auto">${text}</p></div></div>`;
            count++;
            return `<p>${spoilerButton}${spoilerContent}</p>`;
        });
    }
    return textContent;
}

module.exports = ExtendedMarkdown;

