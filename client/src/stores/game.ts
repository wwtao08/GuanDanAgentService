import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  GameState,
  Card,
  ChatMessage,
  CoachHintState,
  CoachHintPayload,
  CoachHintStreamStartPayload,
  CoachHintStreamChunkPayload,
  CoachHintStreamEndPayload,
  CoachHintMode,
} from '@/types'

export const useGameStore = defineStore('game', () => {
  const gameState = ref<GameState>({
    roomId: '',
    status: 'waiting',
    players: [],
    currentPlayerIndex: 0,
    playedCards: [],
    currentLevel: 2,
    levelRank: '2',
    lastRoundRanking: null,
    lastPlayedPattern: null,
    lastPlayerIndex: -1,
    firstPlayerIndex: 0,
    roundNumber: 1,
    roundFinishOrder: [],
    tributeQueue: null,
    tributeStepIndex: 0,
  })

  const messages = ref<ChatMessage[]>([])
  const selectedCards = ref<Card[]>([])
  const roomId = ref('')
  const playerName = ref('')
  const playerId = ref('')
  const mode = ref<'local' | 'online'>('local')
  const coachHintState = ref<CoachHintState>({
    loading: false,
    reasonStreaming: false,
    coachMode: null,
    requestId: null,
    recommended: null,
    reason: null,
    confidence: null,
    errorCode: null,
    errorMessage: null,
  })

  const myPlayer = computed(() => {
    return gameState.value.players.find(p => p.id === playerId.value)
  })

  const isMyTurn = computed(() => {
    const myIndex = gameState.value.players.findIndex(p => p.id === playerId.value)
    return myIndex === gameState.value.currentPlayerIndex
  })

  const currentTributeStep = computed(() => {
    const s = gameState.value
    if (s.status !== 'tribute' || !s.tributeQueue?.length) return null
    return s.tributeQueue[s.tributeStepIndex] ?? null
  })

  const isMyTributeTurn = computed(() => {
    const step = currentTributeStep.value
    if (!step) return false
    const myIdx = gameState.value.players.findIndex((p) => p.id === playerId.value)
    return myIdx === step.from
  })

  function setGameState(state: GameState) {
    gameState.value = state
  }

  function setRoomInfo(id: string, name: string, id2: string, m: 'local' | 'online' = 'local') {
    roomId.value = id
    playerName.value = name
    playerId.value = id2
    mode.value = m
  }

  function addMessage(msg: ChatMessage) {
    messages.value.push(msg)
  }

  function selectCard(card: Card) {
    const index = selectedCards.value.findIndex(c => c.id === card.id)
    if (index > -1) {
      selectedCards.value.splice(index, 1)
    } else {
      selectedCards.value.push(card)
    }
  }

  /** 刷选 / 长按拖拽：仅加入选中，不重复添加 */
  function addCardToSelection(card: Card) {
    if (selectedCards.value.some((c) => c.id === card.id)) return
    selectedCards.value.push(card)
  }

  function clearSelection() {
    selectedCards.value = []
  }

  /** 接受教练建议选牌等：整手替换当前选中 */
  function replaceSelection(cards: Card[]) {
    selectedCards.value = cards.length ? [...cards] : []
  }

  function setCoachHintLoading(requestId: string, coachMode: CoachHintMode) {
    coachHintState.value = {
      loading: true,
      reasonStreaming: false,
      coachMode,
      requestId,
      recommended: null,
      reason: null,
      confidence: null,
      errorCode: null,
      errorMessage: null,
    }
  }

  /** 仅处理失败（成功走流式 start/chunk/end） */
  function applyCoachHint(payload: CoachHintPayload) {
    if (coachHintState.value.requestId && payload.requestId !== coachHintState.value.requestId) {
      return
    }
    if (payload.ok) return
    coachHintState.value = {
      loading: false,
      reasonStreaming: false,
      coachMode: coachHintState.value.coachMode,
      requestId: payload.requestId,
      recommended: null,
      reason: null,
      confidence: null,
      errorCode: payload.errorCode || 'COACH_ERROR',
      errorMessage: payload.errorMessage || '教练提示失败',
    }
  }

  function applyCoachHintStart(payload: CoachHintStreamStartPayload) {
    if (coachHintState.value.requestId && payload.requestId !== coachHintState.value.requestId) {
      return
    }
    coachHintState.value = {
      ...coachHintState.value,
      loading: true,
      reasonStreaming: true,
      coachMode: payload.coachMode,
      recommended: payload.recommended,
      reason: '',
      confidence: null,
      errorCode: null,
      errorMessage: null,
    }
  }

  function appendCoachHintChunk(payload: CoachHintStreamChunkPayload) {
    if (coachHintState.value.requestId && payload.requestId !== coachHintState.value.requestId) {
      return
    }
    coachHintState.value = {
      ...coachHintState.value,
      reason: (coachHintState.value.reason || '') + payload.text,
    }
  }

  function applyCoachHintEnd(payload: CoachHintStreamEndPayload) {
    if (coachHintState.value.requestId && payload.requestId !== coachHintState.value.requestId) {
      return
    }
    coachHintState.value = {
      ...coachHintState.value,
      loading: false,
      reasonStreaming: false,
      reason: payload.reason,
      confidence: payload.confidence ?? null,
    }
  }

  function resetCoachHint() {
    coachHintState.value = {
      loading: false,
      reasonStreaming: false,
      coachMode: null,
      requestId: null,
      recommended: null,
      reason: null,
      confidence: null,
      errorCode: null,
      errorMessage: null,
    }
  }

  return {
    gameState,
    messages,
    selectedCards,
    roomId,
    playerName,
    playerId,
    mode,
    myPlayer,
    isMyTurn,
    currentTributeStep,
    isMyTributeTurn,
    coachHintState,
    setGameState,
    setRoomInfo,
    addMessage,
    selectCard,
    addCardToSelection,
    clearSelection,
    replaceSelection,
    setCoachHintLoading,
    applyCoachHint,
    applyCoachHintStart,
    appendCoachHintChunk,
    applyCoachHintEnd,
    resetCoachHint,
  }
})
