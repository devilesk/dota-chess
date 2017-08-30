"use strict";

var _;

(function() {

    _ = GameUI.CustomUIConfig().UtilLibrary;

    function Dialog(options) {
        //$.Msg("Dialog constructor");
        this.controls = [];
        _.Panel.call(this, options);
        if (this.controls.length) this.controls[0].panel.SetFocus();
    }
    _.inherits(Dialog, _.Panel);
    Dialog.prototype.close = function() {
        this.panel.DeleteAsync(0);
    }
    Dialog.prototype.getControl = function(input) {
        return this.controls.indexOf(input);
    }
    Dialog.prototype.focusNextInput = function(input) {
        this.controls[(this.getControl(input) + 1) % this.controls.length].panel.SetFocus();
    }

    GameUI.CustomUIConfig().DialogLibrary = {
        contextPanel: $.GetContextPanel(),
        Dialog: Dialog
    };

    $.Msg("dialog/main.js");
})();