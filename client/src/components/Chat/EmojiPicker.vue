<template>
  <div class="emoji-picker">
    <div 
      v-for="emoji in emojis" 
      :key="emoji"
      class="emoji-item"
      @click="selectEmoji(emoji)"
    >
      {{ emoji }}
    </div>
  </div>
</template>

<script setup lang="ts">
const emojis = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
  '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
  '😘', '😗', '😚', '😋', '😛', '😜', '🤪', '😝',
  '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐',
  '😑', '😶', '😏', '😒', '🙄', '😬', '😮‍💨', '🤥',
  '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕',
  '👍', '👎', '👏', '🙌', '🤝', '🙏', '💪', '🤘',
  '❤️', '💔', '💯', '🎉', '🎊', '🏆', '🥳', '😎'
]

const emit = defineEmits<{
  (e: 'select', emoji: string): void
}>()

const selectEmoji = (emoji: string) => {
  emit('select', emoji)
}
</script>

<style scoped>
.emoji-picker {
  position: absolute;
  bottom: 60px;
  right: 10px;
  width: 280px;
  height: 200px;
  background: var(--card-bg);
  border-radius: 12px;
  padding: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  z-index: 10;
}

.emoji-item {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.15s;
}

.emoji-item:hover {
  background: rgba(255, 255, 255, 0.1);
}
</style>
