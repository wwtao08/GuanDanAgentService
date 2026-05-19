<template>
  <div class="hand-cards" :class="{ 'brush-selecting': brushSelecting }">
    <div
      v-for="(group, gi) in cardGroups"
      :key="'rank-' + group[0].value + '-' + gi"
      class="rank-stack"
    >
      <div
        v-for="(card, ci) in group"
        :key="card.id"
        class="card-wrapper"
        :data-card-id="card.id"
        :class="{
          selected: isSelected(card),
          selectable: selectable,
        }"
        :style="{ zIndex: ci + 1 }"
        @pointerdown="onCardPointerDown($event, card)"
      >
        <div class="card" :class="getCardClass(card)">
          <div v-if="card.rank === 'SJ' || card.rank === 'BJ'" class="joker-face">
            <JokerCardArt :variant="jokerVariant(card)" />
          </div>
          <div class="card-top">
            <span>{{ getRankDisplay(card.rank) }}</span>
            <span class="suit">{{ getSuitIcon(card) }}</span>
          </div>
          <div class="card-center">
            <template v-if="card.rank !== 'SJ' && card.rank !== 'BJ'">{{ getSuitIcon(card) }}</template>
          </div>
          <div class="card-bottom">
            <span>{{ getRankDisplay(card.rank) }}</span>
            <span class="suit">{{ getSuitIcon(card) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onUnmounted } from 'vue'
import type { Card } from '@/types'
import { gameConfig } from '@game-config'
import JokerCardArt from '@/components/Game/JokerCardArt.vue'

const props = defineProps<{
  cards: Card[]
  selectedCards: Card[]
  selectable: boolean
}>()

const emit = defineEmits<{
  (e: 'select', card: Card): void
  (e: 'add-to-selection', card: Card): void
}>()

const brushSelecting = ref(false)

const LONG_PRESS_MS = gameConfig.client.handLongPressMs
const MOVE_CANCEL_SQ = gameConfig.client.handMoveCancelPx ** 2

const ptr = {
  activeId: null as number | null,
  timer: null as ReturnType<typeof setTimeout> | null,
  downCard: null as Card | null,
  startX: 0,
  startY: 0,
  cancelTap: false,
}

function removeDocListeners() {
  document.removeEventListener('pointermove', onDocPointerMove, true)
  document.removeEventListener('pointerup', onDocPointerUp, true)
  document.removeEventListener('pointercancel', onDocPointerUp, true)
}

function pickCardFromPoint(clientX: number, clientY: number): Card | null {
  const el = document.elementFromPoint(clientX, clientY)
  const wrap = el?.closest?.('[data-card-id]') as HTMLElement | undefined
  const id = wrap?.dataset?.cardId
  if (!id) return null
  return props.cards.find((c) => c.id === id) ?? null
}

function onDocPointerMove(e: PointerEvent) {
  if (ptr.activeId !== e.pointerId) return

  const dx = e.clientX - ptr.startX
  const dy = e.clientY - ptr.startY

  if (!brushSelecting.value && ptr.timer) {
    if (dx * dx + dy * dy > MOVE_CANCEL_SQ) {
      ptr.cancelTap = true
      if (ptr.timer) {
        clearTimeout(ptr.timer)
        ptr.timer = null
      }
    }
  }

  if (brushSelecting.value) {
    const card = pickCardFromPoint(e.clientX, e.clientY)
    if (card) emit('add-to-selection', card)
  }
}

function onDocPointerUp(e: PointerEvent) {
  if (ptr.activeId !== e.pointerId) return

  removeDocListeners()

  if (ptr.timer) {
    clearTimeout(ptr.timer)
    ptr.timer = null
  }

  if (brushSelecting.value) {
    brushSelecting.value = false
    document.body.style.userSelect = ''
    ptr.activeId = null
    ptr.downCard = null
    ptr.cancelTap = false
    return
  }

  if (!ptr.cancelTap && ptr.downCard) {
    emit('select', ptr.downCard)
  }

  ptr.activeId = null
  ptr.downCard = null
  ptr.cancelTap = false
}

function onCardPointerDown(e: PointerEvent, card: Card) {
  if (!props.selectable) return
  if (e.pointerType === 'mouse' && e.button !== 0) return
  if (ptr.activeId !== null) return

  e.preventDefault()

  ptr.activeId = e.pointerId
  ptr.downCard = card
  ptr.startX = e.clientX
  ptr.startY = e.clientY
  ptr.cancelTap = false

  ptr.timer = setTimeout(() => {
    ptr.timer = null
    if (!ptr.cancelTap && ptr.downCard) {
      brushSelecting.value = true
      document.body.style.userSelect = 'none'
      emit('add-to-selection', ptr.downCard)
    }
  }, LONG_PRESS_MS)

  document.addEventListener('pointermove', onDocPointerMove, true)
  document.addEventListener('pointerup', onDocPointerUp, true)
  document.addEventListener('pointercancel', onDocPointerUp, true)
}

onUnmounted(() => {
  removeDocListeners()
  if (ptr.timer) clearTimeout(ptr.timer)
  document.body.style.userSelect = ''
  brushSelecting.value = false
})

/** 同点数内花色顺序：红桃 → 方片 → 黑桃 → 梅花 → 王牌 */
const suitOrder = (s: Card['suit']) => {
  const o: Record<string, number> = { hearts: 0, diamonds: 1, spades: 2, clubs: 3, joker: 4 }
  return o[s] ?? 9
}

/**
 * 先按点数从大到小横向分堆；同点数的牌再按花色排序，纵向叠牌。
 */
const cardGroups = computed(() => {
  const sorted = [...props.cards].sort((a, b) => {
    if (b.value !== a.value) return b.value - a.value
    const sd = suitOrder(a.suit) - suitOrder(b.suit)
    if (sd !== 0) return sd
    return a.id.localeCompare(b.id)
  })
  const groups: Card[][] = []
  for (const card of sorted) {
    const last = groups[groups.length - 1]
    if (last && last[0].value === card.value) {
      last.push(card)
    } else {
      groups.push([card])
    }
  }
  return groups
})

const isSelected = (card: Card) => {
  return props.selectedCards.some((c) => c.id === card.id)
}

function jokerVariant(card: Card): 'SJ' | 'BJ' {
  return card.rank === 'BJ' ? 'BJ' : 'SJ'
}

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
  const map: Record<string, string> = {
    SJ: '小王',
    BJ: '大王',
    '2': '2',
  }
  return map[rank] || rank
}

/** 角上花色：王用「王」字，避免与点数混淆 */
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
/* 同点数一列，列从左到右点数从大到小；列内纵向叠牌 */
.hand-cards {
  --card-w: 60px;
  --card-h: 85px;
  --stack-overlap: 58px;

  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-end;
  gap: 10px;
  padding: 10px 10px 12px;
  touch-action: manipulation;
}

.hand-cards.brush-selecting {
  cursor: grabbing;
  user-select: none;
}

.rank-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.card-wrapper {
  width: var(--card-w);
  touch-action: none;
}

.card-wrapper:not(:first-child) {
  margin-top: calc(-1 * var(--stack-overlap));
}

.card-wrapper.selectable {
  cursor: pointer;
}

.hand-cards.brush-selecting .card-wrapper.selectable {
  cursor: grabbing;
}

.card-wrapper.selectable:hover:not(.selected) .card {
  transform: translateY(-10px);
}

.card-wrapper.selected .card {
  transform: translateY(-20px);
  box-shadow:
    0 6px 22px rgba(251, 191, 36, 0.42),
    0 2px 10px rgba(0, 0, 0, 0.28);
}

.card-wrapper.selected .card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 6px;
  pointer-events: none;
  z-index: 2;
  background: linear-gradient(
    165deg,
    rgba(253, 224, 71, 0.38) 0%,
    rgba(250, 204, 21, 0.22) 45%,
    rgba(234, 179, 8, 0.28) 100%
  );
  box-shadow: inset 0 0 0 2px rgba(253, 224, 71, 0.95);
}

.card {
  position: relative;
  width: var(--card-w);
  height: var(--card-h);
  background: #fff;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.joker-face {
  position: absolute;
  inset: 0;
  border-radius: 6px;
  overflow: hidden;
  z-index: 0;
}

.card-top,
.card-center,
.card-bottom {
  position: relative;
  z-index: 3;
}

.card.red {
  color: #e74c3c;
}

.card.black {
  color: #2c3e50;
}

.card.joker-small,
.card.joker-big {
  background: transparent;
  color: #fff;
  overflow: hidden;
}

.card.joker-small .card-top,
.card.joker-small .card-bottom,
.card.joker-big .card-top,
.card.joker-big .card-bottom {
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.75);
}

.card-top,
.card-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 12px;
  font-weight: bold;
  line-height: 1;
}

.card-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.suit {
  font-size: 10px;
}
</style>
