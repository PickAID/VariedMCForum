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
                text: '[steps]\n[step=1]第一步\n描述内容\n[step=2]第二步\n描述内容\n[/steps]'
            },
            {
                name: 'spoiler',
                className: 'fa fa-compress', 
                title: '插入折叠框',
                text: '[spoiler=点击展开]\n隐藏内容\n[/spoiler]'
            }
        ];
        
        data.formatting = data.formatting.concat(newFormatting);
    });
    
    $(window).on('action:composer.enhanced', function() {
        $('[data-format="tabs"]').on('click', function() {
            const textarea = $('.composer textarea');
            const text = '[tabs]\n[tab=标签1]\n内容1\n[tab=标签2]\n内容2\n[/tabs]';
            insertText(textarea, text);
        });
        
        $('[data-format="steps"]').on('click', function() {
            const textarea = $('.composer textarea');
            const text = '[steps]\n[step=1]第一步\n描述内容\n[step=2]第二步\n描述内容\n[/steps]';
            insertText(textarea, text);
        });
        
        $('[data-format="spoiler"]').on('click', function() {
            const textarea = $('.composer textarea');
            const text = '[spoiler=点击展开]\n隐藏内容\n[/spoiler]';
            insertText(textarea, text);
        });
    });
    
    function insertText(textarea, text) {
        const element = textarea[0];
        const start = element.selectionStart;
        const end = element.selectionEnd;
        const value = element.value;
        
        element.value = value.substring(0, start) + text + value.substring(end);
        element.selectionStart = element.selectionEnd = start + text.length;
        element.focus();
        textarea.trigger('input');
    }
}); 