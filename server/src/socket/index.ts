import { Server as SocketServer } from 'socket.io'
import type { Server as HTTPServer } from 'http'
import { gameConfig } from '../config/game.js'
import { GuandanGame } from '../game/game.js'
import { BasicAI, type AIDifficulty } from '../ai/basic.js'
import { findLegalBeatingPlay, findMinimalLegalLead } from '../ai/legal-move-fallback.js'
import { CoachHintService } from '../coach/coach-hint-service.js'
import { ReasonEngine } from '../coach/reason-engine.js'
import type {
  BuildCoachHintInput,
  CoachHintPayload,
  CoachErrorCode,
  CoachHintMode,
  CoachHintStreamStartPayload,
  CoachHintStreamChunkPayload,
  CoachHintStreamEndPayload,
} from '../coach/types.js'

interface Room {
  game: GuandanGame
  sockets: Map<string, string>
  aiDifficulty: AIDifficulty
  mode: 'local' | 'online'
}

const rooms = new Map<string, Room>()
const aiReasonEngine = new ReasonEngine()

function buildHintInputForAi(room: Room, roomId: string, playerId: string): BuildCoachHintInput | null {
  const state = room.game.getState()
  const myIdx = state.players.findIndex((p) => p.id === playerId)
  if (myIdx < 0) return null
  return {
    roomId,
    handCards: state.players[myIdx].cards,
    lastPlayedPattern: state.lastPlayedPattern,
    playedHistory: state.playedCards.map((step) => ({
      position: step.position,
      cards: step.cards,
      pattern: step.pattern,
    })),
    context: {
      currentLevel: state.currentLevel,
      levelRank: state.levelRank,
      roundNumber: state.roundNumber,
      firstPlayerIndex: state.firstPlayerIndex,
      lastPlayerIndex: state.lastPlayerIndex,
      currentPlayerIndex: state.currentPlayerIndex,
      myPosition: myIdx,
      roundFinishOrder: [...state.roundFinishOrder],
      seats: state.players.map((p, i) => ({
        position: i,
        name: p.name,
        remainingCards: p.cards.length,
        isAI: p.isAI,
      })),
    },
    coachMode: 'expert',
  }
}

export function setupSocket(io: HTTPServer) {
  const socketServer = new SocketServer(io, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  })

  socketServer.on('connection', (socket) => {
    console.log(`客户端连接: ${socket.id}`)

    socket.on('create-room', ({ roomId, playerName, aiDifficulty, mode }, callback) => {
      if (rooms.has(roomId)) {
        callback({ success: false, message: '房间已存在' })
        return
      }

      const game = new GuandanGame(roomId)
      const room: Room = {
        game,
        sockets: new Map(),
        aiDifficulty: aiDifficulty || 'normal',
        mode: mode === 'online' ? 'online' : 'local',
      }

      game.addPlayer(socket.id, playerName, false)
      room.sockets.set(socket.id, playerName)

      socket.join(roomId)
      rooms.set(roomId, room)

      callback({ success: true, roomId, playerId: socket.id })
      console.log(`房间创建: ${roomId}`)
    })

    socket.on('join-room', ({ roomId, playerName }, callback) => {
      const room = rooms.get(roomId)
      if (!room) {
        callback({ success: false, message: '房间不存在' })
        return
      }

      if (room.sockets.size >= 4) {
        callback({ success: false, message: '房间已满' })
        return
      }

      room.game.addPlayer(socket.id, playerName, false)
      room.sockets.set(socket.id, playerName)

      socket.join(roomId)

      const state = room.game.getState()
      socketServer.to(roomId).emit('player-joined', { playerId: socket.id, playerName })

      callback({ success: true, roomId, state, playerId: socket.id })
      console.log(`玩家加入: ${playerName} 加入房间 ${roomId}`)
    })

    socket.on('start-game', ({ roomId }, callback) => {
      const room = rooms.get(roomId)
      if (!room) {
        callback({ success: false, message: '房间不存在' })
        return
      }

      const playerCount = room.game.getState().players.length
      const aiNeeded = 4 - playerCount

      for (let i = 0; i < aiNeeded; i++) {
        const aiId = `ai-${Date.now()}-${i}`
        room.game.addPlayer(aiId, `AI ${i + 1}`, true)
      }

      room.game.startGame()
      const state = room.game.getState()

      socketServer.to(roomId).emit('game-started', state)
      callback({ success: true, state })

      handleAITurn(roomId, socketServer)
      console.log(`游戏开始: ${roomId}`)
    })

    socket.on('play-cards', ({ roomId, cards }, callback) => {
      const room = rooms.get(roomId)
      if (!room) {
        callback({ success: false, message: '房间不存在' })
        return
      }

      const result = room.game.playCards(socket.id, cards)

      if (result.success) {
        const state = room.game.getState()
        socketServer.to(roomId).emit('cards-played', { 
          playerId: socket.id, 
          cards, 
          state 
        })

        if (result.roundFinished) {
          socketServer.to(roomId).emit('round-end', { 
            state, 
            message: result.message 
          })
        }

        handleAITurn(roomId, socketServer)
      }

      callback(result)
    })

    socket.on('pass', ({ roomId }, callback) => {
      const room = rooms.get(roomId)
      if (!room) {
        callback({ success: false, message: '房间不存在' })
        return
      }

      const result = room.game.pass(socket.id)

      if (result.success) {
        const state = room.game.getState()
        socketServer.to(roomId).emit('player-passed', { playerId: socket.id, state })

        handleAITurn(roomId, socketServer)
      }

      callback(result)
    })

    socket.on('submit-tribute', ({ roomId, cardId }, callback) => {
      const room = rooms.get(roomId)
      if (!room) {
        callback?.({ success: false, message: '房间不存在' })
        return
      }

      const result = room.game.submitTributeAction(socket.id, cardId)

      if (result.success) {
        const state = room.game.getState()
        socketServer.to(roomId).emit('tribute-updated', { state })
        handleAITurn(roomId, socketServer)
      }

      callback?.(result)
    })

    socket.on('send-message', ({ roomId, message }, callback) => {
      const room = rooms.get(roomId)
      if (!room) {
        callback?.({ success: false })
        return
      }

      const player = room.game.getPlayer(socket.id)
      socketServer.to(roomId).emit('new-message', {
        playerId: socket.id,
        playerName: player?.name || '未知',
        content: message,
        type: 'text'
      })

      callback?.({ success: true })
    })

    socket.on('send-emoji', ({ roomId, emoji }, callback) => {
      const room = rooms.get(roomId)
      if (!room) {
        callback?.({ success: false })
        return
      }

      const player = room.game.getPlayer(socket.id)
      socketServer.to(roomId).emit('new-message', {
        playerId: socket.id,
        playerName: player?.name || '未知',
        content: emoji,
        type: 'emoji'
      })

      callback?.({ success: true })
    })

    socket.on('request-coach-hint', async (payload: { roomId?: string; requestId?: string; coachMode?: string }, callback) => {
      const { roomId: rawRoomId, requestId, coachMode: rawMode } = payload || {}
      const reqId = typeof requestId === 'string' && requestId ? requestId : `${Date.now()}`
      const coachMode: CoachHintMode = rawMode === 'expert' ? 'expert' : 'beginner'
      const roomId = typeof rawRoomId === 'string' ? rawRoomId : ''
      const room = roomId ? rooms.get(roomId) : undefined

      console.log('[coach] request-coach-hint', {
        socketId: socket.id,
        roomId: roomId || '(empty)',
        coachMode,
        reqId,
        roomFound: !!room,
        knownRooms: rooms.size,
      })

      const respondError = (errorCode: CoachErrorCode, errorMessage: string) => {
        console.warn('[coach] reject →', errorCode, errorMessage)
        const payload: CoachHintPayload = {
          ok: false,
          roomId: roomId || '',
          requestId: reqId,
          errorCode,
          errorMessage,
        }
        socket.emit('coach-hint', payload)
        callback?.({ success: false, errorCode, errorMessage })
      }

      if (!roomId || !room) {
        respondError('COACH_ROOM_NOT_FOUND', '房间不存在')
        return
      }

      if (room.mode !== 'local') {
        respondError('COACH_NOT_AVAILABLE_MODE', '当前模式不支持教练提示')
        return
      }

      const state = room.game.getState()
      const currentPlayer = state.players[state.currentPlayerIndex]
      if (!currentPlayer || currentPlayer.id !== socket.id) {
        respondError('COACH_NOT_YOUR_TURN', '未轮到你出牌')
        return
      }
      if (currentPlayer.isAI) {
        respondError('COACH_REQUEST_PLAYER_IS_AI', 'AI 玩家无需教练提示')
        return
      }

      if (state.status === 'tribute') {
        respondError('COACH_NOT_YOUR_TURN', '进贡阶段不可用教练提示')
        return
      }

      if (!gameConfig.server.coachHintEnabled) {
        respondError('COACH_HINT_DISABLED', '教练提示已关闭')
        return
      }

      const s = gameConfig.server
      console.log('[coach] generating…', {
        reqId,
        coachUseLlm: s.coachUseLlm,
        coachUseStream: s.coachUseStream,
        hasOpenAiKey: s.openAiApiKey.length > 0,
      })

      try {
        const myIdx = state.players.findIndex((p) => p.id === socket.id)
        const service = new CoachHintService(room.game)
        const hintInput = {
          roomId,
          handCards: currentPlayer.cards,
          lastPlayedPattern: state.lastPlayedPattern,
          playedHistory: state.playedCards.map((step) => ({
            position: step.position,
            cards: step.cards,
            pattern: step.pattern,
          })),
          context: {
            currentLevel: state.currentLevel,
            levelRank: state.levelRank,
            roundNumber: state.roundNumber,
            firstPlayerIndex: state.firstPlayerIndex,
            lastPlayerIndex: state.lastPlayerIndex,
            currentPlayerIndex: state.currentPlayerIndex,
            myPosition: myIdx >= 0 ? myIdx : state.currentPlayerIndex,
            roundFinishOrder: [...state.roundFinishOrder],
            seats: state.players.map((p, i) => ({
              position: i,
              name: p.name,
              remainingCards: p.cards.length,
              isAI: p.isAI,
            })),
          },
          coachMode,
        }

        const result = await service.buildCoachHintStream(hintInput, {
          onRecommendation: (recommended) => {
            const startPayload: CoachHintStreamStartPayload = {
              roomId,
              requestId: reqId,
              recommended,
              coachMode,
            }
            socket.emit('coach-hint-start', startPayload)
          },
          onReasonDelta: (text) => {
            if (!text) return
            const chunkPayload: CoachHintStreamChunkPayload = { roomId, requestId: reqId, text }
            socket.emit('coach-hint-chunk', chunkPayload)
          },
        })

        const endPayload: CoachHintStreamEndPayload = {
          ok: true,
          roomId,
          requestId: reqId,
          reason: result.reason,
          confidence: result.confidence,
        }
        socket.emit('coach-hint-end', endPayload)

        console.log('[coach] done', {
          reqId,
          reasonLen: result.reason?.length ?? 0,
          confidence: result.confidence,
        })
        callback?.({ success: true })
      } catch (error) {
        console.error('[coach] exception', error)
        respondError('COACH_INTERNAL_ERROR', '教练提示生成失败')
      }
    })

    socket.on('disconnect', () => {
      console.log(`客户端断开: ${socket.id}`)

      for (const [roomId, room] of rooms) {
        if (room.sockets.has(socket.id)) {
          room.game.removePlayer(socket.id)
          room.sockets.delete(socket.id)

          socketServer.to(roomId).emit('player-left', { playerId: socket.id })

          if (room.sockets.size === 0) {
            rooms.delete(roomId)
            console.log(`房间关闭: ${roomId}`)
          }
          break
        }
      }
    })
  })

  return socketServer
}

async function handleAITurn(roomId: string, io: SocketServer) {
  const room = rooms.get(roomId)
  if (!room) return

  const state = room.game.getState()
  if (state.status === 'game_over' || state.status === 'waiting') return

  if (state.status === 'tribute') {
    const runTribute = () => {
      const st = room.game.getState()
      if (st.status !== 'tribute') {
        handleAITurn(roomId, io)
        return
      }
      const step = room.game.getCurrentTributeStep()
      if (!step) {
        handleAITurn(roomId, io)
        return
      }
      const actor = st.players[step.from]
      if (!actor.isAI) return
      room.game.autoAdvanceTributeStep()
      const newState = room.game.getState()
      io.to(roomId).emit('tribute-updated', { state: newState })
      setTimeout(runTribute, gameConfig.server.tributeStepDelayMs)
    }
    runTribute()
    return
  }

  if (state.status !== 'playing') return

  const currentPlayer = state.players[state.currentPlayerIndex]
  if (!currentPlayer?.isAI) return

  await executeAiPlayTurn(room, roomId, io)
}

/**
 * AI 出牌：BasicAI → 规则穷举 →（可选）与教练同源的大模型校验出牌 → 末档领出最小单张。
 * 仅在 playCards/pass 成功时广播，避免状态与 UI 卡在「出牌中」。
 */
async function executeAiPlayTurn(room: Room, roomId: string, io: SocketServer) {
  const game = room.game
  let st = game.getState()
  const turnIndex = st.currentPlayerIndex
  const current = st.players[turnIndex]
  if (!current?.isAI) return

  const playerId = current.id
  const ctx = game.getJudgeContext()
  const lastPattern = st.lastPlayedPattern
  const lastPlayerIndex = st.lastPlayerIndex

  const scheduleNextPlay = () => {
    setTimeout(() => void handleAITurn(roomId, io), gameConfig.server.aiPlayDelayMs)
  }
  const scheduleNextPass = () => {
    setTimeout(() => void handleAITurn(roomId, io), gameConfig.server.aiPassDelayMs)
  }

  const emitCardsPlayed = (cards: typeof current.cards, result: { roundFinished?: boolean; message?: string }) => {
    const newState = game.getState()
    io.to(roomId).emit('cards-played', {
      playerId,
      cards,
      state: newState,
    })
    if (result.roundFinished) {
      io.to(roomId).emit('round-end', {
        state: newState,
        message: result.message,
      })
    }
    scheduleNextPlay()
  }

  const emitPassed = () => {
    const newState = game.getState()
    io.to(roomId).emit('player-passed', { playerId, state: newState })
    scheduleNextPass()
  }

  const tryPlay = (cards: typeof current.cards) => {
    if (cards.length === 0) return { success: false as const, message: 'empty' }
    return game.playCards(playerId, cards)
  }

  const ai = new BasicAI(game, room.aiDifficulty)
  let chosen = ai.selectCards(current.cards, lastPattern)

  if (chosen.length === 0) {
    const passRes = game.pass(playerId)
    if (passRes.success) {
      emitPassed()
      return
    }
    console.warn('[ai] BasicAI 选择不出但 pass 失败，进入兜底:', passRes.message)
  } else {
    const playRes = tryPlay(chosen)
    if (playRes.success) {
      emitCardsPlayed(chosen, playRes)
      return
    }
    console.warn('[ai] BasicAI 出牌未通过规则校验，进入兜底:', playRes.message)
  }

  const hand = game.getState().players[turnIndex]?.cards ?? current.cards

  if (lastPattern && lastPlayerIndex !== -1) {
    const beat = findLegalBeatingPlay(hand, lastPattern, ctx)
    if (beat) {
      const r = tryPlay(beat)
      if (r.success) {
        emitCardsPlayed(beat, r)
        return
      }
    }
    const passRes = game.pass(playerId)
    if (passRes.success) {
      emitPassed()
      return
    }
    console.warn('[ai] 跟牌穷举后仍无法 pass:', passRes.message)
  } else {
    const lead = findMinimalLegalLead(hand, ctx)
    if (lead) {
      const r = tryPlay(lead)
      if (r.success) {
        emitCardsPlayed(lead, r)
        return
      }
    }
  }

  const hint = buildHintInputForAi(room, roomId, playerId)
  if (hint) {
    st = game.getState()
    if (st.currentPlayerIndex !== turnIndex || st.players[turnIndex]?.id !== playerId) {
      console.warn('[ai] 回合已切换，跳过 LLM 兜底')
      return
    }

    const llm = await aiReasonEngine.fetchLlmValidatedPlay(hint, ctx)
    st = game.getState()
    if (st.currentPlayerIndex !== turnIndex || st.players[turnIndex]?.id !== playerId) {
      console.warn('[ai] LLM 返回后回合已切换')
      return
    }

    const handAfter = st.players[turnIndex].cards

    if (llm?.action === 'pass' && lastPlayerIndex !== -1) {
      const pr = game.pass(playerId)
      if (pr.success) {
        emitPassed()
        return
      }
    }
    if (llm?.action === 'play' && llm.cards.length > 0) {
      const r = tryPlay(llm.cards)
      if (r.success) {
        emitCardsPlayed(llm.cards, r)
        return
      }
    }
  }

  st = game.getState()
  if (st.currentPlayerIndex === turnIndex && st.players[turnIndex]?.id === playerId) {
    if (!lastPattern || lastPlayerIndex === -1) {
      const sorted = [...st.players[turnIndex].cards].sort((a, b) => a.value - b.value)
      const c0 = sorted[0]
      if (c0) {
        const r = tryPlay([c0])
        if (r.success) {
          emitCardsPlayed([c0], r)
          return
        }
      }
    }
  }

  console.error('[ai] 全部兜底失败，尝试强制 pass（跟牌场景）')
  if (lastPlayerIndex !== -1) {
    const pr = game.pass(playerId)
    if (pr.success) {
      emitPassed()
    }
  }
}
