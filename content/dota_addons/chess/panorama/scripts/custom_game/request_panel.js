"use strict";

function SetText(message) {
    $("#action-message").text = message;
}

function OnAcceptPressed() {
    $.Msg("OnAcceptPressed");
    $.GetContextPanel().AcceptHandler($.GetContextPanel());
}

function OnDeclinePressed() {
    $.Msg("OnDeclinePressed");
    $.GetContextPanel().DeclineHandler($.GetContextPanel());
}

(function() {
    $.GetContextPanel().SetText = SetText;
})();