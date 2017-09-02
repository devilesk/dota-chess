/* exported OnTimeControlChanged */

"use strict";

var timeControl;
var timeTotalSlider;
var timeIncrementSlider;
var aiDifficultySlider;
var gameSetupValues = {
    timeControl: true,
    timeTotal: 9,
    timeIncrement: 8,
    aiDifficulty: 2
};

function getTimeControlValue() {
    return timeControl.GetSelected().id == "time_control_timed";
}

function getTimeTotalValue(index) {
    if (index == null) index = Math.round(timeTotalSlider.value);
    if (index <= 5) {
        switch (index) {
            case 0: return 0;
            case 1: return 1/4;
            case 2: return 1/2;
            case 3: return 3/4;
            case 4: return 1;
            case 5: return 1.5;
        }
    }
    else if (index <= 24) {
        return index - 4;
    }
    else if (index <= 29) {
        return (index - 20) * 5;
    }
    else {
        return (index - 28) * 30;
    }
}

function getTimeIncrementValue(index) {
    if (index == null) index = Math.round(timeIncrementSlider.value);
    if (index == 0) {
        if (getTimeTotalValue() == 0) return 1;
        return 0;
    }
    if (index == 1) return 1;
    return getTimeTotalValue(index + 4);
}

function UpdateSliders() {
    var newValues = {
        timeTotal: getTimeTotalValue(),
        timeIncrement: getTimeIncrementValue(),
        aiDifficulty: Math.round(aiDifficultySlider.value)
    };
    $("#TimeTotalSliderValue").text = newValues.timeTotal;
    $("#TimeIncrementSliderValue").text = newValues.timeIncrement;
    $("#AIDifficultySliderValue").text = newValues.aiDifficulty;
    if (
        newValues.timeTotal != gameSetupValues.timeTotal ||
        newValues.timeIncrement != gameSetupValues.timeIncrement ||
        newValues.aiDifficulty != gameSetupValues.aiDifficulty
    ) {
        gameSetupValues.timeTotal = newValues.timeTotal;
        gameSetupValues.timeIncrement = newValues.timeIncrement;
        gameSetupValues.aiDifficulty = newValues.aiDifficulty;
        SendGameSetupValues();
    }
    if (Game.GameStateIsBefore(DOTA_GameState.DOTA_GAMERULES_STATE_PRE_GAME)) $.Schedule(0.1, UpdateSliders);
}

function UpdateValues() {
    var newValues = CustomNetTables.GetTableValue( "game_setup", "options" );
    $.Msg("UpdateValues", newValues);
    if (newValues) {
        $("#TimeControlValue").text = newValues.timeControl ? "TIMED" : "UNLIMITED";
        $("#TimeTotalSliderValue").text = newValues.timeTotal;
        $("#TimeIncrementSliderValue").text = newValues.timeIncrement;
        $("#AIDifficultySliderValue").text = newValues.aiDifficulty;
    }
    if (Game.GameStateIsBefore(DOTA_GameState.DOTA_GAMERULES_STATE_PRE_GAME)) $.Schedule(0.5, UpdateValues);
}

function OnTimeControlChanged() {
    gameSetupValues.timeControl = getTimeControlValue();
    $("#TimeControlOptions").visible = gameSetupValues.timeControl;
    $("#TimeControlValue").text = timeControl.GetSelected().text;
    SendGameSetupValues();
}

function SendGameSetupValues() {
    $.Msg("SendGameSetupValues", gameSetupValues);
    GameEvents.SendCustomGameEventToServer("game_setup_options", gameSetupValues);
}

function OnReceivedGameSetupEnd() {
    $.Msg("OnReceivedGameSetupEnd");
    SendGameSetupValues();
}

function InitGameSetupHost() {
    if (CustomNetTables.GetTableValue( "game_setup", "host" ).player_id == Players.GetLocalPlayer()) {
        $.Msg("InitGameSetupHost is hot");
        UpdateSliders();
    }
    else {
        $.Msg("InitGameSetupHost not host");
        timeControl.AddClass("hidden");
        $("#TimeTotalSliderPanel").AddClass("hidden");
        $("#TimeIncrementSliderPanel").AddClass("hidden");
        $("#AIDifficultySliderPanel").AddClass("hidden");
        UpdateValues();
    }
}

(function() {
    timeControl = $("#TimeControl");
    
    timeTotalSlider = $("#TimeTotalSlider");
    timeTotalSlider.min = 0;
    timeTotalSlider.max = 34;
    timeTotalSlider.value = 9;
    
    timeIncrementSlider = $("#TimeIncrementSlider");
    timeIncrementSlider.min = 0;
    timeIncrementSlider.max = 30;
    timeIncrementSlider.value = 8;
    
    aiDifficultySlider = $("#AIDifficultySlider");
    aiDifficultySlider.min = 1;
    aiDifficultySlider.max = 3;
    aiDifficultySlider.value = 2;

    GameEvents.Subscribe("game_setup_end", OnReceivedGameSetupEnd);
    
    $("#AIControlGroup").visible = Game.GetAllPlayerIDs().length == 1;
    
    InitGameSetupHost();
    
    $.Msg("game_setup.js");
})();