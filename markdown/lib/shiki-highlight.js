'use strict';

const { createHighlighter } = require('shiki');
const { customAlphabet } = require('nanoid');

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 10);

let highlighter = null;
let isInitialized = false;

const ShikiHighlight = {
    async init(options = {}) {
        if (isInitialized) return highlighter;
        
        const defaultTheme = options.theme || { light: 'github-light', dark: 'github-dark' };
        const languages = options.languages || ['javascript', 'typescript', 'html', 'css', 'json', 'bash', 'python', 'java', 'cpp', 'c', 'php', 'go', 'rust', 'sql', 'xml', 'yaml'];
        
        highlighter = await createHighlighter({
            themes: typeof defaultTheme === 'object' && 'light' in defaultTheme && 'dark' in defaultTheme
                ? [defaultTheme.light, defaultTheme.dark]
                : [defaultTheme],
            langs: languages,
            langAlias: options.languageAlias || {}
        });
        
        isInitialized = true;
        return highlighter;
    },

    async highlight(str, lang, attrs = '', options = {}) {
        if (!highlighter) {
            await this.init(options);
        }

        const defaultLang = options.defaultHighlightLang || 'txt';
        const theme = options.theme || { light: 'github-light', dark: 'github-dark' };
        
        lang = this.parseLang(lang, attrs);
        
        try {
            if (!highlighter.getLoadedLanguages().includes(lang)) {
                await highlighter.loadLanguage(lang);
            }
        } catch (error) {
            console.warn(`Language '${lang}' not found, falling back to '${defaultLang}'`);
            lang = defaultLang;
        }

        const lineOptions = this.parseLineHighlight(attrs);
        const lineNumbers = this.parseLineNumbers(attrs);
        const transformers = this.createTransformers(str, lineOptions, lineNumbers);

        str = this.preprocessCode(str);

        const highlighted = highlighter.codeToHtml(str, {
            lang,
            transformers,
            ...(typeof theme === 'object' && 'light' in theme && 'dark' in theme
                ? { themes: theme, defaultColor: false }
                : { theme })
        });

        return this.postprocessCode(highlighted, lineNumbers);
    },

    parseLang(lang, attrs) {
        const lineNoStartRE = /=(\d*)/;
        const lineNoRE = /:(no-)?line-numbers(=\d*)?$/;
        
        return lang
            .replace(lineNoStartRE, '')
            .replace(lineNoRE, '')
            .toLowerCase() || 'txt';
    },

    parseLineHighlight(attrs) {
        const highlightMatch = attrs.match(/\{([^}]+)\}/);
        if (!highlightMatch) return [];

        const highlightStr = highlightMatch[1];
        const result = [];
        
        highlightStr.split(',').forEach(part => {
            const range = part.split('-').map(n => parseInt(n.trim(), 10));
            if (range.length === 2) {
                for (let i = range[0]; i <= range[1]; i++) {
                    result.push({ line: i, classes: ['highlighted'] });
                }
            } else if (range.length === 1 && !isNaN(range[0])) {
                result.push({ line: range[0], classes: ['highlighted'] });
            }
        });

        return result;
    },

    parseLineNumbers(attrs) {
        const lineNumbersMatch = attrs.match(/:line-numbers(=(\d+))?/);
        const noLineNumbersMatch = attrs.match(/:no-line-numbers/);
        
        if (noLineNumbersMatch) {
            return { enabled: false };
        }
        
        if (lineNumbersMatch) {
            const startLine = lineNumbersMatch[2] ? parseInt(lineNumbersMatch[2], 10) : 1;
            return { enabled: true, start: startLine };
        }
        
        return { enabled: false };
    },

    preprocessCode(str) {
        const mustacheRE = /\{\{.*?\}\}/g;
        const mustaches = new Map();
        
        return str.replace(mustacheRE, (match) => {
            let marker = mustaches.get(match);
            if (!marker) {
                marker = nanoid();
                mustaches.set(match, marker);
            }
            return marker;
        });
    },

    postprocessCode(html, lineNumbers) {
        if (lineNumbers.enabled) {
            html = this.addLineNumbers(html, lineNumbers.start || 1);
        }
        return html;
    },

    addLineNumbers(html, startLine = 1) {
        const lines = html.split('\n');
        const codeStart = lines.findIndex(line => line.includes('<code'));
        const codeEnd = lines.findIndex(line => line.includes('</code>'));
        
        if (codeStart === -1 || codeEnd === -1) return html;
        
        let lineNumber = startLine;
        for (let i = codeStart + 1; i < codeEnd; i++) {
            if (lines[i].includes('<span class="line">')) {
                lines[i] = lines[i].replace(
                    '<span class="line">',
                    `<span class="line" data-line="${lineNumber}">`
                );
                lineNumber++;
            }
        }
        
        const preClass = html.match(/class="([^"]*)"/) || ['', ''];
        const newPreClass = `${preClass[1]} line-numbers`.trim();
        html = html.replace(/class="[^"]*"/, `class="${newPreClass}"`);
        
        return lines.join('\n');
    },

    createTransformers(code, lineOptions, lineNumbers) {
        const transformers = [];

        transformers.push({
            name: 'vitepress:add-dir',
            pre(node) {
                node.properties.dir = 'ltr';
            }
        });

        if (lineOptions.length > 0) {
            transformers.push({
                name: 'vitepress:line-highlight',
                code(hast) {
                    hast.children.forEach((span, index) => {
                        if (span.type === 'element' && span.tagName === 'span' && 
                            Array.isArray(span.properties.class) && 
                            span.properties.class.includes('line')) {
                            
                            const lineNumber = index + 1;
                            const lineOption = lineOptions.find(opt => opt.line === lineNumber);
                            if (lineOption) {
                                span.properties.class = [...span.properties.class, ...lineOption.classes];
                            }
                        }
                    });
                }
            });
        }

        transformers.push(this.createNotationTransformer(code));

        transformers.push({
            name: 'vitepress:empty-line',
            code(hast) {
                hast.children.forEach((span) => {
                    if (span.type === 'element' && span.tagName === 'span' &&
                        Array.isArray(span.properties.class) &&
                        span.properties.class.includes('line') &&
                        span.children.length === 0) {
                        span.children.push({
                            type: 'element',
                            tagName: 'wbr',
                            properties: {},
                            children: []
                        });
                    }
                });
            }
        });

        return transformers;
    },

    createNotationTransformer(code) {
        const lines = code.split('\n');
        const annotations = [];

        lines.forEach((line, index) => {
            const lineNumber = index + 1;
            
            if (line.includes('// [!code highlight]')) {
                annotations.push({ line: lineNumber, type: 'highlight' });
            } else if (line.includes('// [!code focus]')) {
                annotations.push({ line: lineNumber, type: 'focus' });
            } else if (line.includes('// [!code ++]')) {
                annotations.push({ line: lineNumber, type: 'diff', variant: 'add' });
            } else if (line.includes('// [!code --]')) {
                annotations.push({ line: lineNumber, type: 'diff', variant: 'remove' });
            } else if (line.includes('// [!code error]')) {
                annotations.push({ line: lineNumber, type: 'error' });
            } else if (line.includes('// [!code warning]')) {
                annotations.push({ line: lineNumber, type: 'warning' });
            }
            
            const focusMatch = line.match(/\/\/ \[!code focus:(\d+)\]/);
            if (focusMatch) {
                const focusLines = parseInt(focusMatch[1], 10);
                for (let i = 0; i < focusLines; i++) {
                    annotations.push({ line: lineNumber + i, type: 'focus' });
                }
            }
        });

        return {
            name: 'vitepress:notation',
            code(hast) {
                let hasFocus = annotations.some(ann => ann.type === 'focus');
                
                hast.children.forEach((span, index) => {
                    if (span.type === 'element' && span.tagName === 'span' &&
                        Array.isArray(span.properties.class) &&
                        span.properties.class.includes('line')) {
                        
                        const lineNumber = index + 1;
                        const annotation = annotations.find(ann => ann.line === lineNumber);
                        
                        if (annotation) {
                            switch (annotation.type) {
                                case 'highlight':
                                    span.properties.class.push('highlighted');
                                    break;
                                case 'focus':
                                    span.properties.class.push('focused');
                                    if (hasFocus) {
                                        hast.properties = hast.properties || {};
                                        hast.properties.class = (hast.properties.class || []).concat(['has-focused-lines']);
                                    }
                                    break;
                                case 'diff':
                                    span.properties.class.push(`diff-${annotation.variant}`);
                                    break;
                                case 'error':
                                    span.properties.class.push('error');
                                    break;
                                case 'warning':
                                    span.properties.class.push('warning');
                                    break;
                            }
                        } else if (hasFocus) {
                            span.properties.class.push('blurred');
                        }
                        
                        span.children.forEach(child => {
                            if (child.type === 'text' && annotation) {
                                child.value = child.value.replace(/\/\/ \[!code [^\]]+\]/, '');
                            }
                        });
                    }
                });
            }
        };
    },

    dispose() {
        if (highlighter) {
            highlighter.dispose();
            highlighter = null;
            isInitialized = false;
        }
    }
};

module.exports = ShikiHighlight; 