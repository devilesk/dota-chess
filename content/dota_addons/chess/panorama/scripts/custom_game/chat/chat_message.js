"use strict";

function SetChatMessage(message, playerID) {
    $('#chat-message').text = '<span class="chat-name player-color-' + playerID + '">' + Players.GetPlayerName(playerID) + ': </span>' + message;
    $('#chat-message').html = true;
}

function SetChatEvent(message, playerID) {
    var msg = message.replace(/%s/g, Players.GetPlayerName(playerID));
    $('#chat-message').text = '<span class="chat-name player-color-' + playerID + '">' + msg + '</span>';
    $('#chat-message').html = true;
}

(function() {
    $.GetContextPanel().SetChatMessage = SetChatMessage;
    $.GetContextPanel().SetChatEvent = SetChatEvent;
})();