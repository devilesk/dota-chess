require("libraries/util")
require("libraries/timers")
--require("libraries/bit32")
require("debugf")
require("garbochess")
print("debug", DebugPrint)
-- Generated from template

if GameMode == nil then
    GameMode = class({})
end

local game_in_progress = false
local host_player_id = 0
local INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
local g_allMoves = {}
local DEBUG = false
local moves = nil
local time_control = true
 -- clock_time and clock_increment are tenths of a second
local clock_time = 600
local clock_increment = 20
local paused = false
local has_timed_out = false
local ai_side = 0
-- 0 = black
-- 8 = white
local max_ply_table = {1, 3, 88888}
local ai_ply_difficulty = 1
--local ai_max_think_time = 5

function GameMode:OnNPCSpawned(event)
    DebugPrint("OnNPCSpawned", event)
    local npc = EntIndexToHScript(event.entindex)
    if npc:IsRealHero() then
        npc:RemoveSelf()
    end
end

function GameMode:OnGameRulesStateChange()
    local nNewState = GameRules:State_Get()
        DebugPrint("OnGameRulesStateChange", nNewState)
    if nNewState == DOTA_GAMERULES_STATE_INIT then
        DebugPrint("DOTA_GAMERULES_STATE_INIT")
    elseif nNewState == DOTA_GAMERULES_STATE_WAIT_FOR_PLAYERS_TO_LOAD then
        DebugPrint("DOTA_GAMERULES_STATE_WAIT_FOR_PLAYERS_TO_LOAD")
    elseif nNewState == DOTA_GAMERULES_STATE_CUSTOM_GAME_SETUP then
        DebugPrint("DOTA_GAMERULES_STATE_CUSTOM_GAME_SETUP")
        
        -- find host player id
        for i = 0, DOTA_MAX_TEAM_PLAYERS do
            if PlayerResource:IsValidPlayerID(i) then
                local player = PlayerResource:GetPlayer(i)
                if GameRules:PlayerHasCustomGameHostPrivileges(player) then
                    host_player_id = i
                    DebugPrint ("host found", host_player_id)
                    CustomNetTables:SetTableValue("game_setup", "host", {player_id=host_player_id})
                    break
                end
            end
        end

        -- register console commands
        Convars:RegisterCommand("chess_set_fen", Dynamic_Wrap(GameMode, "OnSetFENCommand"), "Set board position in FEN format", 0)
        Convars:RegisterCommand("chess_get_fen", Dynamic_Wrap(GameMode, "OnGetFENCommand"), "Get board position in FEN format", 0)
        Convars:RegisterConvar("chess_ai", "1", "Set to 1 to turn ai on. Set to 0 to disable ai.", 0)
        Convars:SetBool("chess_ai", PlayerResource:GetPlayerCount() == 1)
        DebugPrint("chess_ai", Convars:GetBool("chess_ai"))
        
    elseif nNewState == DOTA_GAMERULES_STATE_HERO_SELECTION then
        DebugPrint("DOTA_GAMERULES_STATE_HERO_SELECTION")
        CustomGameEventManager:Send_ServerToPlayer(PlayerResource:GetPlayer(host_player_id), "game_setup_end", {})
    elseif nNewState == DOTA_GAMERULES_STATE_PRE_GAME then
        DebugPrint("DOTA_GAMERULES_STATE_PRE_GAME")
        CustomNetTables:SetTableValue("chess", "players", {count=PlayerResource:GetPlayerCount()})
        
        if PlayerResource:GetTeam(0) == DOTA_TEAM_GOODGUYS then
            ai_side = 0
        else
            ai_side = 8
        end
        DebugPrint("ai_side " .. ai_side)
    elseif nNewState == DOTA_GAMERULES_STATE_GAME_IN_PROGRESS then
        OnNewGame(0, {})
    --[[
        SetTimeout(3)
        --SetYieldCount(3)
        --SetMaxMoveAnalysis(99999999999)
        --SetMaxMoveAnalysis(10)
        ai_ply_difficulty = 1
        InitializeEval();
        ResetGame();
        InitializeFromFen(INITIAL_FEN);
        --autogame();
        OnGetMoves()
        AIMove()
    ]]
    end
end

function Precache( context )
    PrecacheResource("soundfile", "soundevents/custom_sounds.vsndevts", context)
end

-- Create the game mode when we activate
function Activate()
    GameRules.AddonTemplate = GameMode()
    GameRules.AddonTemplate:InitGameMode()
end

function GameMode:InitGameMode()
    DebugPrint("InitGameMode")

    GameRules:GetGameModeEntity():SetAnnouncerDisabled(true)
    
    ListenToGameEvent("npc_spawned", Dynamic_Wrap(GameMode, "OnNPCSpawned"), self)
    ListenToGameEvent("game_rules_state_change", Dynamic_Wrap(GameMode, "OnGameRulesStateChange"), self)
    
    GameRules:SetCustomGameTeamMaxPlayers( DOTA_TEAM_GOODGUYS, 1 )
    GameRules:SetCustomGameTeamMaxPlayers( DOTA_TEAM_BADGUYS, 1 )

    CustomGameEventManager:RegisterListener( "game_setup_options", OnGameSetupOptions )
    CustomGameEventManager:RegisterListener( "send_chat_message", OnSendChatMessage )
    CustomGameEventManager:RegisterListener( "get_moves", OnGetMoves )
    CustomGameEventManager:RegisterListener( "drop_piece", OnDropPiece )
    CustomGameEventManager:RegisterListener( "new_game", OnNewGame )
    CustomGameEventManager:RegisterListener( "change_pause_state", OnChangePauseState )
    CustomGameEventManager:RegisterListener( "claim_draw", OnClaimDraw )
    CustomGameEventManager:RegisterListener( "decline_draw", OnDeclineDraw )
    CustomGameEventManager:RegisterListener( "resign", OnResign )
    CustomGameEventManager:RegisterListener( "time_out", OnTimeOut )
    CustomGameEventManager:RegisterListener( "request_undo", OnRequestUndo )
    CustomGameEventManager:RegisterListener( "decline_undo", OnDeclineUndo )
    CustomGameEventManager:RegisterListener( "accept_undo", OnAcceptUndo )
    CustomGameEventManager:RegisterListener( "request_swap", OnRequestSwap )
    CustomGameEventManager:RegisterListener( "decline_swap", OnDeclineSwap )
    CustomGameEventManager:RegisterListener( "accept_swap", OnAcceptSwap )
    
    CustomNetTables:SetTableValue("debug", "log", {value=0})
    Convars:RegisterCommand("chess_debug", Dynamic_Wrap(GameMode, "OnSetDebug"), "Set to 1 to turn on debug output. Set to 0 to disable.", 0)
end

function GameMode:OnSetDebug(value)
    if Convars:GetDOTACommandClient() then
        local player = Convars:GetDOTACommandClient()
        local playerID = player:GetPlayerID()
        if playerID == host_player_id then
            DebugPrint("Setting debug", value)
            CustomNetTables:SetTableValue("debug", "log", {value=tonumber(value)})
        end
    end
end

function GameMode:OnSetFENCommand(fen)
    if Convars:GetDOTACommandClient() then
        local player = Convars:GetDOTACommandClient()
        local playerID = player:GetPlayerID()
        if playerID == host_player_id then
            DebugPrint("Setting FEN", fen)
            if game_in_progress then
                OnSubmitFen(0, {fen=fen})
            else
                INITIAL_FEN = fen
            end
        end
    end
end

function GameMode:OnGetFENCommand()
    DebugPrint(GetFen())
end

function OnGameSetupOptions(eventSourceIndex, args)
    DebugPrint("OnGameSetupOptions", eventSourceIndex)
    DebugPrintTable(args)
    time_control = args.timeControl
    clock_time = args.timeTotal * 600
    clock_increment = args.timeIncrement * 10
    if clock_time == 0 then
        clock_time = clock_increment
    end
    ai_ply_difficulty = max_ply_table[tonumber(args.aiDifficulty)]
    DebugPrint("time_control", time_control)
    DebugPrint("clock_time", clock_time)
    DebugPrint("clock_increment", clock_increment)
    DebugPrint("ai_ply_difficulty", ai_ply_difficulty)
    
    CustomNetTables:SetTableValue("game_setup", "options", args)
end

function OnSendChatMessage(eventSourceIndex, args)
    DebugPrint("OnSendChatMessage", eventSourceIndex)
    DebugPrintTable(args)
    CustomGameEventManager:Send_ServerToAllClients("receive_chat_message", {message=args['message'], playerId=args['playerID']})
end

function OnGetMoves(eventSourceIndex, args)
    if moves == nil then
        moves = GenerateValidMoves()
    end
    CustomGameEventManager:Send_ServerToAllClients("receive_moves", {moves=moves})
end

function OnNewGame(eventSourceIndex, args)
    args.fen = INITIAL_FEN
    OnSubmitFen(eventSourceIndex, args)
    CustomGameEventManager:Send_ServerToAllClients("receive_chat_event", {l_message={"#event_game_started"}, playerId=-1})
    game_in_progress = true
end

function OnSubmitFen(eventSourceIndex, args)
    g_allMoves = {}
    InitializeEval()
    ResetGame()
    InitializeFromFen(args.fen)
    moves = GenerateValidMoves()
    has_timed_out = false
    CustomGameEventManager:Send_ServerToAllClients("board_reset", {ai_side=ai_side, board=g_board, toMove=g_toMove, moves=moves, clock_time=clock_time, clock_increment=clock_increment, time_control=time_control})
    AIMove()
end

function OnChangePauseState(eventSourceIndex, args)
    paused = args.paused
    CustomGameEventManager:Send_ServerToAllClients("board_pause_changed", {paused=paused})
end

function promotionCheck(move, promotionType)
    if (bit.band(move, moveflagPromotion) > 0 and promotionType ~= nil) then
        if (bit.band( move, moveflagPromoteBishop )>0 ) then
            return promotionType == "bishop"
        else
            if ( bit.band( move, moveflagPromoteKnight )>0 ) then
                return promotionType == "knight"
            else
                if ( bit.band( move, moveflagPromoteQueen )>0 ) then
                    return promotionType == "queen"
                else
                    return promotionType == "rook"
                end
            end
        end
    elseif bit.band(move, moveflagPromotion) <= 0 and promotionType == nil then
        return true
    else
        return false
    end
end

function getSideString(side)
    if side == 0 then
        return "#side_black"
    else
        return "#side_white"
    end
end

function OnDropPiece(eventSourceIndex, args)
    DebugPrint("OnDropPiece", eventSourceIndex)
    DebugPrintTable(args)

    if g_toMove ~= args.playerSide then return end

    if moves == nil then
        moves = GenerateValidMoves()
    end

    local move
    for k, v in ipairs(moves) do
        if (bit.band(v, 0xFF) == MakeSquare(args.startY, args.startX) and
            bit.band(bit.rshift(v, 8), 0xFF) == MakeSquare(args.endY, args.endX) and
            promotionCheck(v, args.promotionType)) then
            move = v
            DebugPrint("found move in valid moves", move)
        end
    end

    if (not (args.startX == args.endX and args.startY == args.endY) and move ~= nil) then
        DebugPrint("making move " .. g_move50)
        table.insert(g_allMoves, move)
        local san, captured_piece = GetMoveSAN(move)
        MakeMove(move)
        moves = GenerateValidMoves()
        SendBoardUpdate(san, move, moves, false, captured_piece)
        
        if args.offerDraw ~= 0 then
            CustomGameEventManager:Send_ServerToAllClients("draw_offer", {
                playerId = args.playerId,
                playerSide = args.playerSide
            })
            local l_message = {getSideString(args.playerSide),"#event_request_draw"}
            CustomGameEventManager:Send_ServerToAllClients("receive_chat_event", {l_message=l_message, playerId=-1})
        end

        if #moves == 0 then
            -- checkmate
            if g_inCheck then
                EmitGlobalSound("Chess.Checkmate")
            -- stalemate
            else
                EmitGlobalSound("Chess.Stalemate")
            end
            --elseif g_move50 == 50 or IsRepDraw() then
            --  EmitGlobalSound("Chess.Stalemate")
        else
            if g_inCheck then
                EmitGlobalSound("Chess.Check")
            else
                EmitGlobalSound("Creep_Radiant.Footstep")
            end
            AIMove()
        end
    end
end

function AIMove()
    if Convars:GetBool("chess_ai") and g_toMove == ai_side and not paused then
        Timers:CreateTimer(1, function ()
            DebugPrint("AIMove first timer", ai_ply_difficulty)
            local co = coroutine.create(Search)
            local _, co_result = coroutine.resume(co, finishMoveCallback, ai_ply_difficulty, finishPlyCallback)
            if not co_result then
                Timers:CreateTimer(0.01, function ()
                    --DebugPrint("AIMove resume timer", Time())
                    local _, co_result = coroutine.resume(co)
                    if not co_result then
                        return 0.01
                    else
                        --DebugPrint ("AIMove done")
                    end
                end)
            end
            --Search(finishMoveCallback, ai_ply_difficulty, finishPlyCallback);
        end)
    end
end

function UndoMove()
    if #g_allMoves == 0 then
        return nil
    end
    local moveToUndo = table.remove(g_allMoves)
    DebugPrint ("UndoMove", moveToUndo)
    UnmakeMove(moveToUndo)
    return moveToUndo
end

function SendBoardUpdate(san, move, moves, undo, captured_piece)
    DebugPrint("SendBoardUpdate", move, moves, captured_piece)
    local data = {
        board=g_board,
        toMove=g_toMove,
        san=san,
        moves=moves,
        last_move=move,
        check=g_inCheck,
        paused=paused,
        move50=g_move50,
        repDraw=Is3RepDraw(),
        undo=undo,
        captured_piece=captured_piece
    }
    CustomGameEventManager:Send_ServerToAllClients("board_update", data)
end

function OnClaimDraw(eventSourceIndex, args)
    DebugPrint ("OnClaimDraw", eventSourceIndex)
    DebugPrintTable(args)
    CustomGameEventManager:Send_ServerToAllClients("draw_claimed", {
        playerId = args.playerId,
        playerSide = args.playerSide
    })
    local l_message = {getSideString(args.playerSide),"#event_accept_draw"}
    CustomGameEventManager:Send_ServerToAllClients("receive_chat_event", {l_message=l_message, playerId=-1})
    EmitGlobalSound("Chess.Draw")
end

function OnDeclineDraw(eventSourceIndex, args)
    DebugPrint ("OnDeclineDraw", eventSourceIndex)
    DebugPrintTable(args)
    local l_message = {getSideString(args.playerSide),"#event_decline_draw"}
    CustomGameEventManager:Send_ServerToAllClients("receive_chat_event", {l_message=l_message, playerId=-1})
end

function OnResign(eventSourceIndex, args)
    DebugPrint ("OnResign", eventSourceIndex)
    DebugPrintTable(args)
    CustomGameEventManager:Send_ServerToAllClients("resigned", {
        playerId = args.playerId,
        playerSide = args.playerSide
    })
    local l_message = {getSideString(args.playerSide),"#event_resign"}
    CustomGameEventManager:Send_ServerToAllClients("receive_chat_event", {l_message=l_message, playerId=-1})
end

function OnTimeOut(eventSourceIndex, args)
    DebugPrint ("OnTimeOut", eventSourceIndex)
    DebugPrintTable(args)
    if not has_timed_out then
        CustomGameEventManager:Send_ServerToAllClients("timeout_end", {
            playerId = args.playerId,
            playerSide = args.playerSide
        })
        has_timed_out = true
    end
end

function OnRequestSwap(eventSourceIndex, args)
    DebugPrint ("OnRequestSwap", eventSourceIndex)
    DebugPrintTable(args)
    CustomGameEventManager:Send_ServerToAllClients("swap_offer", {
        playerId = args.playerId,
        playerSide = args.playerSide
    })
    local l_message = {getSideString(args.playerSide),"#event_request_swap"}
    CustomGameEventManager:Send_ServerToAllClients("receive_chat_event", {l_message=l_message, playerId=-1})
end

function OnDeclineSwap(eventSourceIndex, args)
    DebugPrint ("OnDeclineSwap", eventSourceIndex)
    DebugPrintTable(args)
    local l_message = {getSideString(args.playerSide),"#event_decline_swap"}
    CustomGameEventManager:Send_ServerToAllClients("receive_chat_event", {l_message=l_message, playerId=-1})
end

function OnAcceptSwap(eventSourceIndex, args)
    DebugPrint ("OnAcceptSwap", eventSourceIndex)
    DebugPrintTable(args)
    CustomGameEventManager:Send_ServerToAllClients("swap_sides", {
        playerId = args.playerId,
        playerSide = args.playerSide
    })
    ai_side = 1 - ai_side + 7
    OnNewGame(0, {})
    local l_message = {getSideString(args.playerSide),"#event_accept_swap"}
    CustomGameEventManager:Send_ServerToAllClients("receive_chat_event", {l_message=l_message, playerId=-1})
end

function OnRequestUndo(eventSourceIndex, args)
    DebugPrint ("OnRequestUndo", eventSourceIndex)
    DebugPrintTable(args)
    CustomGameEventManager:Send_ServerToAllClients("undo_offer", {
        playerId = args.playerId,
        playerSide = args.playerSide
    })
    local l_message = {getSideString(args.playerSide),"#event_request_undo"}
    CustomGameEventManager:Send_ServerToAllClients("receive_chat_event", {l_message=l_message, playerId=-1})
end

function OnDeclineUndo(eventSourceIndex, args)
    DebugPrint ("OnDeclineUndo", eventSourceIndex)
    DebugPrintTable(args)
    local l_message = {getSideString(args.playerSide),"#event_decline_undo"}
    CustomGameEventManager:Send_ServerToAllClients("receive_chat_event", {l_message=l_message, playerId=-1})
end

function OnAcceptUndo(eventSourceIndex, args)
    DebugPrint ("OnAcceptUndo", eventSourceIndex, #g_allMoves)
    DebugPrintTable(args)
    if #g_allMoves <= 1 then return end
    UndoMove()
    local move = UndoMove()
    DebugPrint ("move", move)
    table.insert(g_allMoves, move)
    local san, captured_piece = GetMoveSAN(move)
    MakeMove(move);
    moves = GenerateValidMoves()
    SendBoardUpdate(san, move, moves, true, captured_piece)
    local l_message = {getSideString(args.playerSide),"#event_accept_undo"}
    CustomGameEventManager:Send_ServerToAllClients("receive_chat_event", {l_message=l_message, playerId=-1})
end

-- Called on Ply finish
function finishPlyCallback(bestMove, value, ply)
    if (bestMove ~= nil and bestMove ~= 0) then
        DebugPrint(BuildPVMessage(bestMove, value, ply));
    end
end
--

-- Called on Move ready to answer
function finishMoveCallback(bestMove, value, ply)
    if (bestMove ~= nil and bestMove ~= 0) then
        table.insert(g_allMoves, bestMove)
        local san, captured_piece = GetMoveSAN(bestMove)
        MakeMove(bestMove);
        DebugPrint(FormatMove(bestMove), g_moveTime, g_finCnt);
        --g_foundmove = bestMove;
        moves = GenerateValidMoves()

        if #moves == 0 then
            -- checkmate
            if g_inCheck then
                EmitGlobalSound("Chess.Checkmate")
            -- stalemate
            else
                EmitGlobalSound("Chess.Stalemate")
            end
        --elseif g_move50 == 50 or IsRepDraw() then
        --    EmitGlobalSound("Chess.Stalemate")
        else
            if g_inCheck then
                EmitGlobalSound("Chess.Check")
            else
                EmitGlobalSound("Creep_Radiant.Footstep")
            end
        end
        SendBoardUpdate(san, bestMove, moves, false, captured_piece)
    --[[elseif (bestMove ~= nil and bestMove == 0) then
        if g_inCheck then
            CustomGameEventManager:Send_ServerToAllClients("board_checkmate", {board=g_board, toMove=g_toMove})
        else
            CustomGameEventManager:Send_ServerToAllClients("board_stalemate", {board=g_board, toMove=g_toMove})
        end]]

        --[[PlayerResource:SetCustomTeamAssignment(0, DOTA_TEAM_BADGUYS)
        DebugPrint("player 0 team " .. PlayerResource:GetTeam(0))

        PlayerResource:SetCustomTeamAssignment(0, DOTA_TEAM_GOODGUYS)
        DebugPrint("player 0 team " .. PlayerResource:GetTeam(0))
        DebugPrint("player count " .. PlayerResource:GetPlayerCount())]]
    end
end
--