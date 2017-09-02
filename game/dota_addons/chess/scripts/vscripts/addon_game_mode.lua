require("libraries/util")
require("libraries/timers")
--require("libraries/bit32")
require("garbochess")

-- Generated from template

if GameMode == nil then
    GameMode = class({})
end

local host_player_id = 0
local INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
local g_allMoves = {}
local DEBUG = true
local moves = nil
local time_control = true
 -- clock_time and clock_increment are tenths of a second
local clock_time = 600
local clock_increment = 20
local paused = false
local vs_ai = false
local has_timed_out = false
local ai_side = 0
-- 0 = black
-- 8 = white
local max_ply_table = {1, 3, 88888}
local ai_ply_difficulty = 1
--local ai_max_think_time = 5

function GameMode:OnNPCSpawned(event)
    print("OnNPCSpawned", event)
    local npc = EntIndexToHScript(event.entindex)
    if npc:IsRealHero() then
        npc:RemoveSelf()
    end
end

function GameMode:OnGameRulesStateChange()
    local nNewState = GameRules:State_Get()
        print("OnGameRulesStateChange", nNewState)
    if nNewState == DOTA_GAMERULES_STATE_INIT then
        print("DOTA_GAMERULES_STATE_INIT")
    elseif nNewState == DOTA_GAMERULES_STATE_WAIT_FOR_PLAYERS_TO_LOAD then
        print("DOTA_GAMERULES_STATE_WAIT_FOR_PLAYERS_TO_LOAD")
    elseif nNewState == DOTA_GAMERULES_STATE_CUSTOM_GAME_SETUP then
        print("DOTA_GAMERULES_STATE_CUSTOM_GAME_SETUP")
        
        -- find host player id
        for i = 0, DOTA_MAX_TEAM_PLAYERS do
            if PlayerResource:IsValidPlayerID(i) then
                local player = PlayerResource:GetPlayer(i)
                if GameRules:PlayerHasCustomGameHostPrivileges(player) then
                    host_player_id = i
                    print ("host found", host_player_id)
                    CustomNetTables:SetTableValue("game_setup", "host", {player_id=host_player_id})
                    break
                end
            end
        end
        
    elseif nNewState == DOTA_GAMERULES_STATE_HERO_SELECTION then
        print("DOTA_GAMERULES_STATE_HERO_SELECTION")
        CustomGameEventManager:Send_ServerToPlayer(PlayerResource:GetPlayer(host_player_id), "game_setup_end", {})
    elseif nNewState == DOTA_GAMERULES_STATE_PRE_GAME then
        print("DOTA_GAMERULES_STATE_PRE_GAME")
    if DEBUG == false and PlayerResource:GetPlayerCount() == 1 then
        vs_ai = true
        if PlayerResource:GetTeam(0) == DOTA_TEAM_GOODGUYS then
            ai_side = 0
        else
            ai_side = 8
        end
    end
    print("vs_ai " .. tostring(vs_ai))
    print("ai_side " .. ai_side)
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
    print( "Template addon is loaded.", DOTA_MAX_TEAM_PLAYERS)
    --GameRules:GetGameModeEntity():SetThink( "OnThink", self, "GlobalThink", 2 )
    GameRules:GetGameModeEntity():SetAnnouncerDisabled(true)
    ListenToGameEvent("npc_spawned", Dynamic_Wrap(GameMode, "OnNPCSpawned"), self)
    ListenToGameEvent("game_rules_state_change", Dynamic_Wrap(GameMode, "OnGameRulesStateChange"), self)
    
    GameRules:SetCustomGameTeamMaxPlayers( DOTA_TEAM_GOODGUYS, 1 )
    GameRules:SetCustomGameTeamMaxPlayers( DOTA_TEAM_BADGUYS, 1 )

    CustomGameEventManager:RegisterListener( "game_setup_options", OnGameSetupOptions )
    CustomGameEventManager:RegisterListener( "send_chat_message", OnSendChatMessage )
    CustomGameEventManager:RegisterListener( "get_moves", OnGetMoves )
    CustomGameEventManager:RegisterListener( "drop_piece", OnDropPiece )
    CustomGameEventManager:RegisterListener( "submit_fen", OnSubmitFen )
    CustomGameEventManager:RegisterListener( "new_game", OnNewGame )
    CustomGameEventManager:RegisterListener( "change_pause_state", OnChangePauseState )
    CustomGameEventManager:RegisterListener( "claim_draw", OnClaimDraw )
    CustomGameEventManager:RegisterListener( "decline_draw", OnDeclineDraw )
    CustomGameEventManager:RegisterListener( "resign", OnResign )
    CustomGameEventManager:RegisterListener( "time_out", OnTimeOut )
    CustomGameEventManager:RegisterListener( "request_undo", OnRequestUndo )
    CustomGameEventManager:RegisterListener( "decline_undo", OnDeclineUndo )
    CustomGameEventManager:RegisterListener( "accept_undo", OnAcceptUndo )
end

function OnGameSetupOptions(eventSourceIndex, args)
    print("OnGameSetupOptions", eventSourceIndex)
    PrintTable(args)
    time_control = args.timeControl
    clock_time = args.timeTotal * 600
    clock_increment = args.timeIncrement * 10
    if clock_time == 0 then
        clock_time = clock_increment
    end
    ai_ply_difficulty = max_ply_table[tonumber(args.aiDifficulty)]
    print("time_control", time_control)
    print("clock_time", clock_time)
    print("clock_increment", clock_increment)
    print("ai_ply_difficulty", ai_ply_difficulty)
    
    CustomNetTables:SetTableValue("game_setup", "options", args)
end

function OnSendChatMessage(eventSourceIndex, args)
    print("OnSendChatMessage", eventSourceIndex)
    PrintTable(args)
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
    CustomGameEventManager:Send_ServerToAllClients("receive_chat_event", {message="Game started.", playerId=-1})
end

function OnSubmitFen(eventSourceIndex, args)
    InitializeEval()
    ResetGame()
    InitializeFromFen(args.fen)
    moves = GenerateValidMoves()
    has_timed_out = false
    CustomGameEventManager:Send_ServerToAllClients("board_reset", {board=g_board, toMove=g_toMove, moves=moves, clock_time=clock_time, clock_increment=clock_increment, time_control=time_control})
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

function getSideString(side, upper)
    if side == 0 then
        if upper then
            return "Black"
        else
            return "black"
        end
    else
        if upper then
            return "White"
        else
            return "white"
        end
    end
end

function OnDropPiece(eventSourceIndex, args)
    print("OnDropPiece", eventSourceIndex)
    PrintTable(args)

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
            print("found move in valid moves", move)
        end
    end

    if (not (args.startX == args.endX and args.startY == args.endY) and move ~= nil) then
        print("making move " .. g_move50)
        table.insert(g_allMoves, move)
        local san = GetMoveSAN(move)
        MakeMove(move)
        moves = GenerateValidMoves()
        SendBoardUpdate(san, move, moves, false)
        
        if args.offerDraw ~= 0 then
            CustomGameEventManager:Send_ServerToAllClients("draw_offer", {
                playerId = args.playerId,
                playerSide = args.playerSide
            })
            local message = getSideString(args.playerSide, true) .. " offers draw."
            CustomGameEventManager:Send_ServerToAllClients("receive_chat_event", {message=message, playerId=-1})
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
    if vs_ai and g_toMove == ai_side and not paused then
        Timers:CreateTimer(1, function ()
            print("AIMove first timer", ai_ply_difficulty)
            local co = coroutine.create(Search)
            local _, co_result = coroutine.resume(co, finishMoveCallback, ai_ply_difficulty, finishPlyCallback)
            if not co_result then
                Timers:CreateTimer(0.01, function ()
                    --print("AIMove resume timer", Time())
                    local _, co_result = coroutine.resume(co)
                    if not co_result then
                        return 0.01
                    else
                        --print ("AIMove done")
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
    print ("UndoMove", moveToUndo)
    UnmakeMove(moveToUndo)
    return moveToUndo
end

function SendBoardUpdate(san, move, moves, undo)
    print("SendBoardUpdate", move, moves)
    local data = {
        board=g_board,
        toMove=g_toMove,
        san=san,
        moves=moves,
        last_move=move,
        check=g_inCheck,
        paused=paused,
        move50=g_move50,
        repDraw=IsRepDraw(),
        undo=undo
    }
    CustomGameEventManager:Send_ServerToAllClients("board_update", data)
end

function OnClaimDraw(eventSourceIndex, args)
    print ("OnClaimDraw", eventSourceIndex)
    PrintTable(args)
    CustomGameEventManager:Send_ServerToAllClients("draw_claimed", {
        playerId = args.playerId,
        playerSide = args.playerSide
    })
    local message = getSideString(args.playerSide, true) .. " accepts draw."
    CustomGameEventManager:Send_ServerToAllClients("receive_chat_event", {message=message, playerId=-1})
    EmitGlobalSound("Chess.Draw")
end

function OnDeclineDraw(eventSourceIndex, args)
    print ("OnDeclineDraw", eventSourceIndex)
    PrintTable(args)
    local message = getSideString(args.playerSide, true) .. " declines draw."
    CustomGameEventManager:Send_ServerToAllClients("receive_chat_event", {message=message, playerId=-1})
end

function OnResign(eventSourceIndex, args)
    print ("OnResign", eventSourceIndex)
    PrintTable(args)
    CustomGameEventManager:Send_ServerToAllClients("resigned", {
        playerId = args.playerId,
        playerSide = args.playerSide
    })
    local message = getSideString(args.playerSide, true) .. " resigns."
    CustomGameEventManager:Send_ServerToAllClients("receive_chat_event", {message=message, playerId=-1})
end

function OnTimeOut(eventSourceIndex, args)
    print ("OnTimeOut", eventSourceIndex)
    PrintTable(args)
    if not has_timed_out then
        CustomGameEventManager:Send_ServerToAllClients("timeout_end", {
            playerId = args.playerId,
            playerSide = args.playerSide
        })
        has_timed_out = true
    end
end

function OnRequestUndo(eventSourceIndex, args)
    print ("OnRequestUndo", eventSourceIndex)
    PrintTable(args)
    CustomGameEventManager:Send_ServerToAllClients("undo_offer", {
        playerId = args.playerId,
        playerSide = args.playerSide
    })
    local message = getSideString(args.playerSide, true) .. " requests takeback."
    CustomGameEventManager:Send_ServerToAllClients("receive_chat_event", {message=message, playerId=-1})
end

function OnDeclineUndo(eventSourceIndex, args)
    print ("OnDeclineUndo", eventSourceIndex)
    PrintTable(args)
    local message = getSideString(args.playerSide, true) .. " declines takeback."
    CustomGameEventManager:Send_ServerToAllClients("receive_chat_event", {message=message, playerId=-1})
end

function OnAcceptUndo(eventSourceIndex, args)
    print ("OnAcceptUndo", eventSourceIndex, #g_allMoves)
    PrintTable(args)
    if #g_allMoves <= 1 then return end
    UndoMove()
    local move = UndoMove()
    print ("move", move)
    table.insert(g_allMoves, move)
    local san = GetMoveSAN(move)
    MakeMove(move);
    moves = GenerateValidMoves()
    SendBoardUpdate(san, move, moves, true)
    local message = getSideString(args.playerSide, true) .. " accepts takeback."
    CustomGameEventManager:Send_ServerToAllClients("receive_chat_event", {message=message, playerId=-1})
end

-- Called on Ply finish
function finishPlyCallback(bestMove, value, ply)
    if (bestMove ~= nil and bestMove ~= 0) then
        print(BuildPVMessage(bestMove, value, ply));
    end
end
--

-- Called on Move ready to answer
function finishMoveCallback(bestMove, value, ply)
    if (bestMove ~= nil and bestMove ~= 0) then
        table.insert(g_allMoves, bestMove)
        local san = GetMoveSAN(bestMove)
        MakeMove(bestMove);
        print(FormatMove(bestMove), g_moveTime, g_finCnt);
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
        SendBoardUpdate(san, bestMove, moves, false)
    --[[elseif (bestMove ~= nil and bestMove == 0) then
        if g_inCheck then
            CustomGameEventManager:Send_ServerToAllClients("board_checkmate", {board=g_board, toMove=g_toMove})
        else
            CustomGameEventManager:Send_ServerToAllClients("board_stalemate", {board=g_board, toMove=g_toMove})
        end]]

        --[[PlayerResource:SetCustomTeamAssignment(0, DOTA_TEAM_BADGUYS)
        print("player 0 team " .. PlayerResource:GetTeam(0))

        PlayerResource:SetCustomTeamAssignment(0, DOTA_TEAM_GOODGUYS)
        print("player 0 team " .. PlayerResource:GetTeam(0))
        print("player count " .. PlayerResource:GetPlayerCount())]]
    end
end
--