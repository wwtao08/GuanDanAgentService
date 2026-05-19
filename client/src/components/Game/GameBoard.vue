<template>
  <div class="game-board">
    <div class="top-player">
      <PlayerInfo 
        :player="players.top" 
        :is-current="currentPlayerIndex === topIndex"
        position="top" 
      />
    </div>

    <div class="middle-row">
      <div class="left-player">
        <PlayerInfo 
          :player="players.left" 
          :is-current="currentPlayerIndex === leftIndex"
          position="left" 
        />
      </div>

      <div class="center-area">
        <PlayedCards :played-cards="playedCards" :my-player-index="myPlayerIndex" />
      </div>

      <div class="right-player">
        <PlayerInfo 
          :player="players.right" 
          :is-current="currentPlayerIndex === rightIndex"
          position="right" 
        />
      </div>
    </div>

    <div class="bottom-player">
      <div class="my-cards">
        <HandCards 
          :cards="myCards"
          :selected-cards="selectedCards"
          :selectable="true"
          @select="handleSelectCard"
          @add-to-selection="handleAddToSelection"
        />
      </div>
      <div v-if="$slots['bottom-actions']" class="bottom-actions">
        <slot name="bottom-actions" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import PlayerInfo from '@/components/Game/PlayerInfo.vue'
import HandCards from '@/components/Game/HandCards.vue'
import PlayedCards from '@/components/Game/PlayedCards.vue'
import type { GameState, Card, Player } from '@/types'

const props = defineProps<{
  gameState: GameState
  selectedCards: Card[]
  myPlayerId: string
}>()

const emit = defineEmits<{
  (e: 'select-card', card: Card): void
  (e: 'add-to-selection', card: Card): void
  (e: 'play-cards'): void
  (e: 'pass'): void
}>()

const myPlayerIndex = computed(() => {
  const idx = props.gameState.players.findIndex((p) => p.id === props.myPlayerId)
  return idx >= 0 ? idx : 0
})

const players = computed(() => {
  const list = props.gameState.players
  const myIdx = myPlayerIndex.value
  const getAtOffset = (offset: number) => list[(myIdx + offset) % 4]
  return {
    bottom: getAtOffset(0) || createEmptyPlayer(),
    right: getAtOffset(1) || createEmptyPlayer(),
    top: getAtOffset(2) || createEmptyPlayer(),
    left: getAtOffset(3) || createEmptyPlayer()
  }
})

const myCards = computed(() => {
  return props.gameState.players.find((p) => p.id === props.myPlayerId)?.cards || []
})
const currentPlayerIndex = computed(() => props.gameState.currentPlayerIndex)
const topIndex = computed(() => (myPlayerIndex.value + 2) % 4)
const rightIndex = computed(() => (myPlayerIndex.value + 1) % 4)
const leftIndex = computed(() => (myPlayerIndex.value + 3) % 4)
const playedCards = computed(() => props.gameState.playedCards)

const createEmptyPlayer = (): Player => ({
  id: '',
  name: '等待加入',
  position: 'bottom',
  isAI: false,
  cards: [],
  isReady: false,
  isOnline: true,
  level: 2
})

const handleSelectCard = (card: Card) => {
  emit('select-card', card)
}

const handleAddToSelection = (card: Card) => {
  emit('add-to-selection', card)
}
</script>

<style scoped>
.game-board {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: 
    radial-gradient(circle at center, rgba(74, 144, 217, 0.1) 0%, transparent 70%),
    linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 20px;
  position: relative;
}

.top-player {
  height: 80px;
  display: flex;
  justify-content: center;
}

.middle-row {
  flex: 1;
  display: flex;
  min-height: 0;
}

.left-player,
.right-player {
  width: 150px;
  display: flex;
  align-items: center;
}

.left-player {
  justify-content: flex-start;
}

.right-player {
  justify-content: flex-end;
}

.center-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bottom-player {
  min-height: 180px;
  padding-top: 10px;
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  justify-content: center;
  gap: 8px 12px;
  flex-wrap: nowrap;
}

.my-cards {
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  justify-content: center;
}

.bottom-actions {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: flex-end;
  padding-bottom: 2px;
}
</style>
