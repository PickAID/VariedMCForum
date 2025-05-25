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

// 使用更简单的BBCode风格语法
const tabsRegex = /(?:<p dir="auto">)?\[tabs\](?:<\/p>)?([\s\S]*?)(?:<p dir="auto">)?\[\/tabs\](?:<\/p>)?/gi;
const tabRegex = /(?:<p dir="auto">)?\[tab=([^\]]+)\](?:<\/p>)?([\s\S]*?)(?=(?:<p dir="auto">)?\[tab=|(?:<p dir="auto">)?\[\/tabs\])/gi;

const stepsRegex = /(?:<p dir="auto">)?\[steps\](?:<\/p>)?([\s\S]*?)(?:<p dir="auto">)?\[\/steps\](?:<\/p>)?/gi;
const stepRegex = /(?:<p dir="auto">)?\[step=(\d+)\](?:<\/p>)?([\s\S]*?)(?=(?:<p dir="auto">)?\[step=|(?:<p dir="auto">)?\[\/steps\])/gi;

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
            data.postData.content = await applySpoiler(data.postData.content, data.postData.pid);
        }
        return data;
    },

    async parseSignature(data) {
        if (data && data.userData && data.userData.signature) {
            data.userData.signature = applyTabs(data.userData.signature, "sig");
            data.userData.signature = applySteps(data.userData.signature, "sig");
            data.userData.signature = applyCollapsible(data.userData.signature, "sig");
            data.userData.signature = await applyExtendedMarkdown(data.userData.signature);
        }
        return data;
    },

    async parseAboutMe(data) {
        if (data) {
            data = applyTabs(data, "about");
            data = applySteps(data, "about");
            data = applyCollapsible(data, "about");
            data = await applyExtendedMarkdown(data);
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
            data = await applySpoiler(data, "preview");
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
        config.allowedAttributes = config.allowedAttributes || {};
        config.allowedTags = config.allowedTags || [];
        
        config.allowedAttributes['a'] = config.allowedAttributes['a'] || [];
        if (!config.allowedAttributes['a'].includes('name')) {
            config.allowedAttributes['a'].push('name');
        }
        
        config.allowedAttributes['span'] = config.allowedAttributes['span'] || [];
        ['class', 'style'].forEach(attr => {
            if (!config.allowedAttributes['span'].includes(attr)) {
                config.allowedAttributes['span'].push(attr);
            }
        });
        
        config.allowedAttributes['div'] = config.allowedAttributes['div'] || [];
        ['class', 'id', 'role'].forEach(attr => {
            if (!config.allowedAttributes['div'].includes(attr)) {
                config.allowedAttributes['div'].push(attr);
            }
        });
        
        config.allowedAttributes['button'] = config.allowedAttributes['button'] || [];
        ['class', 'type', 'data-bs-toggle', 'data-toggle', 'data-bs-target', 'data-target', 'aria-expanded', 'aria-controls', 'role', 'aria-selected', 'tabindex'].forEach(attr => {
            if (!config.allowedAttributes['button'].includes(attr)) {
                config.allowedAttributes['button'].push(attr);
            }
        });
        
        config.allowedAttributes['ul'] = config.allowedAttributes['ul'] || [];
        ['class', 'role', 'id'].forEach(attr => {
            if (!config.allowedAttributes['ul'].includes(attr)) {
                config.allowedAttributes['ul'].push(attr);
            }
        });
        
        config.allowedAttributes['li'] = config.allowedAttributes['li'] || [];
        ['class', 'role'].forEach(attr => {
            if (!config.allowedAttributes['li'].includes(attr)) {
                config.allowedAttributes['li'].push(attr);
            }
        });
        
        config.allowedAttributes['h4'] = config.allowedAttributes['h4'] || [];
        if (!config.allowedAttributes['h4'].includes('class')) {
            config.allowedAttributes['h4'].push('class');
        }
        
        ['button', 'sup', 'sub'].forEach(tag => {
            if (!config.allowedTags.includes(tag)) {
                config.allowedTags.push(tag);
            }
        });
        
        return config;
    }
};

async function applyExtendedMarkdown(textContent) {
    if (textContent.match(textHeaderRegex)) {
        textContent = textContent.replace(textHeaderRegex, (match, anchor, text) => {
            return generateAnchorFromHeading(text) + `<div class="text-header">${text}</div>`;
        });
    }

    if (textContent.match(tooltipRegex)) {
        textContent = textContent.replace(tooltipRegex, (match, code, text, tooltip) => {
            if (typeof code !== "undefined") {
                return code;
            } else {
                return `<span class="extended-markdown-tooltip" data-bs-toggle="tooltip" data-toggle="tooltip" title="${tooltip}">${text}</span>`;
            }
        });
    }

    if (textContent.match(colorRegex)) {
        textContent = textContent.replace(colorRegex, (match, code, color, text) => {
            if (typeof code !== "undefined") {
                return code;
            } else {
                return `<span style="color: ${color};">${text}</span>`;
            }
        });
    }

    if (textContent.match(paragraphAndHeadingRegex)) {
        textContent = textContent.replace(paragraphAndHeadingRegex, function (match, startTag, text, endTag) {
            if (text.startsWith('|-') && text.endsWith('-|')) {
                return `<${startTag} style="text-align: center;">${text.slice(2, -2)}</${endTag}>`;
            } else if (text.startsWith('|-')) {
                return `<${startTag} style="text-align: left;">${text.slice(2)}</${endTag}>`;
            } else if (text.endsWith('-|')) {
                return `<${startTag} style="text-align: right;">${text.slice(0, -2)}</${endTag}>`;
            } else if (text.startsWith('|=') && text.endsWith('=|')) {
                return `<${startTag} style="text-align: justify;">${text.slice(2, -2)}</${endTag}>`;
            } else {
                return match;
            }
        });
    }

    if (textContent.match(noteRegex)) {
        textContent = textContent.replace(noteRegex, (match, type, title, content) => {
            const icon = noteIcons[type] || 'fa-info';
            return `<div class="admonition ${type}">
                <div class="admonition-title">
                    <i class="fa ${icon}"></i> ${title}
                </div>
                <div class="admonition-content">${content}</div>
            </div>`;
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
    if (textContent.match(codeTabRegex)) {
        let count = 0;
        textContent = textContent.replace(codeTabRegex, function (match, cleanCodes) {
            const codeArray = cleanCodes.substring(5, cleanCodes.length - 6).split(/<\/pre>\n<pre>/g);
            let lang = [];
            let processedCodeArray = [];

            codeArray.forEach((code, index) => {
                const langMatch = langCodeRegex.exec(`<code ${code}`);
                if (langMatch) {
                    lang.push(capitalizeFirstLetter(langMatch[1]));
                    processedCodeArray.push(code.substring(langMatch[0].length - 5));
                } else {
                    lang.push('Code');
                    processedCodeArray.push(code.substring(1));
                }
            });

            let navTabs = '<ul class="nav nav-tabs code-tabs" role="tablist">';
            let tabContent = '<div class="tab-content code-content">';

            lang.forEach((language, index) => {
                const active = index === 0 ? 'active' : '';
                const tabId = `code-tab-${id}-${count}-${index}`;
                const paneId = `code-pane-${id}-${count}-${index}`;

                navTabs += `<li class="nav-item" role="presentation">
                    <button class="nav-link ${active}" id="${tabId}" data-bs-toggle="tab" data-bs-target="#${paneId}" type="button" role="tab">${language}</button>
                </li>`;

                tabContent += `<div class="tab-pane fade ${active ? 'show active' : ''}" id="${paneId}" role="tabpanel">
                    <pre><code class="${language.toLowerCase()}">${processedCodeArray[index]}</code></pre>
                </div>`;
            });

            navTabs += '</ul>';
            tabContent += '</div>';
            count++;

            return `<div class="code-group-container">${navTabs}${tabContent}</div>`;
        });
    }
    return textContent;
}

function applyTabs(textContent, id) {
    return textContent.replace(tabsRegex, (match, content) => {
        const tabsId = `tabs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const tabs = [];
        let tabMatch;
        
        tabRegex.lastIndex = 0;
        
        while ((tabMatch = tabRegex.exec(content)) !== null) {
            const title = tabMatch[1].trim();
            const tabContent = tabMatch[2].trim().replace(/^<p dir="auto">|<\/p>$/g, '');
            
            tabs.push({
                title: title,
                content: tabContent
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
                <div class="tab-content-body">${tab.content}</div>
            </div>`;
        });
        
        html += `</div></div>`;
        return html;
    });
}

function applySteps(textContent, id) {
    return textContent.replace(stepsRegex, (match, content) => {
        const stepsId = `steps-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const steps = [];
        let stepMatch;
        
        stepRegex.lastIndex = 0;
        
        while ((stepMatch = stepRegex.exec(content)) !== null) {
            const stepContent = stepMatch[2].trim().replace(/^<p dir="auto">|<\/p>$/g, '');
            const lines = stepContent.split('\n');
            const title = lines[0] || `步骤 ${stepMatch[1]}`;
            const stepBody = lines.slice(1).join('\n').trim();
            
            steps.push({
                number: stepMatch[1],
                title: title,
                content: stepBody
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

