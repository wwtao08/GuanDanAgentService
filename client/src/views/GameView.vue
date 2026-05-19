<template>
  <div class="game-container">
    <div class="game-header">
      <div class="room-info">
        <span>房间: {{ displayRoomId }}</span>
        <span>等级: {{ currentLevel }}</span>
        <span>级牌: {{ levelRankLabel }}</span>
        <span>回合: {{ roundNumber }}</span>
        <span v-if="store.gameState.status === 'tribute'" class="phase-tag">进贡/还牌</span>
      </div>
      <button class="back-btn" @click="goHome">返回</button>
    </div>

    <div class="game-area">
      <GameBoard
        :game-state="store.gameState"
        :selected-cards="store.selectedCards"
        :my-player-id="store.playerId"
        @select-card="handleSelectCard"
        @add-to-selection="handleAddToSelection"
        @play-cards="handlePlayCards"
        @pass="handlePass"
      >
        <template v-if="showCoachHint" #bottom-actions>
          <div class="coach-switch-row" role="tablist" aria-label="手牌与教练切换">
            <button
              type="button"
              class="coach-switch-btn"
              :class="{ active: coachShell === 'hand' }"
              role="tab"
              :aria-selected="coachShell === 'hand'"
              @click="coachShell = 'hand'"
            >
              手牌
            </button>
            <button
              type="button"
              class="coach-switch-btn"
              :class="{ active: coachShell === 'coach' }"
              role="tab"
              :aria-selected="coachShell === 'coach'"
              @click="coachShell = 'coach'"
            >
              教练提示
            </button>
          </div>
        </template>
      </GameBoard>
    </div>

    <Teleport to="body">
      <Transition name="coach-float">
        <div
          v-if="showCoachHint && coachShell === 'coach'"
          class="coach-float-layer"
          aria-modal="true"
          role="dialog"
          aria-labelledby="coach-float-title"
        >
          <div class="coach-float-backdrop" @click="coachShell = 'hand'" />
          <div class="coach-float-sheet">
            <div class="coach-float-header">
              <h2 id="coach-float-title" class="coach-float-title">教练提示</h2>
              <div class="coach-float-header-actions">
                <button
                  type="button"
                  class="coach-float-accept"
                  :disabled="!canAcceptCoachSuggestion"
                  @click="acceptCoachSuggestion"
                >
                  接受建议
                </button>
                <button type="button" class="coach-float-back" @click="coachShell = 'hand'">返回手牌</button>
              </div>
            </div>
            <CoachHintPanel
              floating
              :visible="true"
              :loading="store.coachHintState.loading"
              :reason-streaming="store.coachHintState.reasonStreaming"
              :recommended="store.coachHintState.recommended"
              :reason="store.coachHintState.reason"
              :confidence="store.coachHintState.confidence"
              :error-message="store.coachHintState.errorMessage"
              @request="handleCoachHint"
            />
          </div>
        </div>
      </Transition>
    </Teleport>

    <div v-if="store.gameState.status === 'tribute'" class="tribute-hint">
      <p v-if="store.currentTributeStep">
        {{ tributePhaseDescription }}
      </p>
      <button
        class="control-btn tribute"
        :disabled="store.selectedCards.length !== 1 || !store.isMyTributeTurn"
        @click="handleSubmitTribute"
      >
        {{ tributeButtonLabel }}
      </button>
    </div>

    <div v-else class="game-controls">
      <button class="control-btn play" :disabled="store.selectedCards.length === 0 || !canPlay" @click="handlePlayCards">
        出牌
      </button>
      <button class="control-btn pass" :disabled="!canPass" @click="handlePass">
        不出
      </button>
    </div>

    <ChatWindow
      :messages="store.messages"
      :my-player-id="store.playerId"
      @send-message="handleSendMessage"
      @send-emoji="handleSendEmoji"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import GameBoard from '@/components/Game/GameBoard.vue'
import ChatWindow from '@/components/Chat/ChatWindow.vue'
import CoachHintPanel from '@/components/Game/CoachHintPanel.vue'
import type { Card, CoachHintMode } from '@/types'
import { matchHandToCoachLabels } from '@/utils/coach-card-match'
import { useSocket } from '@/composables/useSocket'
import { useGameStore } from '@/stores/game'

const route = useRoute()
const router = useRouter()
const store = useGameStore()
const socketApi = useSocket()

const localRoomId = `LOCAL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
const routeRoomId = ref((route.query.room as string) || localRoomId)
const mode = ref((route.query.mode as string) || 'local')
const difficulty = ref((route.query.difficulty as string) || 'normal')
const playerName = ref((route.query.name as string) || '玩家')

const currentLevel = computed(() => store.gameState.currentLevel)
const levelRankLabel = computed(() => {
  const r = store.gameState.levelRank
  const suit = '♥'
  return r ? `${suit}${r}` : '—'
})
const roundNumber = computed(() => store.gameState.roundNumber)
const displayRoomId = computed(() => store.roomId || routeRoomId.value)

const canPlay = computed(() => store.gameState.status === 'playing' && store.isMyTurn)
const canPass = computed(() => store.gameState.status === 'playing' && store.gameState.lastPlayerIndex !== -1 && store.isMyTurn)

const tributePhaseDescription = computed(() => {
  const step = store.currentTributeStep
  if (!step) return ''
  const from = store.gameState.players[step.from]?.name ?? `座位${step.from}`
  const to = store.gameState.players[step.to]?.name ?? `座位${step.to}`
  return step.type === 'tribute'
    ? `${from} 向 ${to} 进贡（须选手中最大牌，红心级牌不可进贡）`
    : `${from} 向 ${to} 还牌（有 10 及以下时须选其中一张；否则还最小的一张）`
})

const tributeButtonLabel = computed(() => {
  const step = store.currentTributeStep
  if (!step) return '确认'
  return step.type === 'tribute' ? '确认进贡' : '确认还牌'
})

const showCoachHint = computed(() => {
  return (
    mode.value === 'local' &&
    store.gameState.status === 'playing' &&
    store.isMyTurn &&
    !!store.myPlayer &&
    !store.myPlayer.isAI
  )
})

/** 手牌界面 vs 教练悬浮层；不占用主布局高度 */
const coachShell = ref<'hand' | 'coach'>('hand')

/** 已有推荐结果时可接受（含「不出」：仅返回手牌并清空选中） */
const canAcceptCoachSuggestion = computed(() => {
  return !!store.coachHintState.recommended && !store.coachHintState.errorMessage
})

function acceptCoachSuggestion() {
  coachShell.value = 'hand'
  const rec = store.coachHintState.recommended
  if (!rec) {
    store.clearSelection()
    return
  }
  if (rec.action === 'pass') {
    store.clearSelection()
    return
  }
  const hand = store.myPlayer?.cards ?? []
  const matched = matchHandToCoachLabels(rec.cards, hand)
  if (!matched) {
    store.clearSelection()
    return
  }
  store.replaceSelection(matched)
}

watch(showCoachHint, (ok) => {
  if (!ok) coachShell.value = 'hand'
})

watch(
  () => [showCoachHint.value, coachShell.value] as const,
  () => {
    const lock = showCoachHint.value && coachShell.value === 'coach'
    document.body.style.overflow = lock ? 'hidden' : ''
  },
  { flush: 'post' },
)

function onCoachEscape(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (showCoachHint.value && coachShell.value === 'coach') {
    coachShell.value = 'hand'
  }
}

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onCoachEscape)
})

const goHome = () => {
  socketApi.disconnect()
  router.push('/')
}

const handleSelectCard = (card: Card) => {
  store.selectCard(card)
}

const handleAddToSelection = (card: Card) => {
  store.addCardToSelection(card)
}

const handlePlayCards = async () => {
  const room = store.roomId || routeRoomId.value
  if (!room) return
  const result = await socketApi.playCards(room, store.selectedCards)
  if (result?.success) {
    store.resetCoachHint()
  }
}

const handlePass = async () => {
  const room = store.roomId || routeRoomId.value
  if (!room) return
  const result = await socketApi.pass(room)
  if (result?.success) {
    store.resetCoachHint()
  }
}

const handleSubmitTribute = async () => {
  const room = store.roomId || routeRoomId.value
  const card = store.selectedCards[0]
  if (!room || !card) return
  await socketApi.submitTribute(room, card.id)
}

const handleCoachHint = (mode: CoachHintMode) => {
  const room = store.roomId || routeRoomId.value
  if (!room) return
  socketApi.requestCoachHint(room, mode)
}

const handleSendMessage = (content: string) => {
  const room = store.roomId || routeRoomId.value
  if (!room) return
  socketApi.sendMessage(room, content)
}

const handleSendEmoji = (emoji: string) => {
  const room = store.roomId || routeRoomId.value
  if (!room) return
  socketApi.sendEmoji(room, emoji)
}

onMounted(async () => {
  window.addEventListener('keydown', onCoachEscape)
  socketApi.connect()
  if (mode.value === 'local') {
    const created = await socketApi.createRoom(routeRoomId.value, playerName.value, difficulty.value, 'local')
    if (created?.success) {
      await socketApi.startGame(routeRoomId.value)
    }
    return
  }

  const action = route.query.action as string | undefined
  if (action === 'create') {
    const created = await socketApi.createRoom(routeRoomId.value, playerName.value, difficulty.value, 'online')
    if (created?.success) {
      await socketApi.startGame(routeRoomId.value)
    }
  } else {
    await socketApi.joinRoom(routeRoomId.value, playerName.value)
  }
})
</script>

<style scoped>
.game-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 1200px;
  margin: 0 auto;
  padding: 10px;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background: var(--card-bg);
  border-radius: 12px;
  margin-bottom: 10px;
}

.room-info {
  display: flex;
  gap: 20px;
  color: #aaa;
}

.back-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  cursor: pointer;
}

.game-area {
  flex: 1;
  display: flex;
  min-height: 0;
}

.phase-tag {
  color: var(--warning-color, #faad14);
}

.tribute-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 15px;
  text-align: center;
  color: #ccc;
  font-size: 14px;
}

.tribute-hint p {
  margin: 0;
  max-width: 520px;
  line-height: 1.5;
}

.game-controls {
  display: flex;
  justify-content: center;
  gap: 20px;
  padding: 15px;
}

.control-btn {
  padding: 12px 40px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.control-btn.play {
  background: var(--success-color);
  color: #fff;
}

.control-btn.play:disabled {
  background: rgba(82, 196, 26, 0.3);
  cursor: not-allowed;
}

.control-btn.pass {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.control-btn.pass:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.control-btn.tribute {
  background: #d48806;
  color: #fff;
}

.control-btn.tribute:disabled {
  background: rgba(212, 136, 6, 0.35);
  cursor: not-allowed;
}

/* 手牌 / 教练切换：在手牌区域右侧，上下两个按钮（见 GameBoard bottom-actions） */
.coach-switch-row {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-end;
  flex-shrink: 0;
  gap: 0;
  min-width: 88px;
}

.coach-switch-btn {
  padding: 8px 14px;
  font-size: 14px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(0, 0, 0, 0.28);
  color: rgba(255, 255, 255, 0.72);
  cursor: pointer;
  text-align: center;
}

.coach-switch-btn:first-of-type {
  border-radius: 8px 8px 0 0;
  border-bottom: none;
}

.coach-switch-btn:last-of-type {
  border-radius: 0 0 8px 8px;
}

.coach-switch-btn.active {
  background: rgba(74, 144, 217, 0.5);
  color: #fff;
  border-color: rgba(74, 144, 217, 0.55);
}

.coach-switch-btn:focus-visible {
  outline: 2px solid rgba(74, 144, 217, 0.8);
  outline-offset: 2px;
}

/* 教练：Teleport 底栏悬浮层，不挤压主布局 */
.coach-float-layer {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
}

.coach-float-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
}

.coach-float-sheet {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 920px;
  max-height: min(78vh, 640px);
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: linear-gradient(180deg, #1e2740 0%, #16213e 100%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.5);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.coach-float-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding: 12px 16px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.coach-float-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.coach-float-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.coach-float-accept {
  padding: 6px 14px;
  font-size: 13px;
  border: none;
  border-radius: 8px;
  background: rgba(82, 196, 26, 0.88);
  color: #fff;
  cursor: pointer;
}

.coach-float-accept:hover:not(:disabled) {
  background: rgba(98, 212, 42, 1);
}

.coach-float-accept:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.coach-float-back {
  padding: 6px 14px;
  font-size: 13px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  cursor: pointer;
}

.coach-float-back:hover {
  background: rgba(255, 255, 255, 0.22);
}

.coach-float-enter-active,
.coach-float-leave-active {
  transition: opacity 0.2s ease;
}

.coach-float-enter-from,
.coach-float-leave-to {
  opacity: 0;
}

.coach-float-enter-active .coach-float-sheet,
.coach-float-leave-active .coach-float-sheet {
  transition: transform 0.22s ease;
}

.coach-float-enter-from .coach-float-sheet,
.coach-float-leave-to .coach-float-sheet {
  transform: translateY(12px);
}
</style>
