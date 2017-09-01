/* exported OnTimeControlChanged */

"use strict";

var timeControl;
var timeTotalSlider;
var timeIncrementSlider;
var aiDifficultySlider;

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
    $("#TimeTotalSliderValue").text = getTimeTotalValue();
    $("#TimeIncrementSliderValue").text = getTimeIncrementValue();
    $("#AIDifficultySliderValue").text = Math.round(aiDifficultySlider.value);
    $.Schedule(0.1, UpdateSliders);
}

function OnTimeControlChanged() {
    $("#TimeControlOptions").visible = getTimeControlValue();
}

function OnReceivedGameSetupEnd() {
    $.Msg("OnReceivedGameSetupEnd");
    GameEvents.SendCustomGameEventToServer("game_setup_options", {
        timeControl: getTimeControlValue(),
        timeTotal: $("#TimeTotalSliderValue").text,
        timeIncrement: $("#TimeIncrementSliderValue").text,
        aiDifficulty: $("#AIDifficultySliderValue").text
    });
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

    UpdateSliders();
    
    GameEvents.Subscribe("game_setup_end", OnReceivedGameSetupEnd);
    
    $("#AIControlGroup").visible = Game.GetAllPlayerIDs().length == 1;
    
    $.Msg("game_setup.js");
})();