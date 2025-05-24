'use strict';

define('admin/plugins/tag-color-maker', ['settings'], function (Settings) {
    var ACP = {};

    ACP.init = function () {
        Settings.load('tag-color-maker', $('.tag-color-maker-settings'));

        $('#save').on('click', function () {
            Settings.save('tag-color-maker', $('.tag-color-maker-settings'), function () {
                app.alert({
                    type: 'success',
                    alert_id: 'tag-color-maker-saved',
                    title: 'Settings Saved',
                    message: 'Tag color settings have been saved successfully!',
                    timeout: 2000
                });
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
                app.alert({
                    type: 'warning',
                    alert_id: 'tag-name-required',
                    title: 'Tag Name Required',
                    message: 'Please enter a tag name.',
                    timeout: 2000
                });
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
        try {
            const existingColors = $('#tagColors').val();
            if (existingColors) {
                const colors = JSON.parse(existingColors);
                updateColorPreview(colors);
            }
        } catch (e) {
            console.log('No existing colors to load');
        }
    }

    function addTagColorToPreview(tagName, backgroundColor, textColor) {
        const existingBadge = $(`#colorPreview .badge[data-tag="${tagName}"]`);
        if (existingBadge.length) {
            existingBadge.remove();
        }

        const badge = $(`
            <span class="badge me-2 mb-2" data-tag="${tagName}" style="background-color: ${backgroundColor}; color: ${textColor};">
                ${tagName}
                <button type="button" class="btn-close btn-close-white ms-2" aria-label="Remove"></button>
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
        Object.keys(colors).forEach(function(tagName) {
            const color = colors[tagName];
            addTagColorToPreview(tagName, color.background, color.color);
        });
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