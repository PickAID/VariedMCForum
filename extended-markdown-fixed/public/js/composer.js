'use strict';

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
            }
        ];
        
        data.formatting = data.formatting.concat(newFormatting);
    });
    
    $(window).on('action:composer.enhanced', function() {
        const composer = $('.composer');
        if (!composer.length) return;
        
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
        
        $('[data-format="tabs"]').off('click.extended-markdown').on('click.extended-markdown', function(e) {
            e.preventDefault();
            const textarea = composer.find('textarea');
            const text = '\n[tabs]\n[tab=标签1]\n内容1\n[tab=标签2]\n内容2\n[/tabs]\n';
            insertText(textarea, text);
        });
        
        $('[data-format="steps"]').off('click.extended-markdown').on('click.extended-markdown', function(e) {
            e.preventDefault();
            const textarea = composer.find('textarea');
            const text = '\n[steps]\n[step=1]\n第一步描述\n[step=2]\n第二步描述\n[/steps]\n';
            insertText(textarea, text);
        });
        
        $('[data-format="collapsible"]').off('click.extended-markdown').on('click.extended-markdown', function(e) {
            e.preventDefault();
            const textarea = composer.find('textarea');
            const text = '\n[spoiler=展开查看]\n隐藏内容\n[/spoiler]\n';
            insertText(textarea, text);
        });
    });
}); 