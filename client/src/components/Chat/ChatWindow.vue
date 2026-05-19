<template>
  <button class="chat-fab" v-if="isCollapsed" @click="isCollapsed = false">
    💬 聊天
  </button>

  <div class="chat-window" v-else>
    <div class="chat-header">
      <span>💬 聊天</span>
      <div class="header-actions">
        <button class="collapse-btn" @click="isCollapsed = true">收起</button>
        <button class="emoji-btn" @click="showEmojiPicker = !showEmojiPicker">😀</button>
      </div>
    </div>

    <div class="messages" ref="messagesRef">
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="message"
        :class="{
          'my-message': msg.playerId === myPlayerId,
          'system-message': msg.type === 'system'
        }"
      >
        <span class="sender">{{ msg.playerName }}</span>
        <span class="content">{{ msg.content }}</span>
      </div>
    </div>

    <div class="input-area">
      <input 
        v-model="inputText"
        placeholder="发送消息..."
        @keyup.enter="sendMessage"
      />
      <button @click="sendMessage">发送</button>
    </div>

    <EmojiPicker v-if="showEmojiPicker" @select="selectEmoji" />
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import EmojiPicker from './EmojiPicker.vue'
import type { ChatMessage } from '@/types'

const props = defineProps<{
  messages: ChatMessage[]
  myPlayerId: string
}>()

const emit = defineEmits<{
  (e: 'send-message', content: string): void
  (e: 'send-emoji', emoji: string): void
}>()

const inputText = ref('')
const showEmojiPicker = ref(false)
const isCollapsed = ref(true)
const messagesRef = ref<HTMLElement>()

const sendMessage = () => {
  if (!inputText.value.trim()) return
  emit('send-message', inputText.value.trim())
  inputText.value = ''
}

const selectEmoji = (emoji: string) => {
  emit('send-emoji', emoji)
  showEmojiPicker.value = false
}

watch(() => props.messages.length, async () => {
  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
})
</script>

<style scoped>
.chat-window {
  position: fixed;
  right: 20px;
  bottom: 20px;
  width: 300px;
  height: 400px;
  background: var(--card-bg);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  z-index: 20;
}

.chat-fab {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 21;
  border: none;
  border-radius: 999px;
  padding: 10px 14px;
  background: var(--primary-color);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  background: rgba(0, 0, 0, 0.2);
  font-weight: bold;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.collapse-btn {
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 12px;
}

.emoji-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.message {
  margin-bottom: 10px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.message.my-message {
  background: rgba(74, 144, 217, 0.3);
  margin-left: 30px;
}

.message.system-message {
  background: rgba(255, 193, 7, 0.2);
  font-style: italic;
}

.sender {
  font-size: 12px;
  color: #888;
  margin-right: 8px;
}

.content {
  font-size: 14px;
}

.input-area {
  display: flex;
  gap: 8px;
  padding: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.input-area input {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.input-area button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: var(--primary-color);
  color: #fff;
  cursor: pointer;
}
</style>
