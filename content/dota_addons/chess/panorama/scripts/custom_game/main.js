/* exported OnOfferDrawPressed */
/* exported OnAcceptDrawPressed */
/* exported OnDeclineDrawPressed */
/* exported OnResignPressed */
/* exported OnCancelActionPressed */
/* exported OnConfirmActionPressed */
/* exported OnFlipBoardPressed */
/* exported OnUndoPressed */
/* exported OnAcceptUndoPressed */
/* exported OnDeclineUndoPressed */
/* exported OnSwapPressed */
/* exported OnAcceptSwapPressed */
/* exported OnDeclineSwapPressed */
/* exported OnRematchPressed */
/* exported OnTogglePlayerPressed */
/* exported ShowInfoDialog */
/* global InstantiateChatPanel */

"use strict";

var _ = GameUI.CustomUIConfig().UtilLibrary;
var DialogLibrary;
var m_ChatPanel;
var m_Board = [];
var boardState;
var capturedPieces = [];
var timeControl = true;
var timeRemaining = {};
var timer = 0;
var toMove = 8; // 0 == black, 8 == white
var numPly = 0;
var player_sides = {
    8: null,
    0: null
};
var isPlayer = (Game.GetLocalPlayerInfo().player_team_id == DOTATeam_t.DOTA_TEAM_GOODGUYS) || (Game.GetLocalPlayerInfo().player_team_id == DOTATeam_t.DOTA_TEAM_BADGUYS);
var mySide = null;
var moves;
var lastMove;
var selectedSquare;
var bottomSide = 8;
var gameInProgress = false;

var lookupSquare = (function () {
    function MakeSquare(row, column) {
        return ((row + 2) << 4) | (column + 4);
    }
    
    var lookupSquare = {};
    
    for (var i = 0; i < 8; i++) {
        for (var j = 0; j < 8; j++) {
            //_.DebugMsg(i, ", ", j, " ", MakeSquare(i, j));
            lookupSquare[MakeSquare(i, j)] = {
                x: j,
                y: i
            };
        }
    }
    return lookupSquare;
})();

var ranks = [1, 2, 3, 4, 5, 6, 7, 8];
var files = ["a", "b", "c", "d", "e", "f", "g", "h"];

//var colorBlack = 0x10;
//var colorWhite = 0x08;

var pieceEmpty = 0x00;
var piecePawn = 0x01;
var pieceKnight = 0x02;
var pieceBishop = 0x03;
var pieceRook = 0x04;
var pieceQueen = 0x05;
//var pieceKing = 0x06;

var pieceText = [
    "",
    "pawn", // pawn
    "knight", // knight
    "bishop", // bishop
    "rook", // rook
    "queen", // queen
    "king", // king
];

//var moveflagPromotion = 0x10 << 16;
//var moveflagPromoteKnight = 0x20 << 16;
//var moveflagPromoteQueen = 0x40 << 16;
//var moveflagPromoteBishop = 0x80 << 16;

function pad(num, size, ch) {
    ch = ch || "0";
    var s = num + "";
    while (s.length < size) s = ch + s;
    return s;
}

function formatTime(t) {
    if (timeControl) {
        if (t < 100) {
            return " " +pad(Math.floor(t / 600), 2) + ":" + pad(Math.floor(t / 10) % 60, 2) + "." + Math.floor(t % 10);
        }
        else {
            return " " +pad(Math.floor(t / 600), 2) + ":" + pad(Math.floor(t / 10) % 60, 2);
        }
    }
    else {
        return "";
    }
}

function GetFEN() {
    var netTable = CustomNetTables.GetTableValue( "chess", "fen" );
    return netTable ? netTable.value : "";
}

function GetPGN() {
    var pgn = "";
    for (var i = 1; i <= numPly; i++) {
        var data = CustomNetTables.GetTableValue("move_history", i);
        if (!data || _.IsEmpty(data)) break;
        
        if (i % 2 == 1) {
            pgn += Math.ceil(i / 2) + ". ";
        }
        pgn += data.san.trim() + " ";
    }
    return pgn.trim();
}

function OnPromote(data) {
    _.DebugMsg("OnPromote");
    new DialogLibrary.Dialog({
        parentPanel: DialogLibrary.contextPanel,
        id: "dialog-container",
        hittest: true,
        children: [{
            id: "contents-container",
            cssClasses: ["contents-container", "promotion-dialog"],
            style: {},
            children: [
                {
                    cssClasses: ["control"],
                    id: "control-1",
                    children: [{
                        events: {
                            OnActivate: function() {
                                SendPromotionMove(data, pieceQueen);
                                this.root.close();
                            },
                            OnTabForward: function() {
                                this.root.focusNextInput(this);
                            }
                        },
                        panelType: "Button",
                        init: function() {
                            this.root.controls.push(this);
                        },
                        cssClasses: ["btn"],
                        children: [{
                            cssClasses: ["btn-promote", "queen"],
                            panelType: "Panel",
                            skipBindHandlers: true
                        }]
                    }]
                },
                {
                    cssClasses: ["control square"],
                    id: "control-2",
                    children: [{
                        events: {
                            OnActivate: function() {
                                SendPromotionMove(data, pieceRook);
                                this.root.close();
                            },
                            OnTabForward: function() {
                                this.root.focusNextInput(this);
                            }
                        },
                        panelType: "Button",
                        init: function() {
                            this.root.controls.push(this);
                        },
                        cssClasses: ["btn"],
                        children: [{
                            cssClasses: ["btn-promote", "rook"],
                            panelType: "Panel",
                            skipBindHandlers: true
                        }]
                    }]
                },
                {
                    cssClasses: ["control"],
                    id: "control-3",
                    children: [{
                        events: {
                            OnActivate: function() {
                                SendPromotionMove(data, pieceBishop);
                                this.root.close();
                            },
                            OnTabForward: function() {
                                this.root.focusNextInput(this);
                            }
                        },
                        panelType: "Button",
                        init: function() {
                            this.root.controls.push(this);
                        },
                        cssClasses: ["btn"],
                        children: [{
                            cssClasses: ["btn-promote", "bishop"],
                            panelType: "Panel",
                            skipBindHandlers: true
                        }]
                    }]
                },
                {
                    cssClasses: ["control"],
                    id: "control-4",
                    children: [{
                        events: {
                            OnActivate: function() {
                                SendPromotionMove(data, pieceKnight);
                                this.root.close();
                            },
                            OnTabForward: function() {
                                this.root.focusNextInput(this);
                            }
                        },
                        panelType: "Button",
                        init: function() {
                            this.root.controls.push(this);
                        },
                        cssClasses: ["btn"],
                        children: [{
                            cssClasses: ["btn-promote", "knight"],
                            panelType: "Panel",
                            skipBindHandlers: true
                        }]
                    }]
                }
            ]
        }]
    });
}

function SendPromotionMove(data, pieceType) {
    data.promotionType = pieceType;
    OnDropPiece(data);
}

function OnDropPiece(data) {
    uiState.swapPressed = false;
    uiState.drawPressed = false;
    uiState.resignPressed = false;
    GameEvents.SendCustomGameEventToServer("drop_piece", data);
    DeclineDraw();
    DeclineUndo();
    DeclineSwap();
    UpdateUI();
}

function ShowInfoDialog() {
    new DialogLibrary.Dialog({
        parentPanel: DialogLibrary.contextPanel,
        id: "dialog-container",
        hittest: true,
        children: [{
            id: "contents-container",
            cssClasses: ["contents-container"],
            style: {
                width: 400
            },
            children: [
                {
                    cssClasses: ["control", "horizontal-center"],
                    id: "control-1",
                    children: [{
                        id: "label-1",
                        panelType: "Label",
                        text: "FEN"
                    }]
                },
                {
                    cssClasses: ["control", "horizontal-center"],
                    id: "control-2",
                    children: [{
                        panelType: "TextEntry",
                        init: function() {
                            this.text(GetFEN());
                        },
                        cssClasses: ["fen-output"]
                    }]
                },
                {
                    cssClasses: ["control", "horizontal-center"],
                    id: "control-3",
                    children: [{
                        id: "label-3",
                        panelType: "Label",
                        text: "PGN"
                    }]
                },
                {
                    cssClasses: ["control", "horizontal-center"],
                    id: "control-4",
                    children: [{
                        panelType: "TextEntry",
                        init: function() {
                            this.text(GetPGN());
                        },
                        cssClasses: ["pgn-output"]
                    }]
                },
                {
                    cssClasses: ["control", "horizontal-center"],
                    id: "control-5",
                    children: [{
                        events: {
                            OnActivate: function() {
                                this.root.close();
                            },
                            OnTabForward: function() {
                                this.root.focusNextInput(this);
                            }
                        },
                        panelType: "Button",
                        init: function() {
                            this.root.controls.push(this);
                        },
                        cssClasses: ["btn"],
                        children: [{
                            panelType: "Label",
                            text: $.Localize("#close"),
                            skipBindHandlers: true
                        }]
                    }]
                }
            ]
        }]
    });
}

function OnGameEnd(prompt) {
    gameInProgress = false;
    UpdateUI();
    new DialogLibrary.Dialog({
        parentPanel: DialogLibrary.contextPanel,
        id: "dialog-container",
        hittest: true,
        children: [{
            id: "contents-container",
            cssClasses: ["contents-container"],
            style: {
                width: 400
            },
            children: [
                {
                    cssClasses: ["control", "horizontal-center"],
                    id: "control-1",
                    children: [{
                        id: "label-1",
                        panelType: "Label",
                        text: prompt
                    }]
                },
                {
                    cssClasses: ["control", "horizontal-center"],
                    id: "control-2",
                    children: [{
                        events: {
                            OnActivate: function() {
                                this.root.close();
                            },
                            OnTabForward: function() {
                                this.root.focusNextInput(this);
                            }
                        },
                        panelType: "Button",
                        init: function() {
                            this.root.controls.push(this);
                        },
                        cssClasses: ["btn"],
                        children: [{
                            panelType: "Label",
                            text: $.Localize("close"),
                            skipBindHandlers: true
                        }]
                    }]
                }
            ]
        }]
    });
}

function OnDraw() {
    OnGameEnd($.Localize("gameover_draw"));
}

function CreateChatPanel() {
    var parentPanel = $("#chat-container");
    parentPanel.RemoveAndDeleteChildren();
    m_ChatPanel = $.CreatePanel("Panel", parentPanel, "");
    m_ChatPanel.BLoadLayoutSnippet("chat-panel");
    InstantiateChatPanel(m_ChatPanel);
}

function CreateBoard() {
    var parentPanel = $("#board");
    var i, j, rowPanel;
    if (bottomSide == 0) {
        for (i = 0; i < 8; i++) {
            rowPanel = $.CreatePanel("Panel", parentPanel, "rank-" + ranks[i]);
            rowPanel.SetHasClass("rank", true);
            
            CreateRankFileLabel(i);
            
            for (j = 7; j >= 0; j--) {
                m_Board.unshift(CreateSquare(rowPanel, i, j));
            }
        }
    }
    else {
        for (i = 7; i >= 0; i--) {
            rowPanel = $.CreatePanel("Panel", parentPanel, "rank-" + ranks[i]);
            rowPanel.SetHasClass("rank", true);
            
            CreateRankFileLabel(i);
            
            for (j = 0; j < 8; j++) {
                m_Board.push(CreateSquare(rowPanel, i, j));
            }
        }
    }
}

function CreateRankFileLabel(i) {
    var rankPanel = $("#rank-container");
    var rank = $.CreatePanel("Panel", rankPanel, "rank-label-container-" + ranks[i]);
    rank.SetHasClass("rank-label", true);
    var rankLabel = $.CreatePanel("Label", rank, "rank-label-" + ranks[i]);
    rankLabel.text = ranks[i];
    
    var filePanel = $("#file-container");
    var file = $.CreatePanel("Panel", filePanel, "file-label-container-" + files[7-i]);
    file.SetHasClass("file-label", true);
    var fileLabel = $.CreatePanel("Label", file, "file-label-" + files[7-i]);
    fileLabel.text = files[7-i];
}

function CreateSquare(rowPanel, i, j) {
    var squarePanel = $.CreatePanel("Panel", rowPanel, "");
    squarePanel.SetHasClass("square-wrapper", true);
    squarePanel.SetHasClass((i + j) % 2 == 1 ? "white" : "black", true);
    var sq = new Square({
        row: 7 - i,
        col: j,
        file: files[j],
        rank: ranks[i],
        color: (i + j) % 2 == 1 ? "white" : "black",
        parentPanel: squarePanel,
        draggable: true,
        droppable: true
    });
    return sq;
}

function RedrawBoard() {
    $("#board").RemoveAndDeleteChildren();
    $("#rank-container").RemoveAndDeleteChildren();
    $("#file-container").RemoveAndDeleteChildren();
    m_Board.length = 0;
    CreateBoard();
    RedrawPieces(boardState);
    RedrawCapturedPieces();
    DeselectSquare();
    $.Schedule(0.5, function () {
        HighlightLastMove();
    });
}

function RedrawCapturedPieces() {
    $("#captured-top").RemoveAndDeleteChildren();
    $("#captured-bottom").RemoveAndDeleteChildren();
    capturedPieces.forEach(function (data) {
        if (data) data[2] = RenderCapturedPiece(data[1], data[0]);
    });
}


function Square(options) {
    //_.DebugMsg("Square constructor");
    var self = this;
    this.color = _.observable(options.color);
    this.row = _.observable(options.row);
    this.col = _.observable(options.col);
    this.file = _.observable(options.file);
    this.rank = _.observable(options.rank);
    this.selected = _.observable(false);
    this.hasPiece = _.observable(false);
    this.piece = _.observable(null);
    this.pieceOwner = _.observable(null);
    options.id = options.id || "square-" + options.file + options.rank;
    options.panel = CreateSquarePanel(options.parentPanel, options.id);
    _.Panel.call(this, options);
    if (this.panel) {
        this.panel.SetHasClass(this.color(), true);
        this.panel.GetParent().SetHasClass(this.color(), true);
        if (this.hasPiece()) this.panel.SetPiece(this.piece(), this.pieceOwner());
        this.draggable(this.hasPiece());
        this.hasPiece.subscribe(function(newValue) {
            self.draggable(newValue);
            //self.droppable(newValue);
        });
        this.selected.subscribe(function(newValue) {
            self.panel.SetHasClass("selected", newValue && self.hasPiece());
            self.panel.GetParent().SetHasClass("selected", newValue && self.hasPiece());
        });
        this.hittest(true);
    }
}
_.inherits(Square, _.Panel);
_.extend(Square.prototype, {
    render: function() {
        //_.DebugMsg("render", this.piece(), this.pieceOwner());
        this.panel.SetPiece(this.piece(), this.pieceOwner());
        this.hittest(true);
    },
    setPiece: function(piece, owner) {
        this.hasPiece(true);
        this.piece(piece);
        this.pieceOwner(owner);
    },
    clearPiece: function() {
        this.hasPiece(false);
        this.piece(null);
        this.pieceOwner(null);
    },
    pos: function() {
        return [this.row(), this.col()];
    },
    OnContextMenu: function() {
        // highlight this panel as a drop target
        _.DebugMsg("Square OnContextMenu ", this.panel.id);
        //if (this.panel) this.panel.RemoveClass("highlight");
    },
    OnActivate: function() {
        if (!isPlayer) return;
        if (Game.IsGamePaused()) return;
        _.DebugMsg("OnActivate", this.panel.id);
        if (selectedSquare && selectedSquare != this && selectedSquare.hasPiece()) {
            var data = {
                startX: selectedSquare.col(),
                startY: selectedSquare.row(),
                endX: this.col(),
                endY: this.row(),
                playerId: Players.GetLocalPlayer(),
                playerSide: mySide,
                offerDraw: uiState.drawPressed
            };

            if (selectedSquare.piece() == piecePawn && this.row() % 7 == 0) {
                OnPromote(data);
            } 
            else {
                OnDropPiece(data);
            }
        }

        var isSelected = this.selected();
        ClearHighlight();
        this.selected(!isSelected);
        if (this.selected()) {
            if (this.hasPiece()) HighlightMoves(this);
            selectedSquare = this;
        }
        else {
            selectedSquare = null;
        }
    },
    OnDragEnter: function(a, draggedPanel) {
        _.DebugMsg("Square OnDragEnter ", this.panel.id);
        // highlight this panel as a drop target
        if (this.droppable() && this.panel) {
            this.panel.SetHasClass("potential_drop_target", true);
            this.panel.GetParent().SetHasClass("potential_drop_target", true);
        }
    },
    OnDragLeave: function(panelId, draggedPanel, square) {
        // un-highlight this panel
        _.DebugMsg("Square OnDragLeave ", this.panel.id);
        if (this.panel) {
            this.panel.SetHasClass("potential_drop_target", false);
            this.panel.GetParent().SetHasClass("potential_drop_target", false);
        }
    },
    OnDragDrop: function(panelId, draggedPanel, square) {
        if (!isPlayer) return;
        if (Game.IsGamePaused()) return;
        _.DebugMsg("Square OnDragDrop ", this.panel.id, ", ", GameUI.GetCursorPosition());
        var draggedSquare = draggedPanel.square;
        _.DebugMsg("drop ", draggedSquare.panel.id, " to ", square.panel.id);
        _.DebugMsg("drop ", draggedSquare.pos(), " to ", square.pos(), " ", draggedSquare.hasPiece());
        _.DebugMsg("drop ", draggedSquare.piece(), " ", square.row(), " ", square.row() % 7, " ", square.col());
        var data = {
            startX: draggedSquare.col(),
            startY: draggedSquare.row(),
            endX: square.col(),
            endY: square.row(),
            playerId: Players.GetLocalPlayer(),
            playerSide: mySide,
            offerDraw: uiState.drawPressed
        };

        if (draggedSquare.piece() == piecePawn && square.row() % 7 == 0) {
            OnPromote(data);
        }
        else {
            OnDropPiece(data);
        }
    },
    OnDragStart: function(panelId, dragCallbacks, square) {
        if (!isPlayer) return;
        if (Game.IsGamePaused()) return;
        if (!this.draggable() || !this.panel) return;
        if (this.pieceOwner() != mySide) return;

        _.DebugMsg("OnDragStart", moves);

        ClearHighlight();
        if (!HighlightMoves(this)) return false;

        // create a temp panel that will be dragged around
        var displayPanel = CreateSquarePanel(this.panel, "dragImage");

        displayPanel.SetPiece(this.piece(), this.pieceOwner());
        displayPanel.square = this;

        // hook up the display panel, and specify the panel offset from the cursor
        dragCallbacks.displayPanel = displayPanel;
        dragCallbacks.offsetX = (this.panel.GetParent().actuallayoutwidth || 32) / 2;
        dragCallbacks.offsetY = (this.panel.GetParent().actuallayoutheight || 32) / 2;

        // grey out the source panel while dragging
        this.panel.AddClass("dragging_from");
        this.panel.GetParent().AddClass("dragging_from");
    },
    OnDragEnd: function(panelId, draggedPanel, square) {
        //_.DebugMsg("Square OnDragEnd");
        // kill the display panel
        draggedPanel.DeleteAsync(0);

        ClearHighlight();

        // restore our look
        this.panel.RemoveClass("dragging_from");
        this.panel.GetParent().RemoveClass("dragging_from");
    }
});

function ClearHighlight() {
    for (var i = 0; i < m_Board.length; i++) {
        var td = m_Board[i];
        td.selected(false);
        td.panel.SetHasClass("move-dest", false);
        td.panel.GetParent().SetHasClass("move-dest", false);
        td.panel.SetHasClass("potential_drop_target", false);
        td.panel.GetParent().SetHasClass("potential_drop_target", false);
    }
}

function ParseMove(move) {
    var from = move & 0xFF;
    var fromSq = lookupSquare[from];
    var to = (move >> 8) & 0xFF;
    var toSq = lookupSquare[to];
    //_.DebugMsg("ParseMove from: ", from, ", to: ", to, ", ", ", fromSq: ", fromSq, ", toSq: ", toSq);
    return {
        from: from,
        fromSq: fromSq,
        tdFrom: m_Board[fromSq.y * 8 + fromSq.x],
        to: to,
        toSq: toSq,
        tdTo: m_Board[toSq.y * 8 + toSq.x]
    };
}

function HighlightMoves(square) {
    if (!square) return;
    var foundMove = false;
    for (var k in moves) {
        var move = moves[k];
        var data = ParseMove(move);
        var fromSq = data.fromSq;
        var toSq = data.toSq;
        //_.DebugMsg("lookupSquare ", lookupSquare);
        //_.DebugMsg("from: ", move & 0xFF, ", to: ", (move >> 8) & 0xFF, ", ", m_Board.length, ", fromSq: ", fromSq);

        var tdFrom = m_Board[fromSq.y * 8 + fromSq.x];
        if (tdFrom.panel.id == square.panel.id) {
            tdFrom.panel.SetHasClass("selected", true);
            tdFrom.panel.GetParent().SetHasClass("selected", true);

            var tdTo = m_Board[toSq.y * 8 + toSq.x];
            tdTo.panel.SetHasClass("move-dest", true);
            tdTo.panel.GetParent().SetHasClass("move-dest", true);

            _.DebugMsg("from: ", tdFrom.panel.id, " td: ", tdTo.panel.id);
            foundMove = true;
        }
    }
    if (!foundMove) {
        _.DebugMsg("not found ", square.panel.id);
    }
    return foundMove;
}

function HighlightLastMove() {
    if (lastMove) ToggleHighlight(lastMove, true, true);
}

function ToggleHighlight(data, value, animate) {
    _.DebugMsg("ToggleHighlight", data, value);
    var moveData = ParseMove(data.move);
    moveData.tdFrom.panel.SetHasClass("last-move", value);
    moveData.tdFrom.panel.GetParent().SetHasClass("last-move", value);
    moveData.tdTo.panel.SetHasClass("last-move", value);
    moveData.tdTo.panel.GetParent().SetHasClass("last-move", value);
    _.DebugMsg("moveData.tdFrom piece", moveData.tdFrom.piece(), moveData.tdFrom.panel.GetPositionWithinWindow());
    _.DebugMsg("moveData.tdTo piece", moveData.tdTo.piece(), moveData.tdTo.panel.GetPositionWithinWindow());
    
    if (animate) {
        var fromPos = moveData.tdFrom.panel.GetPositionWithinWindow();
        var toPos = moveData.tdTo.panel.GetPositionWithinWindow();
        _.DebugMsg("fromPos", fromPos.x, fromPos.y);
        _.DebugMsg("toPos", toPos.x, toPos.y);
        if (Number.isFinite(fromPos.x) && Number.isFinite(fromPos.y) && Number.isFinite(toPos.x) && Number.isFinite(toPos.y)) {
            fromPos = GameUI.CustomUIConfig().BoardOverlay.scalePos(fromPos);
            toPos = GameUI.CustomUIConfig().BoardOverlay.scalePos(toPos);
            _.DebugMsg("animating", fromPos, toPos);
            
            var ghost = new _.Panel({
                panel: CreateSquarePanel(GameUI.CustomUIConfig().BoardOverlay.contextPanel),
                hittest: false,
                cssClasses: ["animate"],
                style: fromPos
            });
            ghost.panel.SetPiece(data.pieceType, data.pieceOwner);
            ghost.style.x(toPos.x);
            ghost.style.y(toPos.y);
            $.Schedule(0.2, function () {
                ghost.panel.DeleteAsync(0);
            });

            _.DebugMsg("panel", ghost.panel.style.position, ghost.panel.y);
        }
    }
}

function HighlightPlayerToMove(toMove) {
    $("#timer-bottom").SetHasClass("highlight", toMove == bottomSide);
    $("#timer-top").SetHasClass("highlight", toMove != bottomSide);
}

function UpdateMySide() {
    _.DebugMsg("UpdateMySide", mySide, player_sides);
    if (player_sides[0] == Players.GetLocalPlayer()) {
        mySide = 0;
        isPlayer = true;
    }
    else if (player_sides[8] == Players.GetLocalPlayer()) {
        mySide = 8;
        isPlayer = true;
    }
    else {
        mySide = null;
        isPlayer = false;
    }
}

function Update() {
    UpdateMySide();
    UpdateUI();
    UpdatePlayerPanel();
    UpdateTime();
}

function RenderCapturedPiece(pieceType, side) {
    _.DebugMsg("RenderCapturedPiece", pieceType, side, pieceText[pieceType]);
    var capturedPiecePanel = $.CreatePanel("Panel", $("#captured-" + (bottomSide == side ? "top" : "bottom")), "");
    capturedPiecePanel.SetHasClass("captured-piece", true);
    capturedPiecePanel.SetHasClass("white", side == 8);
    capturedPiecePanel.SetHasClass("black", side == 0);
    var piece = $.CreatePanel("Panel", capturedPiecePanel, "");
    piece.SetHasClass("square-piece", true);
    piece.hittest = false;
    for (var i = 1; i <= 6; i++) {
        piece.SetHasClass(pieceText[i], pieceType == i);
    }
    piece.SetHasClass("white", side == 8);
    piece.SetHasClass("black", side == 0);
        
    return capturedPiecePanel;
}

function isSolo() {
    var netTable = CustomNetTables.GetTableValue( "chess", "players" );
    return netTable && netTable.count == 1;
}

function RemoveHistory(numPly) {
    var numMoves = Math.ceil(numPly / 2);
    var panelsToRemove = $("#history").Children().slice(numMoves);
    panelsToRemove.forEach(function (panel) {
        panel.DeleteAsync(0);
    });
    if (numPly % 2 == 1) {
        var panelToRemove = $("#history-ply-" + (numPly + 1));
        if (panelToRemove) {
            panelToRemove.DeleteAsync(0);
        }
    }
}

function AddHistory(numPly, san) {
    _.DebugMsg("AddHistory", numPly, san);
    var moveNum = Math.ceil(numPly / 2);
    var movePanel = $("#history-move-" + moveNum);

    if (!movePanel) {
        movePanel = $.CreatePanel("Panel", $("#history"), "history-move-" + moveNum);
        movePanel.SetHasClass("history-move", true);
        
        var moveNumPanel = $.CreatePanel("Label", movePanel, "");
        moveNumPanel.SetHasClass("history-move-num", true);
        moveNumPanel.text = moveNum;
    }

    var plyPanel = $.CreatePanel("Label", movePanel, "history-ply-" + numPly);
    plyPanel.SetHasClass("history-ply", true);
    plyPanel.SetHasClass("white", numPly % 2 == 1);
    plyPanel.SetHasClass("black", numPly % 2 == 0);
    plyPanel.text = san;
}

function OnBoardUpdate(data) {
    _.DebugMsg("OnBoardUpdate");
    // _.DebugMsg(data.boardState);
    // _.DebugMsg("toMove", data.toMove);
    _.DebugMsg("san", data.san);
    // _.DebugMsg("moves", data.moves);
    _.DebugMsg("move", data.move);
    _.DebugMsg("check", data.check);
    _.DebugMsg("undo", data.undo);
    _.DebugMsg("repDraw", data.repDraw);
    _.DebugMsg("move50", data.move50);
    _.DebugMsg("captured_piece", data.captured_piece);
    _.DebugMsg("checkmate", data.checkmate);
    _.DebugMsg("stalemate", data.stalemate);
    // _.DebugMsg("numPly", data.numPly);
    gameInProgress = true;
    // numPly = data.numPly;
    DeselectSquare();
    // moves = data.moves;
    // boardState = data.boardState;
    //RedrawPieces(boardState);
    lastMove = data.move;
    HighlightLastMove();

    // toMove = data.toMove;
    //HighlightPlayerToMove(toMove);

    if (data.checkmate) {
        Game.EmitSound("Chess.Checkmate");
        OnGameEnd($.Localize(toMove == 0 ? "checkmate_white_win" : "checkmate_black_win"));
    }
    else if (data.stalemate) {
        Game.EmitSound("Chess.Stalemate");
        OnDraw();
    }
    else if (data.check) {
        Game.EmitSound("Chess.Check");
    }
    else {
        Game.EmitSound("Chess.Move");
    }
    
    if (data.move50 == 50 || data.repDraw) {
        uiStates[0].pendingDraw = true;
        uiStates[8].pendingDraw = true;
    }
    
    UpdateUI();
    
    if (timer == 0) UpdateTime();
}

function UpdateTime() {
    var time = {
        0: CustomNetTables.GetTableValue( "time", "0" ),
        8: CustomNetTables.GetTableValue( "time", "8" )
    };
    if (time[0]) timeRemaining[0] = time[0].remaining;
    if (time[8]) timeRemaining[8] = time[8].remaining;
    UpdateTimePanel();

    //_.DebugMsg("timer ", color, " ", timeRemaining[color]);
    if (gameInProgress) {
        timer = $.Schedule(0.1, UpdateTime);
    }
    else {
        timer = 0;
    }
}

function UpdateTimePanel() {
    $("#timer-label-top").text = formatTime(timeRemaining[1 - bottomSide + 7]);
    $("#timer-label-bottom").text = formatTime(timeRemaining[bottomSide]);
    $("#timer-top").SetHasClass("warning", timeControl && timeRemaining[1 - bottomSide + 7] < 100);
    $("#timer-bottom").SetHasClass("warning", timeControl && timeRemaining[bottomSide] < 100);
}

function RedrawPieces(boardState) {
    if (!boardState) return;
    _.DebugMsg("m_Board.length", m_Board.length);
    for (var y = 0; y < 8; ++y) {
        for (var x = 0; x < 8; ++x) {
            var td = m_Board[y * 8 + x];
            var piece = boardState[((y + 2) * 0x10) + x + 4 + 1];
            var pieceType = piece & 0x7;

            if (pieceType != pieceEmpty) {
                var pieceOwner = piece & 0x8;
                td.setPiece(pieceType, pieceOwner);
            }
            else {
                td.clearPiece();
            }
            td.render();
            
            td.panel.SetHasClass("last-move", false);
            td.panel.GetParent().SetHasClass("last-move", false);
        }
    }
}

var uiStates = {
    0: new UIState(),
    8: new UIState()
};

var uiState;

function UIState() {
    this.rematchPressed = false;
    this.swapPressed = false;
    this.undoPressed = false;
    this.drawPressed = false;
    this.resignPressed = false;
    this.pendingSwap = false;
    this.pendingDraw = false;
    this.pendingUndo = false;
}

function OnRematchPressed() {
    if (!isPlayer) return;
    _.DebugMsg("OnRematchPressed", mySide, toMove);
    if (!gameInProgress) {
        uiState.rematchPressed = !uiState.rematchPressed;
        if (uiState.rematchPressed) {
            RequestRematch();
        }
        else {
            DeclineRematch();
        }
        UpdateUI();
    }
}

function OnSwapPressed() {
    if (!isPlayer) return;
    _.DebugMsg("OnSwapPressed", mySide, toMove);
    if (isSolo()) {
        AcceptSwap();
    }
    else {
        if (!gameInProgress || numPly < 2) {
            uiState.swapPressed = true;
            UpdateUI();
        }
    }
}

function OnUndoPressed() {
    if (!isPlayer) return;
    _.DebugMsg("OnUndoPressed", mySide, toMove);
    if (isSolo()) {
        AcceptUndo();
    }
    else {
        if (mySide != toMove && numPly >= 2) {
            uiState.undoPressed = true;
            UpdateUI();
        }
    }
}

function OnOfferDrawPressed() {
    if (!isPlayer) return;
    _.DebugMsg("OnOfferDrawPressed", mySide, toMove);
    if (mySide == toMove && numPly >= 2 && !uiState.pendingDraw) {
        uiState.drawPressed = true;
        UpdateUI();
    }
}

function OnResignPressed() {
    if (!isPlayer) return;
    uiState.resignPressed = true;
    UpdateUI();
}

function OnCancelActionPressed() {
    if (!isPlayer) return;
    uiState.swapPressed = false;
    uiState.undoPressed = false;
    uiState.drawPressed = false;
    uiState.resignPressed = false;
    UpdateUI();
}

function OnConfirmActionPressed() {
    if (!isPlayer) return;
    if (uiState.swapPressed) {
        RequestSwap();
        uiState.swapPressed = false;
    }
    if (uiState.undoPressed) {
        RequestUndo();
        uiState.undoPressed = false;
    }
    if (uiState.resignPressed) {
        Resign();
        uiState.resignPressed = false;
    }
    UpdateUI();
}

function OnReceivedDrawClaimed() {
    OnDraw();
}

function OnReceivedResigned(data) {
    var prompt = data.playerSide == 0 ? $.Localize("side_black") : $.Localize("side_white");
    prompt += $.Localize("event_resign");
    OnGameEnd(prompt);
}

function OnReceivedTimedOut(data) {
    var prompt = data.playerSide == 0 ? $.Localize("side_black") : $.Localize("side_white");
    prompt += $.Localize("event_timeout");
    OnGameEnd(prompt);
}

function OnAcceptSwapPressed() {
    if (!isPlayer) return;
    if (uiState.pendingSwap) {
        uiState.pendingSwap = false;
        AcceptSwap();
    }
    UpdateUI();
}

function OnDeclineSwapPressed() {
    if (!isPlayer) return;
    DeclineSwap();
    UpdateUI();
}

function OnAcceptUndoPressed() {
    if (!isPlayer) return;
    if (uiState.pendingUndo) {
        uiState.pendingUndo = false;
        AcceptUndo();
    }
    UpdateUI();
}

function OnDeclineUndoPressed() {
    if (!isPlayer) return;
    DeclineUndo();
    UpdateUI();
}

function OnAcceptDrawPressed() {
    if (!isPlayer) return;
    if (uiState.pendingDraw) {
        uiState.pendingDraw = false;
        GameEvents.SendCustomGameEventToServer("claim_draw", {
            playerId: Players.GetLocalPlayer(),
            playerSide: mySide
        });
    }
    UpdateUI();
}

function OnDeclineDrawPressed() {
    if (!isPlayer) return;
    DeclineDraw();
    UpdateUI();
}

function DeclineDraw() {
    if (!isPlayer) return;
    if (uiState.pendingDraw) {
        uiState.pendingDraw = false;
        GameEvents.SendCustomGameEventToServer("decline_draw", {
            playerId: Players.GetLocalPlayer(),
            playerSide: mySide
        });
    }
}

function DeclineUndo() {
    if (!isPlayer) return;
    if (uiState.pendingUndo) {
        uiState.pendingUndo = false;
        GameEvents.SendCustomGameEventToServer("decline_undo", {
            playerId: Players.GetLocalPlayer(),
            playerSide: mySide
        });
    }
}

function DeclineSwap() {
    if (!isPlayer) return;
    if (uiState.pendingSwap) {
        uiState.pendingSwap = false;
        GameEvents.SendCustomGameEventToServer("decline_swap", {
            playerId: Players.GetLocalPlayer(),
            playerSide: mySide
        });
    }
}

function UpdateUI() {
    if (!isPlayer) {
        $("#action-container").SetHasClass("hidden", true);
    }
    else {
        _.DebugMsg("UpdateUI", mySide, uiStates[mySide]);
        uiState = uiStates[mySide];
        
        if (isSolo()) {
            $("#btn-undo").SetHasClass("disabled", mySide != toMove || numPly < 2);
        }
        else {
            $("#btn-undo").SetHasClass("disabled", mySide == toMove || uiState.undoPressed || numPly < 2);
        }
        
        $("#btn-rematch").SetHasClass("disabled", uiState.rematchPressed);
        $("#btn-rematch").SetHasClass("hidden", gameInProgress);
        
        $("#btn-swap").SetHasClass("disabled", uiState.swapPressed);
        $("#btn-draw").SetHasClass("disabled", mySide != toMove || uiState.drawPressed || numPly < 2 || uiState.pendingDraw);
        $("#btn-resign").SetHasClass("disabled", uiState.resignPressed);
        
        $("#btn-swap").SetHasClass("hidden", gameInProgress && (uiState.undoPressed || uiState.drawPressed || uiState.resignPressed || numPly >= 2));
        $("#btn-undo").SetHasClass("hidden", uiState.swapPressed || uiState.drawPressed || uiState.resignPressed);
        $("#btn-draw").SetHasClass("hidden", !gameInProgress || isSolo() || uiState.swapPressed || uiState.resignPressed || uiState.undoPressed);
        $("#btn-resign").SetHasClass("hidden", !gameInProgress || uiState.swapPressed || uiState.drawPressed || uiState.undoPressed);
        
        $("#btn-confirm").SetHasClass("hidden", !uiState.swapPressed && !uiState.resignPressed && !uiState.undoPressed);
        $("#btn-cancel").SetHasClass("hidden", !uiState.swapPressed && !uiState.drawPressed && !uiState.resignPressed && !uiState.undoPressed);
        
        $("#swap-request-container").SetHasClass("hidden", !uiState.pendingSwap);
        $("#draw-request-container").SetHasClass("hidden", !uiState.pendingDraw);
        $("#undo-request-container").SetHasClass("hidden", !uiState.pendingUndo);
    }
}

function AcceptSwap() {
    if (!isPlayer) return;
    GameEvents.SendCustomGameEventToServer("accept_swap", {
        playerId: Players.GetLocalPlayer(),
        playerSide: mySide
    });
}

function AcceptUndo() {
    if (!isPlayer) return;
    GameEvents.SendCustomGameEventToServer("accept_undo", {
        playerId: Players.GetLocalPlayer(),
        playerSide: mySide
    });
}

function Resign() {
    if (!isPlayer) return;
    GameEvents.SendCustomGameEventToServer("resign", {
        playerId: Players.GetLocalPlayer(),
        playerSide: mySide
    });
}

function RequestRematch() {
    if (!isPlayer) return;
    GameEvents.SendCustomGameEventToServer("request_rematch", {
        playerId: Players.GetLocalPlayer(),
        playerSide: mySide
    });
}

function DeclineRematch() {
    if (!isPlayer) return;
    GameEvents.SendCustomGameEventToServer("decline_rematch", {
        playerId: Players.GetLocalPlayer(),
        playerSide: mySide
    });
}

function RequestSwap() {
    if (!isPlayer) return;
    GameEvents.SendCustomGameEventToServer("request_swap", {
        playerId: Players.GetLocalPlayer(),
        playerSide: mySide
    });
}

function RequestUndo() {
    if (!isPlayer) return;
    GameEvents.SendCustomGameEventToServer("request_undo", {
        playerId: Players.GetLocalPlayer(),
        playerSide: mySide
    });
}

function DeselectSquare() {
    if (selectedSquare) {
        ClearHighlight();
        selectedSquare = null;
    }
}

function OnFlipBoardPressed() {
    _.DebugMsg("OnFlipBoardPressed");
    bottomSide = 1 - bottomSide + 7;
    UpdateUI();
    RedrawBoard();
    UpdatePlayerPanel();
}

function OnTogglePlayerPressed() {
    mySide = 1 - mySide + 7;
    uiState = uiStates[mySide];
    $("#btn-toggle-player").SetHasClass(mySide == 0 ? "black" : "white", true);
    $("#btn-toggle-player").SetHasClass(mySide != 0 ? "black" : "white", false);
    UpdateUI();
    //RedrawBoard();
    //UpdatePlayerPanel();
}

function UpdatePlayerPanel() {
    [0, 8].forEach(function (side) {
        var pos = (bottomSide == side ? "bottom" : "top");
        if (player_sides[side] != null) {
            _.DebugMsg("player_sides[side]", player_sides, player_sides[side] != null, side, player_sides[side]);
            var playerInfo = Game.GetPlayerInfo(player_sides[side]);
            if (playerInfo) {
                $("#player-" + pos).steamid = playerInfo.player_steamid;
                $("#player-" + pos).SetHasClass("hidden", false);
                $("#player-name-label-" + pos).text = Players.GetPlayerName(player_sides[side]) + " &ndash; " + (side == 0 ? $.Localize("side_black") : $.Localize("side_white"));
            }
        }
        else {
            $("#player-" + pos).steamid = 0;
            $("#player-" + pos).SetHasClass("hidden", true);
            if (isSolo()) {
                $("#player-name-label-" + pos).text = $.Localize("computer") + " &ndash; " + (side == 0 ? $.Localize("side_black") : $.Localize("side_white"));
            }
            else {
                $("#player-name-label-" + pos).text = "";
            }
        }
        $("#player-name-label-" + pos).SetHasClass("white", side != 0);
        $("#player-name-label-" + pos).SetHasClass("black", side == 0);
    });
    HighlightPlayerToMove(toMove);
}

function CreateRequestPanels() {
    var requestContainer = $("#request-container");
    requestContainer.RemoveAndDeleteChildren();
    CreateRequestPanel(requestContainer, "undo-request-container", "#prompt_undo", OnAcceptUndoPressed, OnDeclineUndoPressed);
    CreateRequestPanel(requestContainer, "draw-request-container", "#prompt_draw", OnAcceptDrawPressed, OnDeclineDrawPressed);
    CreateRequestPanel(requestContainer, "swap-request-container", "#prompt_swap", OnAcceptSwapPressed, OnDeclineSwapPressed);
}

function CreateRequestPanel(parentPanel, id, text, acceptHandler, declineHandler) {
    var requestPanel = $.CreatePanel("Panel", parentPanel, id);
    requestPanel.BLoadLayoutSnippet("request-panel");
    requestPanel.FindChildTraverse("action-message").text = text;
    requestPanel.FindChildTraverse("btn-accept").SetPanelEvent("onactivate", acceptHandler);
    requestPanel.FindChildTraverse("btn-decline").SetPanelEvent("onactivate", declineHandler);
}

function CreateSquarePanel(parentPanel, id) {
    id = id || "";
    var panel = $.CreatePanel("Panel", parentPanel, id);
    panel.SetHasClass("square", true);
    var piece = $.CreatePanel("Panel", panel, "");
    piece.SetHasClass("square-piece", true);
    piece.hittest = false;
    
    panel.SetPiece = function (pieceType, pieceOwner) {
        //_.DebugMsg("SetPiece", pieceType, pieceOwner, pieceText[pieceType]);
        for (var i = 1; i <= 6; i++) {
            piece.SetHasClass(pieceText[i], pieceType == i);
        }
        piece.SetHasClass("white", pieceOwner != 0);
        piece.SetHasClass("black", pieceOwner == 0);
    };
    
    return panel;
}

function OnMoveHistoryNetTableChange(tableName, key, data) {
    _.DebugMsg( "Table ", tableName, " changed: '", key, "' = ", data, " ", JSON.stringify(data).length);
    if (tableName !== "move_history") return;
    var ply = parseInt(key);
    if (_.IsEmpty(data)) {
        RemoveHistory(ply - 1);
        
        var capturedPiecesToRemove = capturedPieces.splice(ply - 1);
        capturedPiecesToRemove.forEach(function (capturedPieceToRemove) {
            if (capturedPieceToRemove) capturedPieceToRemove[2].DeleteAsync(0);
        });
    }
    else {
        AddHistory(ply, data.san);
        
        var side = ply % 2 == 1 ? 0 : 8;
        if (data.captured_piece && data.captured_piece != pieceEmpty) {
            capturedPieces[ply - 1] = [side, data.captured_piece, RenderCapturedPiece(data.captured_piece, side)];
        }
        else {
            capturedPieces[ply - 1] = null;
        }
    }
    $("#history").ScrollToBottom();
}

function LoadMoveHistoryNetTable() {
    var table = CustomNetTables.GetAllTableValues("move_history");
    if (table) {
        table.forEach(function (kv) {
            if (parseInt(kv.key) <= numPly) OnMoveHistoryNetTableChange("move_history", kv.key, kv.value);
        });
    }
}

function LoadChessNetTable() {
    var table = CustomNetTables.GetAllTableValues("chess");
    if (table) {
        table.forEach(function (kv) {
            OnChessNetTableChange("chess", kv.key, kv.value);
        });
    }
}

function OnChessNetTableChange(tableName, key, data) {
    _.DebugMsg( "Table ", tableName, " changed: '", key, "' = ", data, " ", JSON.stringify(data).length);
    if (tableName !== "chess") return;
    switch (key) {
        case "game_in_progress":
            gameInProgress = data.value;
            break;
        case "numPly":
            numPly = data.value;
            break;
        case "boardState":
            boardState = data;
            RedrawPieces(boardState);
            break;
        case "toMove":
            toMove = data.value;
            UpdatePlayerPanel();
            HighlightPlayerToMove(toMove);
            DeselectSquare();
            break;
        case "moves":
            moves = data;
            break;
        case "player_sides":
            player_sides = data;
            UpdateMySide();
            UpdatePlayerPanel();
            break;
        case "clock":
            timeRemaining = {
                8: data.time,
                0: data.time
            };
            break;
        case "move":
            OnBoardUpdate(data);
            break;
        case "ui_states":
            [0,8].forEach(function (side) {
                for (var prop in data[side]) {
                    uiStates[side][prop] = data[side][prop];
                }
            });
            UpdateUI();
            break;
    }
}

(function() {
    GameUI.SetDefaultUIEnabled(DotaDefaultUIElement_t.DOTA_DEFAULT_UI_TOP_TIMEOFDAY, false);
    GameUI.SetDefaultUIEnabled(DotaDefaultUIElement_t.DOTA_DEFAULT_UI_TOP_HEROES, false);
    GameUI.SetDefaultUIEnabled(DotaDefaultUIElement_t.DOTA_DEFAULT_UI_FLYOUT_SCOREBOARD, false);
    GameUI.SetDefaultUIEnabled(DotaDefaultUIElement_t.DOTA_DEFAULT_UI_ACTION_PANEL, false);
    GameUI.SetDefaultUIEnabled(DotaDefaultUIElement_t.DOTA_DEFAULT_UI_ACTION_MINIMAP, false);
    GameUI.SetDefaultUIEnabled(DotaDefaultUIElement_t.DOTA_DEFAULT_UI_INVENTORY_PANEL, false);
    GameUI.SetDefaultUIEnabled(DotaDefaultUIElement_t.DOTA_DEFAULT_UI_INVENTORY_SHOP, false);
    GameUI.SetDefaultUIEnabled(DotaDefaultUIElement_t.DOTA_DEFAULT_UI_TOP_MENU_BUTTONS, false);

    DialogLibrary = GameUI.CustomUIConfig().DialogLibrary;
    
    $("#btn-toggle-player").SetHasClass("hidden", !Game.IsInToolsMode() || (_.IsDebug() && isSolo()));
    
    // InitLookupSquare();
    CreateRequestPanels();
    CreateChatPanel();
    CreateBoard();
    
    player_sides = CustomNetTables.GetTableValue( "chess", "player_sides" );
    UpdateMySide();
    
    LoadChessNetTable();
    LoadMoveHistoryNetTable();

    _.DebugMsg("player_sides ", player_sides);
    
    GameEvents.Subscribe("draw_claimed", OnReceivedDrawClaimed);
    GameEvents.Subscribe("resigned", OnReceivedResigned);
    GameEvents.Subscribe("timeout_end", OnReceivedTimedOut);
    
    CustomNetTables.SubscribeNetTableListener("chess", OnChessNetTableChange);
    CustomNetTables.SubscribeNetTableListener("move_history", OnMoveHistoryNetTableChange);

    var gameSetup = CustomNetTables.GetTableValue( "game_setup", "options" );
    if (gameSetup) {
        timeRemaining = {
            0: gameSetup.clock_time,
            8: gameSetup.clock_time
        };
    }
    
    Update();
    _.DebugMsg("main.js");
})();