'use strict';

define('admin/plugins/tag-color-maker', ['settings'], function (Settings) {
    var ACP = {};

    ACP.init = function () {
        Settings.load('tag-color-maker', $('.tag-color-maker-settings'));

        $('#save').on('click', function () {
            Settings.save('tag-color-maker', $('.tag-color-maker-settings'), function () {
                console.log('设置已保存');
                
                if (window.parent && window.parent.reloadTagColors) {
                    window.parent.reloadTagColors();
                }
            });
        });

        setupColorPicker();
        setupPresets();
        loadExistingColors();
    };

    function setupColorPicker() {
        $('#addTagColor').on('click', function() {
            const tagName = $('#tagName').val().trim();
            const backgroundColor = $('#backgroundColor').val();
            const textColor = $('#textColor').val();

            if (!tagName) {
                console.log('请输入标签名');
                return;
            }

            addTagColorToPreview(tagName, backgroundColor, textColor);
            $('#tagName').val('');
        });
    }

    function setupPresets() {
        $('.add-preset').on('click', function() {
            const preset = $(this).data('preset');
            const presets = {
                'forge': { background: '#DFA86A', color: '#FAF4F3' },
                'neoforge': { background: '#E68C37', color: '#FFFFFF' },
                'fabric': { background: '#DBD0B4', color: '#111111' },
                'kubejs': { background: '#C186E6', color: '#FFFFFF' },
                'unsafe': { background: 'red', color: '#FFFFFF' }
            };

            if (presets[preset]) {
                addTagColorToPreview(preset, presets[preset].background, presets[preset].color);
            }
        });
    }

    function loadExistingColors() {
        setTimeout(function() {
            try {
                const existingColors = $('#tagColors').val();
                if (existingColors && existingColors !== '{}' && existingColors !== '') {
                    const colors = JSON.parse(existingColors);
                    updateColorPreview(colors);
                } else {
                    const defaultColors = {
                        'forge': { background: '#DFA86A', color: '#FAF4F3' },
                        'neoforge': { background: '#E68C37', color: '#FFFFFF' },
                        'fabric': { background: '#DBD0B4', color: '#111111' },
                        'kubejs': { background: '#C186E6', color: '#FFFFFF' },
                        'unsafe': { background: 'red', color: '#FFFFFF' }
                    };
                    updateColorPreview(defaultColors);
                    $('#tagColors').val(JSON.stringify(defaultColors));
                }
            } catch (e) {
                console.log('加载颜色配置失败:', e);
            }
        }, 100);
    }

    function addTagColorToPreview(tagName, backgroundColor, textColor) {
        const existingBadge = $(`#colorPreview .badge[data-tag="${tagName}"]`);
        if (existingBadge.length) {
            existingBadge.remove();
        }

        const badge = $(`
            <span class="badge me-2 mb-2 position-relative" data-tag="${tagName}" style="background-color: ${backgroundColor}; color: ${textColor}; padding-right: 2rem;">
                ${tagName}
                <button type="button" class="btn-close position-absolute top-50 end-0 translate-middle-y me-2" aria-label="Remove" style="font-size: 0.7rem; opacity: 0.8;"></button>
            </span>
        `);

        badge.find('.btn-close').on('click', function() {
            badge.remove();
            updateHiddenInput();
        });

        $('#colorPreview').append(badge);
        updateHiddenInput();
    }

    function updateColorPreview(colors) {
        $('#colorPreview').empty();
        if (Object.keys(colors).length === 0) {
            $('#colorPreview').html('<p class="text-muted mb-0">暂无标签颜色配置</p>');
        } else {
            Object.keys(colors).forEach(function(tagName) {
                const color = colors[tagName];
                addTagColorToPreview(tagName, color.background, color.color);
            });
        }
    }

    function updateHiddenInput() {
        const colors = {};
        $('#colorPreview .badge').each(function() {
            const tagName = $(this).data('tag');
            const backgroundColor = $(this).css('background-color');
            const textColor = $(this).css('color');
            
            colors[tagName] = {
                background: rgbToHex(backgroundColor),
                color: rgbToHex(textColor)
            };
        });

        $('#tagColors').val(JSON.stringify(colors));
    }

    function rgbToHex(rgb) {
        if (rgb.startsWith('#')) return rgb;
        
        const result = rgb.match(/\d+/g);
        if (!result || result.length < 3) return rgb;
        
        return "#" + ((1 << 24) + (parseInt(result[0]) << 16) + (parseInt(result[1]) << 8) + parseInt(result[2])).toString(16).slice(1);
    }

    return ACP;
}); 