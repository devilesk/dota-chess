/* exported OnTimeControlChanged */

"use strict";

var timeControl;
var timeControlValue = "time_control_timed";
var timeTotalSlider;
var timeIncrementSlider;
var aiDifficultySlider;

function getTimeTotalValue(index) {
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
    if (index == 0) return 0;
    if (index == 1) return 1;
    return getTimeTotalValue(index + 4);
}

function UpdateSliders() {
    $("#TimeTotalSliderValue").text = getTimeTotalValue(Math.round(timeTotalSlider.value));
    $("#TimeIncrementSliderValue").text = getTimeIncrementValue(Math.round(timeIncrementSlider.value));
    $("#AIDifficultySliderValue").text = Math.round(aiDifficultySlider.value);
    $.Schedule(0.1, UpdateSliders);
}

function OnTimeControlChanged() {
    timeControlValue = timeControl.GetSelected().id;
    $.Msg(timeControlValue);
    $("#TimeControlOptions").visible = timeControlValue == "time_control_timed";
}

function OnReceivedGameSetupEnd() {
    $.Msg("OnReceivedGameSetupEnd");
    GameEvents.SendCustomGameEventToServer("game_setup_options", {
        timeControl: timeControlValue,
        timeTotal: $("#TimeTotalSliderValue").text,
        timeIncrement: $("#TimeIncrementSliderValue").text,
        aiDifficulty: $("#AIDifficultySliderValue").text
    });
}

(function() {
    timeControl = $("#TimeControl");
    timeControlValue = timeControl.GetSelected().id;
    
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