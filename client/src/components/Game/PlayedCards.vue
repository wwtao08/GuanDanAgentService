<template>
  <div class="played-cards">
    <div
      v-for="entry in normalizedPlayedCards"
      :key="entry.key"
      class="position-cards"
      :class="entry.positionClass"
    >
      <div class="cards-container">
        <div
          v-for="card in entry.cards"
          :key="card.id"
          class="card"
          :class="getCardClass(card)"
        >
          <div v-if="isJoker(card)" class="played-joker-face">
            <JokerCardArt :variant="jokerVariant(card)" />
          </div>
          <div class="played-card-label">
            <span>{{ getRankDisplay(card.rank) }}</span>
            <span class="suit">{{ getSuitIcon(card) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Card } from '@/types'
import JokerCardArt from '@/components/Game/JokerCardArt.vue'

const isJoker = (card: Card) => card.rank === 'SJ' || card.rank === 'BJ'

function jokerVariant(card: Card): 'SJ' | 'BJ' {
  return card.rank === 'BJ' ? 'BJ' : 'SJ'
}

const props = defineProps<{
  playedCards: Array<{
    position: number
    cards: Card[]
  }>
  myPlayerIndex?: number
}>()

const positionClassMap: Record<number, string> = {
  0: 'bottom',
  1: 'right',
  2: 'top',
  3: 'left',
}

const normalizedPlayedCards = computed(() =>
  (props.playedCards || []).map((p, idx) => ({
    key: `${p.position}-${idx}`,
    cards: p.cards || [],
    positionClass: positionClassMap[((p.position - (props.myPlayerIndex || 0)) + 4) % 4] || 'top',
  })),
)

const getCardClass = (card: Card) => {
  if (card.rank === 'SJ') return { 'joker-small': true }
  if (card.rank === 'BJ') return { 'joker-big': true }
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds'
  return {
    red: isRed,
    black: !isRed,
  }
}

const getRankDisplay = (rank: string) => {
  const map: Record<string, string> = { SJ: '小', BJ: '大' }
  return map[rank] || rank
}

const getSuitIcon = (card: Card) => {
  if (card.rank === 'SJ' || card.rank === 'BJ') return '王'
  const map: Record<string, string> = {
    spades: '♠',
    hearts: '♥',
    clubs: '♣',
    diamonds: '♦',
  }
  return map[card.suit] || ''
}
</script>

<style scoped>
.played-cards {
  width: 100%;
  height: 100%;
  position: relative;
}

.position-cards {
  position: absolute;
}

.position-cards.top {
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
}

.position-cards.bottom {
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
}

.position-cards.left {
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
}

.position-cards.right {
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
}

.cards-container {
  display: flex;
  gap: 2px;
}

.position-cards.left .cards-container,
.position-cards.right .cards-container {
  flex-direction: column;
}

.card {
  position: relative;
  width: 36px;
  height: 50px;
  background: #fff;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.card.red { color: #e74c3c; }
.card.black { color: #2c3e50; }

.played-joker-face {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.played-card-label {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1px;
}

.card.joker-small .played-card-label,
.card.joker-big .played-card-label {
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.75);
}

.card.joker-small,
.card.joker-big {
  background: transparent;
}

.card .suit {
  font-size: 12px;
  margin-left: 2px;
}
</style>
