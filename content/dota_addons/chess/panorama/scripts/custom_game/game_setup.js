/* exported OnTimeControlChanged */

"use strict";

var timeTotalSlider;
var timeIncrementSlider;

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
    $.Schedule(0.1, UpdateSliders);
}

function OnTimeControlChanged() {
    var timeControl = $("#TimeControl");
    var timeControlValue = timeControl.GetSelected().id;
    $.Msg(timeControlValue);
    $("#TimeControlOptions").visible = timeControlValue == "time_control_timed";
}

(function() {
    timeTotalSlider = $("#TimeTotalSlider");
    timeTotalSlider.min = 0;
    timeTotalSlider.max = 34;
    timeTotalSlider.value = 1;
    
    timeIncrementSlider = $("#TimeIncrementSlider");
    timeIncrementSlider.min = 0;
    timeIncrementSlider.max = 30;
    timeIncrementSlider.value = 8;
    $.Msg("game_setup.js");
    UpdateSliders();
})();