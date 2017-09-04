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
local rematch_requested = {}
local player_count = 1
local host_player_id = 0
local INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
local move_history = {}
local DEBUG = 0 -- initial value of chess_debug
local DEBUG_PLAYER_COUNT = nil -- nil, 1, 2
local time_control = true
 -- clock_time and clock_increment are tenths of a second
local clock_time = 600
local clock_increment = 20
local clock_start = {}
local clock_timer = {}
local clock_remaining_initial = {}
local clock_remaining = {}
local ai_on = 1
local ai_thinking = false
local paused = false
local has_timed_out = false
local ai_side = 0
local player_sides
-- 0 = black
-- 8 = white
local max_ply_table = {1, 3, 88888}
local ai_ply_difficulty = 1
--local ai_max_think_time = 5

function toboolbit(value)
    if value and value ~= "0" and value ~= 0 then
        return 1
    else
        return 0
    end
end

function InitPlayerSides()
    local t1, t2
    for i = 0, DOTA_MAX_TEAM_PLAYERS do
        if PlayerResource:GetTeam(i) == DOTA_TEAM_GOODGUYS then
            t1 = i
        elseif PlayerResource:GetTeam(i) == DOTA_TEAM_BADGUYS then
            t2 = i
        end
        if t1 and t2 then
            break
        end
    end
    player_sides = {
        [0]=t2,
        [8]=t1
    }
end

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
                    DebugPrint("host found", host_player_id)
                    CustomNetTables:SetTableValue("game_setup", "host", {player_id=host_player_id})
                    break
                end
            end
        end

        -- register console commands
        Convars:RegisterCommand("chess_set_fen", Dynamic_Wrap(GameMode, "OnSetFENCommand"), "Set board position in FEN format", 0)
        Convars:RegisterCommand("chess_get_fen", Dynamic_Wrap(GameMode, "OnGetFENCommand"), "Get board position in FEN format", 0)
        Convars:RegisterCommand("chess_ai", Dynamic_Wrap(GameMode, "OnSetAI"), "Set to 1 to turn ai on. Set to 0 to disable ai.", 0)
        
    elseif nNewState == DOTA_GAMERULES_STATE_HERO_SELECTION then
        DebugPrint("DOTA_GAMERULES_STATE_HERO_SELECTION")
        
        player_count = DEBUG_PLAYER_COUNT or (PlayerResource:GetPlayerCountForTeam(DOTA_TEAM_GOODGUYS) + PlayerResource:GetPlayerCountForTeam(DOTA_TEAM_BADGUYS))
        CustomNetTables:SetTableValue("chess", "players", {count=player_count})
        
        SetAI(player_count == 1)
        DebugPrint("chess_ai", ai_on)
        
        InitPlayerSides()
        
        if PlayerResource:GetTeam(0) == DOTA_TEAM_GOODGUYS then
            ai_side = 0
        else
            ai_side = 8
        end
        DebugPrint("ai_side " .. ai_side)
        
        CustomGameEventManager:Send_ServerToPlayer(PlayerResource:GetPlayer(host_player_id), "game_setup_end", {})
    elseif nNewState == DOTA_GAMERULES_STATE_PRE_GAME then
        DebugPrint("DOTA_GAMERULES_STATE_PRE_GAME")
    elseif nNewState == DOTA_GAMERULES_STATE_GAME_IN_PROGRESS then
        OnNewGame(0, {})
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
    --CustomGameEventManager:RegisterListener( "new_game", OnNewGame )
    CustomGameEventManager:RegisterListener( "change_pause_state", OnChangePauseState )
    CustomGameEventManager:RegisterListener( "claim_draw", OnClaimDraw )
    CustomGameEventManager:RegisterListener( "decline_draw", OnDeclineDraw )
    CustomGameEventManager:RegisterListener( "resign", OnResign )
    CustomGameEventManager:RegisterListener( "time_out", OnTimeOut )
    CustomGameEventManager:RegisterListener( "request_rematch", OnRequestRematch )
    CustomGameEventManager:RegisterListener( "decline_rematch", OnDeclineRematch )
    CustomGameEventManager:RegisterListener( "request_undo", OnRequestUndo )
    CustomGameEventManager:RegisterListener( "decline_undo", OnDeclineUndo )
    CustomGameEventManager:RegisterListener( "accept_undo", OnAcceptUndo )
    CustomGameEventManager:RegisterListener( "request_swap", OnRequestSwap )
    CustomGameEventManager:RegisterListener( "decline_swap", OnDeclineSwap )
    CustomGameEventManager:RegisterListener( "accept_swap", OnAcceptSwap )

    CustomNetTables:SetTableValue("debug", "log", {value=DEBUG})
    Convars:RegisterCommand("chess_debug", Dynamic_Wrap(GameMode, "OnSetDebug"), "Set to 1 to turn on debug output. Set to 0 to disable.", 0)
    
    GameRules:GetGameModeEntity():SetThink( "OnSetTimeOfDayThink", self, "SetTimeOfDay", 2 )
end

function GameMode:OnSetTimeOfDayThink()
    GameRules:SetTimeOfDay(.5)
    return 10
end

function GameMode:OnSetDebug(value)
    if Convars:GetDOTACommandClient() then
        local player = Convars:GetDOTACommandClient()
        local playerID = player:GetPlayerID()
        if playerID == host_player_id then
            DebugPrint("Setting debug", value)
            CustomNetTables:SetTableValue("debug", "log", {value=toboolbit(value)})
        end
    end
end

function GameMode:OnSetAI(value)
    if Convars:GetDOTACommandClient() then
        local player = Convars:GetDOTACommandClient()
        local playerID = player:GetPlayerID()
        if playerID == host_player_id then
            DebugPrint("Setting ai", value)
            SetAI(value)
        end
    end
end

function SetAI(value)
    ai_on = toboolbit(value)
    CustomNetTables:SetTableValue("chess", "ai", {value=ai_on})
    DebugPrint("SetAI", ai_on)
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
    
    args.clock_time = clock_time
    
    CustomNetTables:SetTableValue("game_setup", "options", args)
end

function OnSendChatMessage(eventSourceIndex, args)
    DebugPrint("OnSendChatMessage", eventSourceIndex)
    DebugPrintTable(args)
    CustomGameEventManager:Send_ServerToAllClients("receive_chat_message", {message=args['message'], playerId=args['playerID']})
end

function OnGetMoves(eventSourceIndex, args)
    CustomGameEventManager:Send_ServerToAllClients("receive_moves", {moves=GenerateValidMoves()})
end

function OnNewGame(eventSourceIndex, args)
    args.fen = INITIAL_FEN
    OnSubmitFen(eventSourceIndex, args)
    CustomGameEventManager:Send_ServerToAllClients("receive_chat_event", {l_message={"#event_game_started"}, playerId=-1})
    game_in_progress = true
end

function OnSubmitFen(eventSourceIndex, args)
    ClearMoves()
    InitializeEval()
    ResetGame()
    InitializeFromFen(args.fen)
    has_timed_out = false
    local moves = GenerateValidMoves()
    rematch_requested = {}
    clock_start = {}
    clock_remaining[0] = clock_time
    clock_remaining[8] = clock_time
    clock_remaining_initial[0] = clock_time
    clock_remaining_initial[8] = clock_time
    if clock_timer[0] ~= nil then Timers:RemoveTimer(clock_timer[0]) end
    if clock_timer[8] ~= nil then Timers:RemoveTimer(clock_timer[8]) end
    clock_timer = {}
    CustomNetTables:SetTableValue("time", "0", {remaining=clock_remaining[0]})
    CustomNetTables:SetTableValue("time", "8", {remaining=clock_remaining[8]})
    CustomGameEventManager:Send_ServerToAllClients("board_reset", {player_sides=player_sides, board=g_board, toMove=g_toMove, moves=moves, clock_time=clock_time, clock_increment=clock_increment, time_control=time_control})
    TryAIMove()
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

    if g_toMove ~= args.playerSide or ai_thinking then return end

    local move
    for k, v in ipairs(GenerateValidMoves()) do
        if (bit.band(v, 0xFF) == MakeSquare(args.startY, args.startX) and
            bit.band(bit.rshift(v, 8), 0xFF) == MakeSquare(args.endY, args.endX) and
            promotionCheck(v, args.promotionType)) then
            move = v
            DebugPrint("found move in valid moves", move)
        end
    end

    if (not (args.startX == args.endX and args.startY == args.endY) and move ~= nil) then
        DebugPrint("making move " .. g_move50)
        
        local _, san, captured_piece, moves = DoMove(move)
        SendBoardUpdate(move, san, captured_piece, moves, false)
        PlayEndMoveSound(#moves)
        EndTurn()
        StartTurn()
        
        if args.offerDraw ~= 0 then
            CustomGameEventManager:Send_ServerToAllClients("draw_offer", {
                playerId = args.playerId,
                playerSide = args.playerSide
            })
            local l_message = {getSideString(args.playerSide),"#event_request_draw"}
            CustomGameEventManager:Send_ServerToAllClients("receive_chat_event", {l_message=l_message, playerId=-1})
        end

        if #moves > 0 then
            TryAIMove()
        end
    end
end

function TryAIMove()
    if ai_on == 1 and g_toMove == ai_side and not paused then
        ai_thinking = true
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
                        ai_thinking = false
                        DebugPrint("AIMove done")
                    end
                end)
            else
                ai_thinking = false
                DebugPrint("AIMove done")
            end
            --Search(finishMoveCallback, ai_ply_difficulty, finishPlyCallback);
        end)
    end
end

function SendBoardUpdate(move, san, captured_piece, moves, undo)
    DebugPrint("SendBoardUpdate", move, san, captured_piece, moves, undo)
    local data = {
        board=g_board,
        toMove=g_toMove,
        san=san,
        moves=moves,
        move=move,
        check=g_inCheck,
        paused=paused,
        move50=g_move50,
        repDraw=Is3RepDraw(),
        undo=undo,
        captured_piece=captured_piece,
        numPly=#move_history
    }
    CustomGameEventManager:Send_ServerToAllClients("board_update", data)
end

function OnRequestRematch(eventSourceIndex, args)
    DebugPrint("OnRequestRematch", eventSourceIndex)
    DebugPrintTable(args)
    rematch_requested[args.playerSide] = true
    if player_count == 1 or (rematch_requested[0] and rematch_requested[8]) then
        OnNewGame(0, {})
    end
end

function OnDeclineRematch(eventSourceIndex, args)
    DebugPrint("OnRequestRematch", eventSourceIndex)
    DebugPrintTable(args)
    rematch_requested[args.playerSide] = false
end

function OnClaimDraw(eventSourceIndex, args)
    DebugPrint("OnClaimDraw", eventSourceIndex)
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
    DebugPrint("OnDeclineDraw", eventSourceIndex)
    DebugPrintTable(args)
    local l_message = {getSideString(args.playerSide),"#event_decline_draw"}
    CustomGameEventManager:Send_ServerToAllClients("receive_chat_event", {l_message=l_message, playerId=-1})
end

function OnResign(eventSourceIndex, args)
    DebugPrint("OnResign", eventSourceIndex)
    DebugPrintTable(args)
    CustomGameEventManager:Send_ServerToAllClients("resigned", {
        playerId = args.playerId,
        playerSide = args.playerSide
    })
    local l_message = {getSideString(args.playerSide),"#event_resign"}
    CustomGameEventManager:Send_ServerToAllClients("receive_chat_event", {l_message=l_message, playerId=-1})
end

function OnTimeOut(eventSourceIndex, args)
    DebugPrint("OnTimeOut", eventSourceIndex)
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
    DebugPrint("OnRequestSwap", eventSourceIndex)
    DebugPrintTable(args)
    CustomGameEventManager:Send_ServerToAllClients("swap_offer", {
        playerId = args.playerId,
        playerSide = args.playerSide
    })
    local l_message = {getSideString(args.playerSide),"#event_request_swap"}
    CustomGameEventManager:Send_ServerToAllClients("receive_chat_event", {l_message=l_message, playerId=-1})
end

function OnDeclineSwap(eventSourceIndex, args)
    DebugPrint("OnDeclineSwap", eventSourceIndex)
    DebugPrintTable(args)
    local l_message = {getSideString(args.playerSide),"#event_decline_swap"}
    CustomGameEventManager:Send_ServerToAllClients("receive_chat_event", {l_message=l_message, playerId=-1})
end

function OnAcceptSwap(eventSourceIndex, args)
    DebugPrint("OnAcceptSwap", eventSourceIndex)
    DebugPrintTable(args)
    
    local temp = player_sides[0]
    player_sides[0] = player_sides[8]
    player_sides[8] = temp
    ai_side = 1 - ai_side + 7
    
    OnNewGame(0, {})
    
    local l_message = {getSideString(args.playerSide),"#event_accept_swap"}
    CustomGameEventManager:Send_ServerToAllClients("receive_chat_event", {l_message=l_message, playerId=-1})
end

function OnRequestUndo(eventSourceIndex, args)
    DebugPrint("OnRequestUndo", eventSourceIndex)
    DebugPrintTable(args)
    CustomGameEventManager:Send_ServerToAllClients("undo_offer", {
        playerId = args.playerId,
        playerSide = args.playerSide
    })
    local l_message = {getSideString(args.playerSide),"#event_request_undo"}
    CustomGameEventManager:Send_ServerToAllClients("receive_chat_event", {l_message=l_message, playerId=-1})
end

function OnDeclineUndo(eventSourceIndex, args)
    DebugPrint("OnDeclineUndo", eventSourceIndex)
    DebugPrintTable(args)
    local l_message = {getSideString(args.playerSide),"#event_decline_undo"}
    CustomGameEventManager:Send_ServerToAllClients("receive_chat_event", {l_message=l_message, playerId=-1})
end

function OnAcceptUndo(eventSourceIndex, args)
    DebugPrint("OnAcceptUndo", eventSourceIndex, #move_history)
    DebugPrintTable(args)
    if ai_thinking then return end
    if player_count == 1 and #move_history == 1 and ai_side == 8 then return end
    if player_count == 1 and g_toMove == ai_side then return end
    
    UndoMove()
    if player_count == 1 then
        UndoMove()
    end
    has_timed_out = false
    local move, san, captured_piece, saved_clock_remaining, saved_clock_start = GetLastMove()
    if saved_clock_remaining then
        clock_remaining[0] = saved_clock_remaining[0]
        clock_remaining[8] = saved_clock_remaining[8]
    else
        clock_remaining[0] = clock_time
        clock_remaining[8] = clock_time
    end
    if saved_clock_start then
        clock_start[0] = saved_clock_start[0]
        clock_start[8] = saved_clock_start[8]
    else
        clock_start[0] = nil
        clock_start[8] = nil
    end
    if clock_timer[0] ~= nil then Timers:RemoveTimer(clock_timer[0]) end
    if clock_timer[8] ~= nil then Timers:RemoveTimer(clock_timer[8]) end
    CustomNetTables:SetTableValue("time", "0", {remaining=clock_remaining[0]})
    CustomNetTables:SetTableValue("time", "8", {remaining=clock_remaining[8]})
    DebugPrint("move", move)
    DebugPrint("saved_clock_remaining")
    DebugPrintTable(saved_clock_remaining)
    StartTurn()
    local moves = GenerateValidMoves()
    SendBoardUpdate(move, san, captured_piece, moves, true)
    if player_count > 1 then
        local l_message = {getSideString(args.playerSide),"#event_accept_undo"}
        CustomGameEventManager:Send_ServerToAllClients("receive_chat_event", {l_message=l_message, playerId=-1})
    end
end

function UndoMove()
    if #move_history == 0 then
        return nil
    end
    local move = table.remove(move_history)
    DebugPrint("UndoMove", move)
    UnmakeMove(move.move)
    return move.move, move.san, move.captured_piece
end

function GetLastMove()
    if #move_history == 0 then
        return nil
    end
    local move = move_history[#move_history]
    DebugPrint("GetLastMove", move)
    DebugPrintTable(move)
    return move.move, move.san, move.captured_piece, move.clock_remaining, move.clock_start
end

function DoMove(move)
    local san, captured_piece = GetMoveSAN(move)
    RecordMove(move, san, captured_piece)
    MakeMove(move)
    local moves = GenerateValidMoves()
    return move, san, captured_piece, moves
end

function RecordMove(move, san, captured_piece)
    DebugPrint("RecordMove")
    DebugPrintTable(clock_remaining_initial)
    local data = {
        move=move,
        san=san,
        captured_piece=captured_piece,
        clock_remaining={
            [0]=clock_remaining_initial[0],
            [8]=clock_remaining_initial[8]
        },
        clock_start={
            [0]=clock_start[0],
            [8]=clock_start[8]
        }
    }
    table.insert(move_history, data)
end

function ClearMoves()
    move_history = {}
end

function PlayEndMoveSound(moveCount)
    if moveCount == 0 then
        -- checkmate
        if g_inCheck then
            EmitGlobalSound("Chess.Checkmate")
        -- stalemate
        else
            EmitGlobalSound("Chess.Stalemate")
        end
    else
        if g_inCheck then
            EmitGlobalSound("Chess.Check")
        else
            EmitGlobalSound("Creep_Radiant.Footstep")
        end
    end
end

function EndTurn()
    DebugPrint("EndTurn")
    if #move_history < 2 then return end
    
    local side = 1 - g_toMove + 7
    local start = clock_start[side]
    local now = GameRules:GetGameTime()
    local elapsed
    
    if clock_timer[side] ~= nil then Timers:RemoveTimer(clock_timer[side]) end
    
    if start ~= nil then
        elapsed = (now - start) * 10
        clock_remaining[side] = math.max(clock_remaining_initial[side] - elapsed, 0)
    end
    
    DebugPrint("side", side)
    DebugPrint("clock_remaining_initial[side]", clock_remaining_initial[side])
    DebugPrint("now", now)
    DebugPrint("start", start)
    DebugPrint("elapsed", elapsed)
    DebugPrint("remaining", clock_remaining[side])
    
    if clock_remaining[side] == 0 then
        OnTimeOut(0, {playerSide=side})
    else
        if #move_history >= 3 then
            clock_remaining[side] = clock_remaining[side] + clock_increment
            DebugPrint("remaining incremented", clock_remaining[side])
        end
    end
end

function StartTurn()
    if #move_history < 2 then return end
    
    clock_start[g_toMove] = GameRules:GetGameTime()
    clock_remaining_initial[g_toMove] = clock_remaining[g_toMove]
    
    DebugPrint("g_toMove", g_toMove)
    DebugPrint("clock_remaining_initial[g_toMove]", clock_remaining_initial[g_toMove])
    DebugPrint("remaining", clock_remaining[g_toMove])
    
    local current_side = g_toMove
    clock_timer[current_side] = Timers:CreateTimer(function()
        local now = GameRules:GetGameTime()
        local elapsed = (now - clock_start[current_side]) * 10

        clock_remaining[current_side] = math.max(clock_remaining_initial[current_side] - elapsed, 0)
        
        --[[DebugPrint("EndTurn Timer")
        DebugPrint("side", current_side)
        DebugPrint("start", clock_start[current_side])
        DebugPrint("remaining", clock_remaining[current_side])]]
        
        CustomNetTables:SetTableValue("time", tostring(current_side), {remaining=clock_remaining[current_side]})
        
        if clock_remaining[current_side] == 0 then
            OnTimeOut(0, {playerSide=current_side})
            return nil
        end
        
        return 0.1
    end)
    
    CustomNetTables:SetTableValue("time", "0", {remaining=clock_remaining[0]})
    CustomNetTables:SetTableValue("time", "8", {remaining=clock_remaining[8]})
end

-- Called on Ply finish
function finishPlyCallback(bestMove, value, ply)
    if (bestMove ~= nil and bestMove ~= 0) then
        DebugPrint(BuildPVMessage(bestMove, value, ply));
    end
end
--

-- Called on Move ready to answer
function finishMoveCallback(move, value, ply)
    if ai_thinking then
        if (move ~= nil and move ~= 0) then
            local _, san, captured_piece, moves = DoMove(move)
            SendBoardUpdate(move, san, captured_piece, moves, false)
            DebugPrint(FormatMove(move), g_moveTime, g_finCnt)
            --g_foundmove = move;
            PlayEndMoveSound(#moves)
            EndTurn()
            StartTurn()
        end
    end
end
--