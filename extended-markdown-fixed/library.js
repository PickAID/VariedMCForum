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
        }
        return data;
    },

    async parseSignature(data) {
        if (data && data.userData && data.userData.signature) {
            data.userData.signature = await applyExtendedMarkdown(data.userData.signature);
        }
        return data;
    },

    async parseAboutMe(data) {
        if (data) {
            data = await applyExtendedMarkdown(data);
        }
        return data;
    },

    async parseRaw(data) {
        if (data) {
            data = await applyExtendedMarkdown(data);
            data = applyGroupCode(data, "");
            data = await applySpoiler(data, "");
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

async function applyExtendedMarkdown(textContent) {
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
            let codeArray = codes.substring(5, codes.length - 6).split(/<\/pre>\n<pre>/g);
            let lang = [];
            for (let i in codeArray) {
                lang[i] = langCodeRegex.exec(codeArray[i])[1];
                codeArray[i] = "<pre>" + codeArray[i] + "</pre>\n";
            }
            let menuTab = "<ul class='nav nav-tabs' role='tablist'>";
            let contentTab = "<div class='tab-content'>";
            for (let i = 0; i < lang.length; i++) {
                menuTab += `<li role='presentation' ${i === 0 ? "class='active'" : ""}><a href='#${lang[i] + count + id}' aria-controls='${lang[i]}' role='tab' data-toggle='tab'>${capitalizeFirstLetter(lang[i])}</a></li>`;
                contentTab += `<div role="tabpanel" class="tab-pane ${i === 0 ? "active" : ""}" id="${lang[i] + count + id}">${codeArray[i]}</div>`;
            }
            menuTab += "</ul>";
            contentTab += "</div>";
            count++;
            return `<div class="code-group-container">${menuTab}${contentTab}</div>`;
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
        const spoilerText = await translator.translate('[[extendedmarkdown:spoiler]]');
        
        let count = 0;
        textContent = textContent.replace(spoilerRegex, (match, text) => {
            const spoilerButton = `
                <button class="btn btn-primary extended-markdown-spoiler" type="button" name="spoiler" data-bs-toggle="collapse" data-bs-target="#spoiler${count + id}" aria-expanded="false" aria-controls="spoiler${count + id}">
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

