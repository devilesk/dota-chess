/* exported OnFenSubmitted */
/* exported OnOfferDrawPressed */
/* exported OnResignPressed */
/* exported OnCancelActionPressed */
/* exported OnConfirmActionPressed */
/* exported OnAcceptPressed */
/* exported OnDeclinePressed */
/* exported OnTogglePlayerPressed */

"use strict";

var _ = GameUI.CustomUIConfig().UtilLibrary;
var DialogLibrary;
var m_ChatPanel;
var m_Board = [];
var g_board;
var capturedPieces = [];
var timeControl = true;
var currentMovePanel;
var moveNum = 0;
var timeRemaining = {
    8: 110,
    0: 110
};
var increment = 20;
var timer = 0;
var currentSide = 8; // 0 == black, 0 != white
var firstMove = {
    8: true,
    0: true
};
var players = {
    8: null,
    0: null
};
var mySide = Game.GetLocalPlayerInfo().player_team_id == DOTATeam_t.DOTA_TEAM_GOODGUYS ? 8 : 0;
$.Msg("mySide ", mySide);
var moves;
var lastMove;
var selectedSquare;
var paused = false;
var lookupSquare = {};

function InitLookupSquare() {
    for (var i = 0; i < 8; i++) {
        for (var j = 0; j < 8; j++) {
            //$.Msg(i, ", ", j, " ", MakeSquare(i, j));
            lookupSquare[MakeSquare(i, j)] = {
                x: j,
                y: i
            };
        }
    }
}

var ranks = [1, 2, 3, 4, 5, 6, 7, 8];
var files = ["a", "b", "c", "d", "e", "f", "g", "h"];
var initialPositions = {
    8: {
        a1: "rook",
        b1: "knight",
        c1: "bishop",
        d1: "queen",
        e1: "king",
        f1: "bishop",
        g1: "knight",
        h1: "rook",
        a2: "pawn",
        b2: "pawn",
        c2: "pawn",
        d2: "pawn",
        e2: "pawn",
        f2: "pawn",
        g2: "pawn",
        h2: "pawn"
    },
    0: {
        a8: "rook",
        b8: "knight",
        c8: "bishop",
        d8: "queen",
        e8: "king",
        f8: "bishop",
        g8: "knight",
        h8: "rook",
        a7: "pawn",
        b7: "pawn",
        c7: "pawn",
        d7: "pawn",
        e7: "pawn",
        f7: "pawn",
        g7: "pawn",
        h7: "pawn"
    }
};

//var colorBlack = 0x10;
//var colorWhite = 0x08;

var pieceEmpty = 0x00;
var piecePawn = 0x01;
var pieceKnight = 0x02;
var pieceBishop = 0x03;
var pieceRook = 0x04;
var pieceQueen = 0x05;
var pieceKing = 0x06;

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
            return " " +pad(Math.floor(t / 600), 2) + ":" + pad(Math.floor(t / 10) % 60, 2) + "." + (t % 10);
        } else {
            return " " +pad(Math.floor(t / 600), 2) + ":" + pad(Math.floor(t / 10) % 60, 2);
        }
    }
    else {
        return "";
    }
}

function OnNewGame() {
    GameEvents.SendCustomGameEventToServer("new_game", {});
}

function OnPromote(data) {
    $.Msg("OnPromote");
    new DialogLibrary.Dialog({
        parentPanel: DialogLibrary.contextPanel,
        layoutfile: "file://{resources}/layout/custom_game/dialog/dialog.xml",
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
                                SendPromotionMove(data, "queen");
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
                            text: "&#9819;", // queen
                            skipBindHandlers: true,
                            html: true,
                            init: function() {
                                this.text("&#9819;");
                            }
                        }]
                    }]
                },
                {
                    cssClasses: ["control square"],
                    id: "control-2",
                    children: [{
                        events: {
                            OnActivate: function() {
                                SendPromotionMove(data, "rook");
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
                            text: "&#9820;", // rook
                            skipBindHandlers: true,
                            html: true,
                            init: function() {
                                this.text("&#9820;");
                            }
                        }]
                    }]
                },
                {
                    cssClasses: ["control"],
                    id: "control-3",
                    children: [{
                        events: {
                            OnActivate: function() {
                                SendPromotionMove(data, "bishop");
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
                            text: "&#9821;", // bishop
                            skipBindHandlers: true,
                            html: true,
                            init: function() {
                                this.text("&#9821;");
                            }
                        }]
                    }]
                },
                {
                    cssClasses: ["control"],
                    id: "control-4",
                    children: [{
                        events: {
                            OnActivate: function() {
                                SendPromotionMove(data, "knight");
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
                            text: "&#9822;", // knight
                            skipBindHandlers: true,
                            html: true,
                            init: function() {
                                this.text("&#9822;");
                            }
                        }]
                    }]
                }
            ]
        }]
    });
}

function SendPromotionMove(data, promotionType) {
    data.promotionType = promotionType;
    OnDropPiece(data);
}

function OnDropPiece(data) {
    uiState.drawPressed = false;
    uiState.resignPressed = false;
    GameEvents.SendCustomGameEventToServer("drop_piece", data);
    DeclineDraw();
    DeclineUndo();
    UpdateUI();
}

function OnGameEnd(prompt) {
    new DialogLibrary.Dialog({
        parentPanel: DialogLibrary.contextPanel,
        layoutfile: "file://{resources}/layout/custom_game/dialog/dialog.xml",
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
                                OnNewGame();
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
                            text: "Play again",
                            skipBindHandlers: true
                        }]
                    }]
                }
            ]
        }]
    });
}

function OnDraw() {
    OnGameEnd("Draw.");
}

function OnLose() {
    OnGameEnd("Checkmate. You lose!");
}

function OnWin() {
    OnGameEnd("Checkmate. You win!");
}

function CreateChatPanel() {
    var parentPanel = $("#chat-container");
    m_ChatPanel = $.CreatePanel("Panel", parentPanel, "");
    m_ChatPanel.BLoadLayout("file://{resources}/layout/custom_game/chat/chat.xml", false, false);
}

function CreateBoard() {
    var parentPanel = $("#board");
    var i, j, rowPanel;
    if (mySide == 0) {
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
    RedrawPieces(g_board);
    HighlightLastMove(lastMove);
    RedrawCapturedPieces();
}

function RedrawCapturedPieces() {
    $("#captured-top").RemoveAndDeleteChildren();
    $("#captured-bottom").RemoveAndDeleteChildren();
    
    capturedPieces.forEach(function (data) {
        if (data) data[2] = RenderCapturedPiece(data[1], data[0]);
    });
}


function Square(options) {
    //$.Msg("Square constructor");
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
    [8, 0].forEach(function(c) {
        if (initialPositions[c].hasOwnProperty(self.file() + self.rank())) {
            self.piece(initialPositions[c][self.file() + self.rank()]);
            self.pieceOwner(c);
            self.hasPiece(true);
        }
    });
    options.id = options.id || "square-" + options.file + options.rank;

    options.layoutfile = options.layoutfile || "file://{resources}/layout/custom_game/square.xml";
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
    OnMouseOver: function() {
        // highlight this panel as a drop target
        $.Msg("Square OnMouseOver ", this.panel.id);
        if (this.panel) {
            this.panel.SetHasClass("highlight", true);
            this.panel.GetParent().SetHasClass("highlight", true);
        }
    },
    OnMouseOut: function() {
        // highlight this panel as a drop target
        $.Msg("Square OnMouseOut ", this.panel.id);
        if (this.panel) {
            this.panel.SetHasClass("highlight", false);
            this.panel.GetParent().SetHasClass("highlight", false);
        }
    },
    OnContextMenu: function() {
        // highlight this panel as a drop target
        $.Msg("Square OnContextMenu ", this.panel.id);
        //if (this.panel) this.panel.RemoveClass("highlight");
    },
    OnActivate: function() {
        if (paused) return;
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

            if (selectedSquare.piece() == "pawn" && this.row() % 7 == 0) {
                OnPromote(data);
            } else {
                OnDropPiece(data);
            }
        }

        var isSelected = this.selected();
        ClearHighlight();
        this.selected(!isSelected);
        if (this.selected()) {
            if (this.hasPiece()) HighlightMoves(this);
            selectedSquare = this;
        } else {
            selectedSquare = null;
        }
    },
    OnDragEnter: function(a, draggedPanel) {
        $.Msg("Square OnDragEnter ", this.panel.id);
        // highlight this panel as a drop target
        if (this.droppable() && this.panel) {
            this.panel.SetHasClass("potential_drop_target", true);
            this.panel.GetParent().SetHasClass("potential_drop_target", true);
        }
    },
    OnDragLeave: function(panelId, draggedPanel, square) {
        // un-highlight this panel
        $.Msg("Square OnDragLeave ", this.panel.id);
        if (this.panel) {
            this.panel.SetHasClass("potential_drop_target", false);
            this.panel.GetParent().SetHasClass("potential_drop_target", false);
        }
    },
    OnDragDrop: function(panelId, draggedPanel, square) {
        if (paused) return;
        $.Msg("Square OnDragDrop ", this.panel.id, ", ", GameUI.GetCursorPosition());
        var draggedSquare = draggedPanel.square;
        $.Msg("drop ", draggedSquare.panel.id, " to ", square.panel.id);
        $.Msg("drop ", draggedSquare.pos(), " to ", square.pos(), " ", draggedSquare.hasPiece());
        $.Msg("drop ", draggedSquare.piece(), " ", square.row(), " ", square.row() % 7, " ", square.col());
        var data = {
            startX: draggedSquare.col(),
            startY: draggedSquare.row(),
            endX: square.col(),
            endY: square.row(),
            playerId: Players.GetLocalPlayer(),
            playerSide: mySide,
            offerDraw: uiState.drawPressed
        };

        if (draggedSquare.piece() == "pawn" && square.row() % 7 == 0) {
            OnPromote(data);
        } else {
            OnDropPiece(data);
        }
    },
    OnDragStart: function(panelId, dragCallbacks, square) {
        if (!this.draggable() || !this.panel) return;
        if (paused) return;
        if (this.pieceOwner() != mySide) return;

        //GameEvents.SendCustomGameEventToServer( "get_moves", {playerId: Players.GetLocalPlayer()} );
        $.Msg("OnDragStart", moves);

        ClearHighlight();
        if (!HighlightMoves(this)) return false;

        // create a temp panel that will be dragged around
        var displayPanel = $.CreatePanel("Panel", this.panel, "dragImage");
        displayPanel.BLoadLayout("file://{resources}/layout/custom_game/square.xml", false, false);
        //displayPanel.SetHasClass(this.color(), true);

        displayPanel.SetPiece(this.piece(), this.pieceOwner());
        displayPanel.square = this;

        // hook up the display panel, and specify the panel offset from the cursor
        dragCallbacks.displayPanel = displayPanel;
        dragCallbacks.offsetX = 32;
        dragCallbacks.offsetY = 32;

        // grey out the source panel while dragging
        this.panel.AddClass("dragging_from");
        this.panel.GetParent().AddClass("dragging_from");
    },
    OnDragEnd: function(panelId, draggedPanel, square) {
        //$.Msg("Square OnDragEnd");
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
    //$.Msg("ParseMove from: ", from, ", to: ", to, ", ", ", fromSq: ", fromSq, ", toSq: ", toSq);
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
    var foundMove = false;
    for (var k in moves) {
        var move = moves[k];
        var data = ParseMove(move);
        var fromSq = data.fromSq;
        var toSq = data.toSq;
        //$.Msg("lookupSquare ", lookupSquare);
        //$.Msg("from: ", move & 0xFF, ", to: ", (move >> 8) & 0xFF, ", ", m_Board.length, ", fromSq: ", fromSq);

        var tdFrom = m_Board[fromSq.y * 8 + fromSq.x];
        if (tdFrom.panel.id == square.panel.id) {
            tdFrom.panel.SetHasClass("selected", true);
            tdFrom.panel.GetParent().SetHasClass("selected", true);

            var tdTo = m_Board[toSq.y * 8 + toSq.x];
            tdTo.panel.SetHasClass("move-dest", true);
            tdTo.panel.GetParent().SetHasClass("move-dest", true);

            $.Msg("from: ", tdFrom.panel.id, " td: ", tdTo.panel.id);
            foundMove = true;
        }
    }
    if (!foundMove) {
        $.Msg("not found ", square.panel.id);
    }
    return foundMove;
}

function MakeSquare(row, column) {
    return ((row + 2) << 4) | (column + 4);
}

function OnReceiveMoves(data) {
    $.Msg("OnReceiveMoves", data);
    moves = data.moves;
}

function HighlightLastMove(_lastMove) {
    if (lastMove) {
        var lastMoveData = ParseMove(lastMove);
        lastMoveData.tdFrom.panel.SetHasClass("last-move", false);
        lastMoveData.tdFrom.panel.GetParent().SetHasClass("last-move", false);
        lastMoveData.tdTo.panel.SetHasClass("last-move", false);
        lastMoveData.tdTo.panel.GetParent().SetHasClass("last-move", false);
    }
    if (_lastMove) {
        lastMove = _lastMove;
        lastMoveData = ParseMove(lastMove);
        lastMoveData.tdFrom.panel.SetHasClass("last-move", true);
        lastMoveData.tdFrom.panel.GetParent().SetHasClass("last-move", true);
        lastMoveData.tdTo.panel.SetHasClass("last-move", true);
        lastMoveData.tdTo.panel.GetParent().SetHasClass("last-move", true);
    }
}

function HighlightPlayerToMove(toMove) {
    $("#timer-bottom").SetHasClass("highlight", toMove == mySide);
    $("#timer-top").SetHasClass("highlight", toMove != mySide);
}

function OnBoardReset(data) {
    $.Msg(data.board);
    $.Msg("toMove", data.toMove);
    $.Msg("san", data.san);
    $.Msg("moves", data.moves);
    $.Msg("last_move", data.last_move);
    $.Msg("time_control", data.time_control);
    $.Msg("clock_time", data.clock_time);
    $.Msg("clock_increment", data.clock_increment);
    $.Msg("paused", data.paused);
    timeControl = data.time_control;
    paused = data.paused;
    selectedSquare = null;
    lastMove = null;
    HighlightLastMove();
    moves = data.moves;
    g_board = data.board;
    capturedPieces.length = 0;
    RedrawBoard();
    $("#history").RemoveAndDeleteChildren();
    currentSide = data.toMove;
    HighlightPlayerToMove(currentSide);

    moveNum = 0;
    timeRemaining = {
        8: data.clock_time,
        0: data.clock_time
    };
    increment = data.clock_increment;
    if (timer != 0) {
        $.Msg("timer", timer);
        $.CancelScheduled(timer);
        timer = 0;
    }
    firstMove = {
        8: true,
        0: true
    };
    uiStates = {
        0: new UIState(),
        8: new UIState()
    };
    UpdateUI();
    UpdateTimePanel();
}

var pieceText = [
    "",
    "&#9823;", // pawn
    "&#9822;", // knight
    "&#9821;", // bishop
    "&#9820;", // rook
    "&#9819;", // queen
    "&#9818;", // king
]

function RenderCapturedPiece(pieceType, side) {
    var capturedPiecePanel = $.CreatePanel("Panel", $("#captured-" + (mySide == side ? "top" : "bottom")), "");
    capturedPiecePanel.SetHasClass("captured-piece", true);
    capturedPiecePanel.SetHasClass("white", side == 8);
    capturedPiecePanel.SetHasClass("black", side == 0);
    var capturedPieceLabel = $.CreatePanel("Label", capturedPiecePanel, "");
    capturedPieceLabel.html = true;
    capturedPieceLabel.text = pieceText[pieceType];
    return capturedPiecePanel;
}

function OnBoardUpdate(data) {
    $.Msg(data.board);
    $.Msg("toMove", data.toMove);
    $.Msg("san", data.san);
    $.Msg("moves", data.moves);
    $.Msg("last_move", data.last_move);
    $.Msg("check", data.check);
    $.Msg("paused", data.paused);
    $.Msg("undo", data.undo);
    $.Msg("repDraw", data.repDraw);
    $.Msg("move50", data.move50);
    $.Msg("captured_piece", data.captured_piece);
    selectedSquare = null;
    HighlightLastMove(data.last_move);
    moves = data.moves;
    g_board = data.board;
    RedrawPieces(g_board);

    if (data.toMove == 0) {
        if (!data.undo) {
            moveNum++;
            currentMovePanel = $.CreatePanel("Panel", $("#history"), "");
            currentMovePanel.SetHasClass("history-move", true);
        }
        else {
            currentMovePanel.RemoveAndDeleteChildren();
        }
        var moveNumPanel = $.CreatePanel("Label", currentMovePanel, "");
        moveNumPanel.SetHasClass("history-move-num", true);
        moveNumPanel.text = moveNum;
        $("#history").ScrollToBottom();
    }
    else {
        if (data.undo) {
            moveNum--;
            var movePanels = $("#history").Children();
            currentMovePanel = movePanels[movePanels.length - 2];
            currentMovePanel.Children()[2].DeleteAsync(0);
            movePanels[movePanels.length - 1].DeleteAsync(0);
        }
    }
    var plyPanel = $.CreatePanel("Label", currentMovePanel, "");
    plyPanel.SetHasClass("history-ply", true);
    plyPanel.SetHasClass("white", data.toMove == 0);
    plyPanel.SetHasClass("black", data.toMove == 8);
    plyPanel.text = data.san;
    currentSide = data.toMove;
    HighlightPlayerToMove(currentSide);

    if (!data.undo) {
        if (data.captured_piece != pieceEmpty) {
            capturedPieces.push([data.toMove, data.captured_piece, RenderCapturedPiece(data.captured_piece, data.toMove)]);
        }
        else {
            capturedPieces.push(null);
        }
    }
    else {
        var capturedPieceToRemove = capturedPieces.pop();
        if (capturedPieceToRemove) capturedPieceToRemove[2].DeleteAsync(0);
    }
    
    if (timeControl) {
        var otherSide = 1 - currentSide + 7;
        if (!firstMove[otherSide]) timeRemaining[otherSide] += increment;
        firstMove[otherSide] = false;
        $("#timer-label-" + (mySide != currentSide ? "top" : "bottom")).text = formatTime(timeRemaining[mySide != currentSide ? 0 : 8]);

        OnPauseChanged(data);
    }
    //if (timer) $.CancelScheduled(timer);
    //timer = $.Schedule(1, UpdateTime);

    //if (data.san.slice(-1) == "#") OnLose();

    if (data.moves && Object.keys(data.moves).length == 0) {
        if (data.check) {
            if (mySide != data.toMove) {
                OnWin();
            } else {
                OnLose();
            }
        } else {
            OnDraw();
        }
    }
    
    if (data.move50 == 50 || data.repDraw) {
        uiStates[0].pendingDraw = true;
        uiStates[8].pendingDraw = true;
    }
    
    UpdateUI();
}

function OnBoardCheckmate() {
    $.Msg("OnBoardCheckmate");
    OnWin();
}

function OnBoardStalemate() {
    $.Msg("OnBoardStalemate");
    OnDraw();
}

function OnFenSubmitted() {
    var fen = $("#input-fen").text;
    GameEvents.SendCustomGameEventToServer("submit_fen", {
        fen: fen
    });
}

function OnPauseChanged(data) {
    paused = data.paused;
    if (timer != 0) {
        $.CancelScheduled(timer);
        timer = 0;
    }
    if (!data.paused && !firstMove[8] && !firstMove[0]) {
        timer = $.Schedule(0.1, UpdateTime);
    }
}

function UpdateTime() {
    timeRemaining[currentSide]--;
    UpdateTimePanel();

    //$.Msg("timer ", color, " ", timeRemaining[color]);
    if (timeRemaining[currentSide] > 0) {
        timer = $.Schedule(0.1, UpdateTime);
    }
    else {
        timer = 0;
        GameEvents.SendCustomGameEventToServer("time_out", {
            playerId: Players.GetLocalPlayer(),
            playerSide: currentSide
        });
    }
}

function UpdateTimePanel() {
    $("#timer-label-top").text = formatTime(timeRemaining[1 - mySide + 7]);
    $("#timer-label-bottom").text = formatTime(timeRemaining[mySide]);
    $("#timer-top").SetHasClass("warning", timeControl && timeRemaining[1 - mySide + 7] < 100);
    $("#timer-bottom").SetHasClass("warning", timeControl && timeRemaining[mySide] < 100);
}

function RedrawPieces(g_board) {
    if (!g_board) return;
    $.Msg("m_Board.length", m_Board.length);
    for (var y = 0; y < 8; ++y) {
        for (var x = 0; x < 8; ++x) {
            var td = m_Board[y * 8 + x];
            var piece = g_board[((y + 2) * 0x10) + x + 4 + 1];
            var pieceName = null;

            switch (piece & 0x7) {
                case pieceEmpty:
                    pieceName = null;
                    break;
                case piecePawn:
                    pieceName = "pawn";
                    break;
                case pieceKnight:
                    pieceName = "knight";
                    break;
                case pieceBishop:
                    pieceName = "bishop";
                    break;
                case pieceRook:
                    pieceName = "rook";
                    break;
                case pieceQueen:
                    pieceName = "queen";
                    break;
                case pieceKing:
                    pieceName = "king";
                    break;
            }

            if (pieceName != null) {
                var pieceOwner = piece & 0x8;
                td.setPiece(pieceName, pieceOwner);
            } else {
                td.clearPiece();
            }
            td.render();
        }
    }
}

var uiStates = {
    0: new UIState(),
    8: new UIState()
};

var uiState = uiStates[mySide];

function UIState() {
    this.undoPressed = false;
    this.drawPressed = false;
    this.resignPressed = false;
    this.resignPressed = false;
    this.pendingDraw = false;
    this.pendingUndo = false;
}

function OnUndoPressed() {
    $.Msg("OnUndoPressed", mySide, currentSide);
    if (mySide != currentSide && !firstMove[0] && !firstMove[8]) {
        uiState.undoPressed = true;
        UpdateUI();
    }
}

function OnOfferDrawPressed() {
    $.Msg("OnOfferDrawPressed", mySide, currentSide);
    if (mySide == currentSide && !firstMove[0] && !firstMove[8] && !uiState.pendingDraw) {
        uiState.drawPressed = true;
        UpdateUI();
    }
}

function OnResignPressed() {
    uiState.resignPressed = true;
    UpdateUI();
}

function OnCancelActionPressed() {
    uiState.undoPressed = false;
    uiState.drawPressed = false;
    uiState.resignPressed = false;
    UpdateUI();
}

function OnConfirmActionPressed() {
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

function OnReceivedDrawOffer(data) {
    $.Msg("OnReceivedDrawOffer", data);
    uiStates[1 - data.playerSide + 7].pendingDraw = true;
    UpdateUI();
}

function OnReceivedUndoOffer(data) {
    $.Msg("OnReceivedUndoOffer", data);
    uiStates[1 - data.playerSide + 7].pendingUndo = true;
    UpdateUI();
}

function OnAcceptUndoPressed() {
    if (uiState.pendingUndo) {
        uiState.pendingUndo = false;
        GameEvents.SendCustomGameEventToServer("accept_undo", {
            playerId: Players.GetLocalPlayer(),
            playerSide: mySide
        });
    }
    UpdateUI();
}

function OnDeclineUndoPressed() {
    DeclineUndo();
    UpdateUI();
}

function OnAcceptDrawPressed() {
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
    DeclineDraw();
    UpdateUI();
}

function DeclineDraw() {
    if (uiState.pendingDraw) {
        uiState.pendingDraw = false;
        GameEvents.SendCustomGameEventToServer("decline_draw", {
            playerId: Players.GetLocalPlayer(),
            playerSide: mySide
        });
    }
}

function DeclineUndo() {
    if (uiState.pendingUndo) {
        uiState.pendingUndo = false;
        GameEvents.SendCustomGameEventToServer("decline_undo", {
            playerId: Players.GetLocalPlayer(),
            playerSide: mySide
        });
    }
}

function OnReceivedDrawClaimed() {
    OnDraw();
}

function OnReceivedResigned(data) {
    var prompt = data.playerSide == 0 ? "Black" : "White";
    prompt += " resigns. ";
    prompt += mySide == data.playerSide ? "You lose!" : "You win!";
    OnGameEnd(prompt);
}

function OnReceivedTimedOut(data) {
    var prompt = data.playerSide == 0 ? "Black" : "White";
    prompt += " timed out. ";
    prompt += mySide == data.playerSide ? "You lose!" : "You win!";
    OnGameEnd(prompt);
}

function UpdateUI() {
    $("#btn-undo").SetHasClass("disabled", mySide == currentSide || uiState.undoPressed || firstMove[0] || firstMove[8]);
    $("#btn-draw").SetHasClass("disabled", mySide != currentSide || uiState.drawPressed || firstMove[0] || firstMove[8] || uiState.pendingDraw);
    $("#btn-resign").SetHasClass("disabled", uiState.resignPressed);
    $("#btn-undo").SetHasClass("hidden", uiState.drawPressed || uiState.resignPressed);
    $("#btn-draw").SetHasClass("hidden", uiState.resignPressed || uiState.undoPressed);
    $("#btn-resign").SetHasClass("hidden", uiState.drawPressed || uiState.undoPressed);
    $("#btn-confirm").SetHasClass("hidden", !uiState.resignPressed && !uiState.undoPressed);
    $("#btn-cancel").SetHasClass("hidden", !uiState.drawPressed && !uiState.resignPressed && !uiState.undoPressed);
    $("#draw-request-container").SetHasClass("hidden", !uiState.pendingDraw);
    $("#undo-request-container").SetHasClass("hidden", !uiState.pendingUndo);
}

function Resign() {
    GameEvents.SendCustomGameEventToServer("resign", {
        playerId: Players.GetLocalPlayer(),
        playerSide: mySide
    });
}

function RequestUndo() {
    GameEvents.SendCustomGameEventToServer("request_undo", {
        playerId: Players.GetLocalPlayer(),
        playerSide: mySide
    });
}

function OnTogglePlayerPressed() {
    mySide = 1 - mySide + 7;
    uiState = uiStates[mySide];
    $("#btn-toggle-player-label").text = mySide == 0 ? "Black" : "White";
    UpdateUI();
    RedrawBoard();
    UpdatePlayerPanel();
}

function UpdatePlayerPanel() {
    [0, 8].forEach(function (side) {
        var pos = (mySide == side ? "bottom" : "top");
        if (players[side] != null) {
            var playerInfo = Game.GetPlayerInfo(players[side]);
            if (playerInfo) {
                $("#player-" + pos).steamid = playerInfo.player_steamid;
                $("#player-" + pos).SetHasClass("hidden", false);
            }
        }
        else {
            $("#player-" + pos).steamid = 0;
            $("#player-" + pos).SetHasClass("hidden", true);
        }
    });
    HighlightPlayerToMove(currentSide);
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

    InitLookupSquare();
    CreateChatPanel();
    //CreateBoard();

    GameEvents.Subscribe("board_update", OnBoardUpdate);
    GameEvents.Subscribe("board_checkmate", OnBoardCheckmate);
    GameEvents.Subscribe("board_stalemate", OnBoardStalemate);
    GameEvents.Subscribe("board_reset", OnBoardReset);
    GameEvents.Subscribe("board_pause_changed", OnPauseChanged);
    GameEvents.Subscribe("receive_moves", OnReceiveMoves);
    GameEvents.Subscribe("undo_offer", OnReceivedUndoOffer);
    GameEvents.Subscribe("draw_offer", OnReceivedDrawOffer);
    GameEvents.Subscribe("draw_claimed", OnReceivedDrawClaimed);
    GameEvents.Subscribe("resigned", OnReceivedResigned);
    GameEvents.Subscribe("timeout_end", OnReceivedTimedOut);

    if (Game.GetPlayerIDsOnTeam(DOTATeam_t.DOTA_TEAM_GOODGUYS).length) {
        players[8] = Game.GetPlayerIDsOnTeam(DOTATeam_t.DOTA_TEAM_GOODGUYS)[0];
    }
    if (Game.GetPlayerIDsOnTeam(DOTATeam_t.DOTA_TEAM_BADGUYS).length) {
        players[0] = Game.GetPlayerIDsOnTeam(DOTATeam_t.DOTA_TEAM_BADGUYS)[0];
    }
    $.Msg("players ", players);


    UpdatePlayerPanel();
    UpdateTimePanel();
    $("#timer-bottom").SetHasClass("highlight", true);
    $.Msg("main.js");
})();