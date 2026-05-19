<template>
  <div class="home">
    <div class="logo">
      <h1>惯蛋游戏</h1>
      <p class="subtitle">Guandan Card Game</p>
    </div>

    <div class="menu">
      <div class="menu-card" @click="startLocalGame">
        <div class="icon">🤖</div>
        <h3>人机对战</h3>
        <p>与 AI 对手进行游戏</p>
      </div>

      <div class="menu-card" @click="showCreateRoom = true">
        <div class="icon">🏠</div>
        <h3>创建房间</h3>
        <p>创建私人房间</p>
      </div>

      <div class="menu-card" @click="showJoinRoom = true">
        <div class="icon">🔗</div>
        <h3>加入房间</h3>
        <p>输入房间号加入</p>
      </div>
    </div>

    <div class="difficulty-select" v-if="startLocal">
      <h3>选择 AI 难度</h3>
      <div class="difficulty-buttons">
        <button @click="startGame('easy')" :class="{ active: difficulty === 'easy' }">
          简单
        </button>
        <button @click="startGame('normal')" :class="{ active: difficulty === 'normal' }">
          普通
        </button>
        <button @click="startGame('hard')" :class="{ active: difficulty === 'hard' }">
          困难
        </button>
      </div>
    </div>

    <div class="modal" v-if="showCreateRoom || showJoinRoom" @click.self="closeModals">
      <div class="modal-content" v-if="showCreateRoom">
        <h2>创建房间</h2>
        <input v-model="playerName" placeholder="你的昵称" />
        <div class="modal-buttons">
          <button @click="createRoom">创建</button>
          <button @click="showCreateRoom = false" class="cancel">取消</button>
        </div>
      </div>
      <div class="modal-content" v-if="showJoinRoom">
        <h2>加入房间</h2>
        <input v-model="playerName" placeholder="你的昵称" />
        <input v-model="roomId" placeholder="房间号" />
        <div class="modal-buttons">
          <button @click="joinRoom">加入</button>
          <button @click="showJoinRoom = false" class="cancel">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const startLocal = ref(false)
const showCreateRoom = ref(false)
const showJoinRoom = ref(false)
const difficulty = ref<'easy' | 'normal' | 'hard'>('normal')
const playerName = ref('')
const roomId = ref('')

const startLocalGame = () => {
  startLocal.value = true
}

const startGame = (diff: 'easy' | 'normal' | 'hard') => {
  difficulty.value = diff
  router.push({ 
    name: 'game', 
    query: { mode: 'local', difficulty: diff, name: playerName.value || '玩家' }
  })
}

const createRoom = () => {
  const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase()
  router.push({
    name: 'game',
    query: { mode: 'online', room: newRoomId, name: playerName.value || '玩家', action: 'create' }
  })
}

const joinRoom = () => {
  router.push({
    name: 'game',
    query: { mode: 'online', room: roomId.value, name: playerName.value || '玩家', action: 'join' }
  })
}

const closeModals = () => {
  showCreateRoom.value = false
  showJoinRoom.value = false
}
</script>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
}

.logo {
  text-align: center;
  margin-bottom: 40px;
}

.logo h1 {
  font-size: 48px;
  color: #ffd700;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.subtitle {
  color: #888;
  font-size: 14px;
}

.menu {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 30px;
}

.menu-card {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 30px;
  width: 200px;
  text-align: center;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 2px solid transparent;
}

.menu-card:hover {
  transform: translateY(-5px);
  border-color: var(--primary-color);
  box-shadow: 0 10px 30px rgba(74, 144, 217, 0.3);
}

.menu-card .icon {
  font-size: 40px;
  margin-bottom: 10px;
}

.menu-card h3 {
  margin-bottom: 8px;
}

.menu-card p {
  color: #888;
  font-size: 14px;
}

.difficulty-select {
  text-align: center;
}

.difficulty-buttons {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.difficulty-buttons button {
  padding: 10px 25px;
  border: none;
  border-radius: 8px;
  background: var(--card-bg);
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;
}

.difficulty-buttons button.active,
.difficulty-buttons button:hover {
  background: var(--primary-color);
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  background: var(--card-bg);
  padding: 30px;
  border-radius: 16px;
  width: 350px;
}

.modal-content h2 {
  margin-bottom: 20px;
  text-align: center;
}

.modal-content input {
  width: 100%;
  padding: 12px;
  margin-bottom: 15px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.modal-buttons {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.modal-buttons button {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  background: var(--primary-color);
  color: #fff;
}

.modal-buttons button.cancel {
  background: rgba(255, 255, 255, 0.1);
}
</style>
