"use strict"

var chessSymbols = {
    white: {
        /*    king: "&#9812;",
            queen: "&#9813;",
            rook: "&#9814;",
            bishop: "&#9815;",
            knight: "&#9816;",
            pawn: "&#9817;"
        */
        king: "&#9818;",
        queen: "&#9819;",
        rook: "&#9820;",
        bishop: "&#9821;",
        knight: "&#9822;",
        pawn: "&#9823;"
    },
    black: {
        king: "&#9818;",
        queen: "&#9819;",
        rook: "&#9820;",
        bishop: "&#9821;",
        knight: "&#9822;",
        pawn: "&#9823;"
    }
}

var labelClass;

function SetPiece(piece, color) {
    if (piece) {
        $('#square-label').text = chessSymbols[color][piece];
    } else {
        $('#square-label').text = "";
    }
    ["white", "black"].forEach(function(c) {
        $('#square-label').SetHasClass(c, color == c);
    });
}

function SetText(text) {
    $('#square-label').text = text;
}

(function() {
    $.GetContextPanel().SetText = SetText;
    $.GetContextPanel().SetPiece = SetPiece;
})();