"use strict";

(function() {

    GameUI.CustomUIConfig().BoardOverlay = {
        contextPanel: $.GetContextPanel()
    };

    GameUI.CustomUIConfig().BoardOverlay.scalePos = function (pos) {
        var result = {
            x: pos.x / $.GetContextPanel().actualuiscale_x,
            y: pos.y / $.GetContextPanel().actualuiscale_y
        };
        $.Msg("scalePos", pos, result);
        return result;
    }
    $.Msg("board_overlay.js");
})();