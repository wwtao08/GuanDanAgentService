<template>
  <div class="coach-panel" :class="{ 'coach-panel--floating': floating }" v-if="visible">
    <div class="coach-toolbar">
      <div class="mode-toggle" role="group" aria-label="教练模式">
        <button
          type="button"
          class="mode-btn"
          :class="{ active: coachMode === 'expert' }"
          :disabled="loading"
          @click="coachMode = 'expert'"
        >
          高手
        </button>
        <button
          type="button"
          class="mode-btn"
          :class="{ active: coachMode === 'beginner' }"
          :disabled="loading"
          @click="coachMode = 'beginner'"
        >
          新手
        </button>
      </div>
      <button class="coach-btn" :disabled="loading" @click="onRequest">
        {{ loading ? '分析中…' : '教练提示' }}
      </button>
    </div>
    <p class="mode-hint">
      {{ coachMode === 'expert' ? '高手：思路更短、一针见血' : '新手：讲解更全、篇幅更长' }}
    </p>
    <!-- 固定高度区域：长文在此滚动，不挤压中央牌桌 -->
    <div class="coach-body">
      <div class="coach-error" v-if="errorMessage">{{ errorMessage }}</div>
      <div class="coach-result" v-if="recommended || reason !== null">
        <div class="line">
          <strong>建议：</strong>
          <span v-if="recommended?.action === 'pass'">不出</span>
          <span v-else>
            出牌（{{ recommended?.patternType || 'unknown' }}）:
            {{ (recommended?.cards || []).join(', ') }}
          </span>
        </div>
        <div class="line reason-block" v-if="reason !== null && reason !== ''">
          <strong>思路：</strong>
          <span class="reason-text">{{ reason }}</span>
          <span v-if="reasonStreaming" class="stream-caret" aria-hidden="true">▍</span>
        </div>
        <div class="line reason-placeholder" v-else-if="reasonStreaming">
          <strong>思路：</strong>
          <span class="muted">教练正在写…</span>
          <span class="stream-caret" aria-hidden="true">▍</span>
        </div>
        <div class="line" v-if="confidence && !reasonStreaming">
          <strong>置信度：</strong>{{ confidence }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { CoachHintMode, CoachRecommended } from '@/types'

defineProps<{
  visible: boolean
  /** 在悬浮层内展示时：由外层容器限高，本面板不再挤占主布局 */
  floating?: boolean
  loading: boolean
  reasonStreaming: boolean
  recommended: CoachRecommended | null
  reason: string | null
  confidence: 'low' | 'medium' | 'high' | null
  errorMessage: string | null
}>()

const emit = defineEmits<{
  (e: 'request', mode: CoachHintMode): void
}>()

const coachMode = ref<CoachHintMode>('beginner')

function onRequest() {
  emit('request', coachMode.value)
}
</script>

<style scoped>
.coach-panel {
  display: flex;
  flex-direction: column;
  margin: 8px auto 0;
  max-width: 920px;
  /* 整块面板高度上限，避免占满竖屏挤压牌桌 */
  max-height: min(42vh, 360px);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 10px;
  padding: 12px;
  flex-shrink: 0;
  min-height: 0;
}
.coach-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.mode-toggle {
  display: inline-flex;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);
}
.mode-btn {
  padding: 8px 12px;
  border: none;
  background: rgba(0, 0, 0, 0.25);
  color: rgba(255, 255, 255, 0.75);
  cursor: pointer;
  font-size: 13px;
}
.mode-btn.active {
  background: rgba(74, 144, 217, 0.45);
  color: #fff;
}
.mode-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.coach-btn {
  padding: 8px 14px;
  border: none;
  border-radius: 8px;
  background: #4a90d9;
  color: #fff;
  cursor: pointer;
}
.coach-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.mode-hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
}
.coach-body {
  margin-top: 8px;
  flex: 1 1 auto;
  min-height: 0;
  max-height: min(32vh, 280px);
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 4px;
  -webkit-overflow-scrolling: touch;
}
.coach-body::-webkit-scrollbar {
  width: 8px;
}
.coach-body::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 4px;
}
.coach-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.22);
  border-radius: 4px;
}
.coach-body::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.32);
}
.coach-result {
  font-size: 14px;
  line-height: 1.5;
}
.coach-error {
  margin-bottom: 8px;
  color: #ff7b7b;
}
.line {
  margin-top: 4px;
}
.reason-block .reason-text {
  white-space: pre-wrap;
}
.stream-caret {
  display: inline-block;
  margin-left: 2px;
  animation: blink 1s step-end infinite;
  color: #4a90d9;
}
@keyframes blink {
  50% {
    opacity: 0;
  }
}
.muted {
  color: rgba(255, 255, 255, 0.45);
}

.coach-panel--floating {
  margin: 0;
  max-height: none;
  flex: 1;
  min-height: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  padding: 0 8px 10px;
}
.coach-panel--floating .coach-body {
  max-height: min(52vh, 440px);
}
</style>
