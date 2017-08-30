"use strict";

var m_ChatMessagePanels = [];
var localPlayerId;
var currentPlayerId;

function CreateChatMessagePanel(message, playerID) {
    $.Msg('ReceiveChatMessage', message, playerID);
    var parentPanel = $("#chat-message-container");
    var chatMessagePanel = $.CreatePanel("Panel", parentPanel, "");
    chatMessagePanel.BLoadLayout("file://{resources}/layout/custom_game/chat/chat_message.xml", false, false);
    chatMessagePanel.SetChatMessage(message, playerID);
    m_ChatMessagePanels.push(chatMessagePanel);
}

function CreateChatEventPanel(message, playerID) {
    $.Msg('ReceiveChatEvent', message, playerID);
    var parentPanel = $("#chat-message-container");
    var chatMessagePanel = $.CreatePanel("Panel", parentPanel, "");
    chatMessagePanel.BLoadLayout("file://{resources}/layout/custom_game/chat/chat_message.xml", false, false);
    chatMessagePanel.SetChatEvent(message, playerID);
    m_ChatMessagePanels.push(chatMessagePanel);
}

function OnChatMessageEntered() {
    $.Msg('OnChatMessageEntered', $('#chat-input').text);
    if ($('#chat-input').text != "") {
        GameEvents.SendCustomGameEventToServer("send_chat_message", {
            "message": $('#chat-input').text,
            "playerID": currentPlayerId
        });
    }
    $('#chat-input').text = "";
    $.Msg(GameUI.CustomUIConfig());
}

function ReceiveChatMessage(msg) {
    $.Msg('ReceiveChatMessage', msg, $('#chat-message-container'));
    CreateChatMessagePanel(msg.message, parseInt(msg.playerId));
    $('#chat-message-container').ScrollToBottom();
}

function ReceiveChatEvent(msg) {
    $.Msg('ReceiveChatEvent', msg, $('#chat-message-container'));
    CreateChatEventPanel(msg.message, parseInt(msg.playerId));
    $('#chat-message-container').ScrollToBottom();
}

function SetChatFocus() {
    $('#chat-input').SetFocus();
}

function OnChatBlur() {
    $.Msg("OnChatBlur");
    var root = $.GetContextPanel().GetParent().GetParent().GetParent();
    root.hittest = true;
    $.Schedule(2, function() {
        $.Msg("hittest = false");
        root.hittest = false;
    });
}

(function() {
    localPlayerId = Players.GetLocalPlayer();
    currentPlayerId = Players.GetLocalPlayer();

    GameEvents.Subscribe("receive_chat_message", ReceiveChatMessage);
    GameEvents.Subscribe("receive_chat_event", ReceiveChatEvent);

    $.GetContextPanel().SetChatFocus = SetChatFocus;
})();