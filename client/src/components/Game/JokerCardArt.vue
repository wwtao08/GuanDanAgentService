<template>
  <!-- 小王：冷色底 + 小丑帽与四角星；大王：暖红底 + 皇冠与光芒 -->
  <svg
    class="joker-card-art"
    :class="variant === 'SJ' ? 'joker-card-art--small' : 'joker-card-art--big'"
    viewBox="0 0 60 85"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      <!-- 小王 -->
      <linearGradient :id="ids.sjSky" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#4a6b8c" />
        <stop offset="55%" stop-color="#2c3d52" />
        <stop offset="100%" stop-color="#1a2433" />
      </linearGradient>
      <pattern :id="ids.sjGrid" width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M0 5h10M5 0v10" stroke="rgba(255,255,255,0.06)" stroke-width="0.4" />
      </pattern>
      <radialGradient :id="ids.sjMoon" cx="50%" cy="35%" r="50%">
        <stop offset="0%" stop-color="rgba(200,220,255,0.35)" />
        <stop offset="100%" stop-color="rgba(200,220,255,0)" />
      </radialGradient>

      <!-- 大王 -->
      <linearGradient :id="ids.bjFire" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#e74c3c" />
        <stop offset="45%" stop-color="#c0392b" />
        <stop offset="100%" stop-color="#7b1c12" />
      </linearGradient>
      <pattern :id="ids.bjRay" width="12" height="12" patternUnits="userSpaceOnUse">
        <path d="M6 0 L6 12 M0 6 L12 6" stroke="rgba(255,215,120,0.12)" stroke-width="0.35" />
      </pattern>
      <linearGradient :id="ids.bjGold" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#fde68a" />
        <stop offset="50%" stop-color="#f59e0b" />
        <stop offset="100%" stop-color="#b45309" />
      </linearGradient>
    </defs>

    <g v-if="variant === 'SJ'">
      <rect width="60" height="85" :fill="url(ids.sjSky)" rx="5" />
      <rect width="60" height="85" :fill="url(ids.sjGrid)" rx="5" />
      <ellipse cx="30" cy="28" rx="22" ry="16" :fill="url(ids.sjMoon)" />
      <!-- 四角星 -->
      <path
        v-for="(p, i) in sjStars"
        :key="'s' + i"
        :transform="`translate(${p.x},${p.y}) scale(${p.s})`"
        fill="rgba(255,255,255,0.55)"
        d="M0 -3 L0.8 -0.8 L3 0 L0.8 0.8 L0 3 L-0.8 0.8 L-3 0 L-0.8 -0.8 Z"
      />
      <!-- 内框 -->
      <rect x="4" y="10" width="52" height="65" rx="3" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="0.6" />
      <!-- 小丑帽 -->
      <path
        d="M14 58 Q22 38 30 36 Q38 38 46 58 L44 62 L16 62 Z"
        fill="rgba(240,245,255,0.92)"
        stroke="rgba(255,255,255,0.5)"
        stroke-width="0.4"
      />
      <circle cx="30" cy="34" r="4" fill="#fbbf24" stroke="#b45309" stroke-width="0.3" />
      <ellipse cx="30" cy="62" rx="14" ry="3" fill="rgba(0,0,0,0.2)" />
      <!-- 帽尖球 -->
      <circle cx="22" cy="52" r="2.2" fill="#93c5fd" />
      <circle cx="38" cy="52" r="2.2" fill="#93c5fd" />
    </g>

    <g v-else>
      <rect width="60" height="85" :fill="url(ids.bjFire)" rx="5" />
      <rect width="60" height="85" :fill="url(ids.bjRay)" rx="5" />
      <circle cx="30" cy="32" r="18" fill="rgba(255,200,80,0.12)" />
      <!-- 四角装饰 -->
      <path
        v-for="(c, i) in bjCorners"
        :key="'c' + i"
        :transform="`translate(${c.x},${c.y})`"
        :fill="url(ids.bjGold)"
        opacity="0.85"
        d="M0 0 L3 1.5 L0 3 L-3 1.5 Z"
      />
      <rect x="4" y="10" width="52" height="65" rx="3" fill="none" stroke="rgba(253,224,71,0.35)" stroke-width="0.7" />
      <!-- 皇冠 -->
      <path
        d="M16 54 L18 42 L24 46 L30 38 L36 46 L42 42 L44 54 L44 58 L16 58 Z"
        :fill="url(ids.bjGold)"
        stroke="#92400e"
        stroke-width="0.45"
      />
      <circle cx="18" cy="40" r="1.8" fill="#fef3c7" />
      <circle cx="30" cy="36" r="2" fill="#fef3c7" />
      <circle cx="42" cy="40" r="1.8" fill="#fef3c7" />
      <rect x="16" y="54" width="28" height="5" rx="1" fill="#b45309" />
      <!-- 底部光 -->
      <ellipse cx="30" cy="68" rx="16" ry="4" fill="rgba(0,0,0,0.15)" />
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'

defineProps<{
  variant: 'SJ' | 'BJ'
}>()

const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '_')
const ids = computed(() => ({
  sjSky: `${uid}-sj-sky`,
  sjGrid: `${uid}-sj-grid`,
  sjMoon: `${uid}-sj-moon`,
  bjFire: `${uid}-bj-fire`,
  bjRay: `${uid}-bj-ray`,
  bjGold: `${uid}-bj-gold`,
}))

function url(id: string) {
  return `url(#${id})`
}

const sjStars = [
  { x: 8, y: 14, s: 0.55 },
  { x: 52, y: 14, s: 0.55 },
  { x: 8, y: 72, s: 0.55 },
  { x: 52, y: 72, s: 0.55 },
]

const bjCorners = [
  { x: 8, y: 14 },
  { x: 52, y: 14 },
  { x: 8, y: 72 },
  { x: 52, y: 72 },
]
</script>

<style scoped>
.joker-card-art {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
