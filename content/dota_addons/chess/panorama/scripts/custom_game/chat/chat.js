/* exported OnChatMessageEntered */
/* exported OnChatBlur */

"use strict";

var m_ChatMessagePanels = [];
var currentPlayerId;

function CreateChatMessagePanel(message, playerID) {
    //$.Msg("ReceiveChatMessage", message, playerID);
    var parentPanel = $("#chat-message-container");
    var panel = $.CreatePanel("Panel", parentPanel, "");
    panel.SetHasClass("chat-message-row", true);
    var label = $.CreatePanel("Label", panel, "");
    label.SetHasClass("chat-message", true);
    label.html = true;
    label.hittest = false;    
    label.text = "<span class=\"chat-name player-color-" + playerID + "\">" + Players.GetPlayerName(playerID) + ": </span>" + message;
    
    m_ChatMessagePanels.push(panel);
}

function CreateChatEventPanel(message, playerID) {
    //$.Msg("ReceiveChatEvent", message, playerID);
    var parentPanel = $("#chat-message-container");
    var panel = $.CreatePanel("Panel", parentPanel, "");
    panel.SetHasClass("chat-message-row", true);
    var label = $.CreatePanel("Label", panel, "");
    label.SetHasClass("chat-message", true);
    label.html = true;
    label.hittest = false;    
    var msg = message.replace(/%s/g, Players.GetPlayerName(playerID));
    label.text = "<span class=\"chat-name player-color-" + playerID + "\">" + msg + "</span>";
    
    m_ChatMessagePanels.push(panel);
}

function OnChatMessageEntered() {
    //$.Msg("OnChatMessageEntered", $("#chat-input").text);
    if ($("#chat-input").text != "") {
        GameEvents.SendCustomGameEventToServer("send_chat_message", {
            "message": $("#chat-input").text,
            "playerID": currentPlayerId
        });
    }
    $("#chat-input").text = "";
}

function ReceiveChatMessage(msg) {
    //$.Msg("ReceiveChatMessage", msg, $("#chat-message-container"));
    CreateChatMessagePanel(msg.message, parseInt(msg.playerId));
    $("#chat-message-container").ScrollToBottom();
}

function ReceiveChatEvent(msg) {
    //$.Msg("ReceiveChatEvent", msg, $("#chat-message-container"));
    var message;
    if (msg.l_message) {
        message = Object.keys(msg.l_message).sort().map(function (o) {
            var s = msg.l_message[o];
            return s.charAt(0) == "#" ? $.Localize(s) : s;
        }).join("");
    }
    else {
        message = msg.message;
    }
    CreateChatEventPanel(message, parseInt(msg.playerId));
    $("#chat-message-container").ScrollToBottom();
}

function SetChatFocus() {
    $("#chat-input").SetFocus();
}

function OnChatBlur() {
    //$.Msg("OnChatBlur");
    var root = $.GetContextPanel().GetParent().GetParent().GetParent();
    root.hittest = true;
    $.Schedule(2, function() {
        //$.Msg("hittest = false");
        root.hittest = false;
    });
}

(function() {
    currentPlayerId = Players.GetLocalPlayer();

    GameEvents.Subscribe("receive_chat_message", ReceiveChatMessage);
    GameEvents.Subscribe("receive_chat_event", ReceiveChatEvent);

    $.GetContextPanel().SetChatFocus = SetChatFocus;
})();