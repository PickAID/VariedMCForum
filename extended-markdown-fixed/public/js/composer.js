'use strict';

let composerInitialized = false;

$(document).ready(function() {
    $(window).on('action:composer.loaded', function(ev, data) {
        if (!data.formatting) return;
        
        const newFormatting = [
            {
                name: 'tabs',
                className: 'fa fa-folder-open',
                title: '插入标签页',
                text: '[tabs]\n[tab=标签1]\n内容1\n[tab=标签2]\n内容2\n[/tabs]'
            },
            {
                name: 'steps', 
                className: 'fa fa-tasks',
                title: '插入步骤',
                text: '[steps]\n[step=1]\n第一步描述\n[step=2]\n第二步描述\n[/steps]'
            },
            {
                name: 'collapsible',
                className: 'fa fa-compress', 
                title: '插入折叠框',
                text: '[spoiler=展开查看]\n隐藏内容\n[/spoiler]'
            },
            {
                name: 'ruby',
                className: 'fa fa-language',
                title: '插入音注标记',
                text: '@中国(zhōng guó)'
            }
        ];
        
        data.formatting = data.formatting.concat(newFormatting);
    });
    
    $(window).on('action:composer.enhanced', function() {
        if (composerInitialized) return;
        composerInitialized = true;
        
        function insertText(textarea, text) {
            if (!textarea || !textarea.length) return;
            
            const element = textarea[0];
            if (!element) return;
            
            const start = element.selectionStart || 0;
            const end = element.selectionEnd || 0;
            const value = element.value || '';
            
            element.value = value.substring(0, start) + text + value.substring(end);
            element.selectionStart = element.selectionEnd = start + text.length;
            element.focus();
            textarea.trigger('input');
        }
        
        $(document).on('click.extended-markdown', '[data-format="tabs"]', function(e) {
            e.preventDefault();
            const textarea = $('.composer textarea');
            const text = '\n[tabs]\n[tab=标签1]\n内容1\n[tab=标签2]\n内容2\n[/tabs]\n';
            insertText(textarea, text);
        });
        
        $(document).on('click.extended-markdown', '[data-format="steps"]', function(e) {
            e.preventDefault();
            const textarea = $('.composer textarea');
            const text = '\n[steps]\n[step=1]\n第一步描述\n[step=2]\n第二步描述\n[/steps]\n';
            insertText(textarea, text);
        });
        
        $(document).on('click.extended-markdown', '[data-format="collapsible"]', function(e) {
            e.preventDefault();
            const textarea = $('.composer textarea');
            const text = '\n[spoiler=展开查看]\n隐藏内容\n[/spoiler]\n';
            insertText(textarea, text);
        });
        
        $(document).on('click.extended-markdown', '[data-format="ruby"]', function(e) {
            e.preventDefault();
            const textarea = $('.composer textarea');
            const text = '@中国(zhōng guó)';
            insertText(textarea, text);
        });
    });
    
    $(window).on('action:ajaxify.end', function() {
        composerInitialized = false;
    });
}); 