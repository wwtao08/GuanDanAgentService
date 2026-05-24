<template>
  <div class="team-chat-container">
    <div class="chat-header">
      <span>🤝 团队交流</span>
      <span class="chat-hint">（全局可见）</span>
    </div>

    <div class="messages" ref="messagesRef">
      <div
        v-for="msg in messages"
        :key="msg.timestamp + msg.playerId"
        class="message"
        :class="{
          'my-message': msg.playerId === myPlayerId,
          'ai-message': isAIPlayer(msg.playerId)
        }"
      >
        <div class="message-header">
          <span class="sender">{{ msg.playerName }}</span>
          <span class="time">{{ formatTime(msg.timestamp) }}</span>
        </div>
        <div class="message-content">{{ msg.content }}</div>
      </div>
      <div v-if="messages.length === 0" class="empty-state">
        暂无团队消息<br/>
        <span class="hint">可以发送提示给队友</span>
      </div>
    </div>

    <div class="input-area" :class="{ disabled: !teamChatEnabled }">
      <input
        v-model="inputText"
        placeholder="给队友发提示..."
        @keyup.enter="sendMessage"
        :disabled="!teamChatEnabled"
        maxlength="50"
      />
      <button @click="sendMessage" :disabled="!teamChatEnabled || !inputText.trim()">发送</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import type { TeamMessage } from '@/types'

const props = defineProps<{
  messages: TeamMessage[]
  myPlayerId: string
  teamChatEnabled: boolean
  playerIds: string[]
}>()

const emit = defineEmits<{
  (e: 'send-message', content: string): void
  (e: 'toggle-chat', enabled: boolean): void
}>()

const inputText = ref('')
const messagesRef = ref<HTMLElement>()

const isAIPlayer = (playerId: string) => {
  return playerId.startsWith('ai-')
}

const sendMessage = () => {
  if (!inputText.value.trim() || !props.teamChatEnabled) return
  emit('send-message', inputText.value.trim())
  inputText.value = ''
}

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

watch(() => props.messages.length, async () => {
  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
})
</script>

<style scoped>
.team-chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--card-bg);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--primary-color);
  color: white;
  font-weight: bold;
}

.chat-hint {
  font-size: 11px;
  font-weight: normal;
  opacity: 0.8;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.message {
  margin-bottom: 12px;
  padding: 10px 12px;
  background: var(--secondary-bg);
  border-radius: 8px;
  max-width: 100%;
}

.my-message {
  background: var(--primary-light);
  border-right: 3px solid var(--primary-color);
}

.ai-message {
  background: var(--ai-bg);
  border-right: 3px solid var(--success-color);
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.sender {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.time {
  font-size: 10px;
  color: var(--text-muted);
}

.message-content {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.4;
  word-break: break-word;
}

.empty-state {
  text-align: center;
  color: var(--text-muted);
  padding: 40px 20px;
  font-size: 14px;
}

.empty-state .hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 8px;
  display: block;
}

.input-area {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--border-color);
  background: var(--card-bg);
}

.input-area.disabled {
  opacity: 0.5;
}

.input-area input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  background: var(--secondary-bg);
  color: var(--text-primary);
}

.input-area input:disabled {
  cursor: not-allowed;
}

.input-area input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.input-area button {
  padding: 10px 20px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.input-area button:disabled {
  background: var(--border-color);
  cursor: not-allowed;
}

.input-area button:hover:not(:disabled) {
  background: var(--primary-color);
  opacity: 0.9;
}
</style>
