<template>
  <button
    type="button"
    class="bgm-toggle"
    :title="bgmMuted ? '开启背景音乐' : '关闭背景音乐'"
    :aria-pressed="!bgmMuted"
    @click="toggleBgm"
  >
    {{ bgmMuted ? '🔇' : '🔊' }}
  </button>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useBGM } from '@/composables/useBGM'

const { bgmMuted, toggleBgm, unlockOnFirstInteraction } = useBGM()

onMounted(() => {
  unlockOnFirstInteraction()
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  min-height: 100vh;
  color: #fff;
}

.bgm-toggle {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 9999;
  width: 40px;
  height: 40px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.35);
  color: inherit;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.bgm-toggle:hover {
  background: rgba(0, 0, 0, 0.5);
}
</style>
