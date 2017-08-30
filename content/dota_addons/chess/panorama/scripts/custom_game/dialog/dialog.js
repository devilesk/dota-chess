"use strict";

var _dialog;

function SetDialog(dialog) {
    _dialog = dialog;
}

function GetDialog() {
    return _dialog;
}

(function() {

    $.GetContextPanel().SetDialog = SetDialog;
    $.GetContextPanel().GetDialog = GetDialog;

    //$.Msg("dialog/dialog.js");
})();