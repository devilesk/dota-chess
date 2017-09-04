"use strict";

var pieceText = [
    "",
    "&#9823;", // pawn
    "&#9822;", // knight
    "&#9821;", // bishop
    "&#9820;", // rook
    "&#9819;", // queen
    "&#9818;", // king
];

function SetPiece(piece, color) {
    if (piece) {
        $("#square-label").text = pieceText[piece];
    } else {
        $("#square-label").text = "";
    }
    [8, 0].forEach(function(c) {
        $("#square-label").SetHasClass(c == 0 ? "black" : "white", color == c);
    });
}

function SetText(text) {
    $("#square-label").text = text;
}

(function() {
    $.GetContextPanel().SetText = SetText;
    $.GetContextPanel().SetPiece = SetPiece;
})();