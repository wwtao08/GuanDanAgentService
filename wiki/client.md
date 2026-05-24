# 客户端模块 Wiki

## 概述

客户端是基于 Vue 3 + TypeScript + Vite 构建的单页应用，负责游戏界面渲染、用户交互和与服务端的通信。

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue | 3.x | 前端框架 |
| TypeScript | 5.x | 类型安全 |
| Vite | 5.x | 构建工具 |
| Pinia | 2.x | 状态管理 |
| Socket.io Client | 4.x | WebSocket通信 |
| Vue Router | 4.x | 路由管理 |

## 目录结构

```
client/src/
├── components/           # Vue组件
│   ├── Game/            # 游戏相关组件
│   │   ├── GameBoard.vue       # 游戏主界面
│   │   ├── HandCards.vue       # 手牌展示
│   │   ├── PlayedCards.vue     # 已出牌区域
│   │   ├── PlayerInfo.vue      # 玩家信息
│   │   ├── CoachHintPanel.vue  # 教练提示面板
│   │   └── TeamChatPanel.vue   # 团队交流面板
│   └── Chat/            # 聊天相关组件
│       ├── ChatWindow.vue      # 聊天窗口
│       └── EmojiPicker.vue     # 表情选择器
├── composables/         # 组合式API
│   ├── useSocket.ts     # Socket连接管理
│   └── useBGM.ts        # 背景音乐管理
├── stores/              # Pinia状态管理
│   └── game.ts          # 游戏状态
├── types/               # TypeScript类型定义
│   └── index.ts
├── utils/               # 工具函数
│   └── coach-card-match.ts
├── views/               # 页面视图
│   ├── HomeView.vue     # 首页
│   └── GameView.vue     # 游戏页
├── App.vue              # 根组件
├── main.ts              # 入口文件
├── router.ts            # 路由配置
└── style.css            # 全局样式
```

## 核心组件

### 1. HomeView.vue - 首页

**功能**:
- 游戏模式选择（人机对战/创建房间/加入房间）
- AI难度选择
- 团队交流开关设置

**关键代码**:
```vue
<script setup lang="ts">
const startGame = (diff: 'easy' | 'normal' | 'hard') => {
  router.push({ 
    name: 'game', 
    query: { mode: 'local', difficulty: diff, name: playerName.value }
  })
}

const createRoom = () => {
  const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase()
  router.push({
    name: 'game',
    query: { 
      mode: 'online', 
      room: newRoomId, 
      name: playerName.value, 
      action: 'create',
      teamChat: enableTeamChat.value ? '1' : '0'
    }
  })
}
</script>
```

### 2. GameView.vue - 游戏页面

**功能**:
- 游戏主界面渲染
- 出牌交互处理
- 教练提示集成
- 团队交流集成

**状态管理**:
```typescript
const store = useGameStore()
const socketApi = useSocket()

// 游戏状态
const currentLevel = computed(() => store.gameState.currentLevel)
const roundNumber = computed(() => store.gameState.roundNumber)

// 团队交流
const teamChatAllowed = ref(route.query.teamChat === '1')
const showTeamChat = ref(teamChatAllowed.value)
```

### 3. GameBoard.vue - 游戏主界面

**Props**:
```typescript
interface Props {
  gameState: GameState
  selectedCards: Card[]
  myPlayerId: string
}
```

**Events**:
- `select-card`: 选择卡牌
- `add-to-selection`: 添加到选择
- `play-cards`: 出牌
- `pass`: 不出

### 4. HandCards.vue - 手牌组件

**功能**:
- 展示玩家手牌
- 卡牌选择交互
- 出牌按钮控制

**关键逻辑**:
```vue
<script setup lang="ts">
const toggleCard = (card: Card) => {
  const index = props.selectedCards.findIndex(c => c.id === card.id)
  if (index === -1) {
    emit('add-to-selection', card)
  } else {
    emit('select-card', card)
  }
}
</script>
```

### 5. CoachHintPanel.vue - 教练提示面板

**功能**:
- 出牌建议展示
- 策略讲解显示
- 新手/高手模式切换

**Props**:
```typescript
interface Props {
  visible: boolean
  loading: boolean
  reasonStreaming: boolean
  recommended: CoachRecommended | null
  reason: string | null
  confidence: 'low' | 'medium' | 'high' | null
  errorMessage: string | null
}
```

### 6. TeamChatPanel.vue - 团队交流面板

**功能**:
- 消息列表展示
- 消息发送
- 时间戳显示

**关键代码**:
```vue
<script setup lang="ts">
const sendMessage = () => {
  if (!inputText.value.trim() || !props.teamChatEnabled) return
  emit('send-message', inputText.value.trim())
  inputText.value = ''
}
</script>
```

## 状态管理 (Pinia)

### game.ts - 游戏状态

```typescript
export const useGameStore = defineStore('game', () => {
  // 房间信息
  const roomId = ref('')
  const playerName = ref('')
  const playerId = ref('')
  const mode = ref<'local' | 'online'>('local')
  
  // 游戏状态
  const gameState = ref<GameState>({
    status: 'waiting',
    players: [],
    currentPlayerIndex: 0,
    // ...
  })
  
  // 选中的卡牌
  const selectedCards = ref<Card[]>([])
  
  // 教练提示
  const coachHintLoading = ref(false)
  const coachHintReason = ref('')
  const coachHintRecommended = ref<CoachRecommended | null>(null)
  
  // 团队消息
  const teamMessages = ref<TeamMessage[]>([])
  const teamChatEnabled = ref(true)
  
  // 方法
  function setGameState(state: GameState) { ... }
  function addTeamMessage(message: TeamMessage) { ... }
  function clearTeamMessages() { ... }
  
  return {
    roomId, playerName, playerId, mode,
    gameState, selectedCards,
    coachHintLoading, coachHintReason,
    teamMessages, teamChatEnabled,
    setGameState, addTeamMessage, clearTeamMessages
  }
})
```

## Socket通信

### useSocket.ts - Socket连接管理

**连接管理**:
```typescript
let socket: Socket | null = null

function connect() {
  socket = io(SERVER_URL, {
    transports: ['websocket'],
    autoConnect: true
  })
  
  socket.on('connect', () => {
    console.log('Socket connected')
  })
  
  socket.on('game-state', (state: GameState) => {
    store.setGameState(state)
  })
}
```

**主要方法**:
```typescript
// 创建房间
function createRoom(roomId: string, playerName: string, 
                    aiDifficulty: string, mode: 'local' | 'online',
                    teamChatEnabled: boolean): Promise<any>

// 加入房间
function joinRoom(roomId: string, playerName: string): Promise<any>

// 出牌
function playCards(roomId: string, cards: Card[]): void

// 不出
function pass(roomId: string): void

// 请求教练提示
function requestCoachHint(roomId: string, coachMode: CoachHintMode): string

// 发送团队消息
function sendTeamMessage(roomId: string, message: string): void

// 切换团队聊天
function toggleTeamChat(roomId: string, enabled: boolean): Promise<any>
```

**事件监听**:
```typescript
socket.on('cards-played', (data) => { ... })
socket.on('player-passed', (data) => { ... })
socket.on('game-over', (data) => { ... })
socket.on('coach-hint-stream-start', (data) => { ... })
socket.on('coach-hint-stream-chunk', (data) => { ... })
socket.on('team-message', (message) => { ... })
```

## 类型定义

### 核心类型

```typescript
// 卡牌
interface Card {
  id: string
  rank: CardRank
  suit: Suit
}

// 玩家
interface Player {
  id: string
  name: string
  position: number
  cards: Card[]
  isAI: boolean
}

// 游戏状态
interface GameState {
  status: 'waiting' | 'playing' | 'tribute' | 'game_over'
  players: Player[]
  currentPlayerIndex: number
  currentLevel: number
  levelRank: CardRank
  roundNumber: number
  lastPlayedPattern: CardPattern | null
  lastPlayerIndex: number
  playedCards: PlayedCard[]
  roundFinishOrder: number[]
}

// 团队消息
interface TeamMessage {
  playerId: string
  playerName: string
  position: number
  content: string
  timestamp: number
}

// 教练推荐
interface CoachRecommended {
  action: 'play' | 'pass'
  cards: string[]
  patternType: string | null
}
```

## 样式规范

### CSS变量

```css
:root {
  --primary-color: #4a90d9;
  --secondary-bg: rgba(255, 255, 255, 0.1);
  --card-bg: rgba(30, 30, 40, 0.95);
  --text-primary: #ffffff;
  --text-secondary: #aaa;
  --border-color: rgba(255, 255, 255, 0.1);
}
```

### 响应式设计

```css
@media (max-width: 768px) {
  .game-container {
    padding: 5px;
  }
  
  .side-panel {
    width: 100%;
    position: fixed;
    bottom: 0;
  }
}
```

## 构建配置

### vite.config.ts

```typescript
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
```

## 开发指南

### 添加新组件

1. 在 `src/components/` 下创建 `.vue` 文件
2. 使用 `<script setup lang="ts">` 语法
3. 定义 Props 和 Emits 接口
4. 在父组件中导入使用

### 添加新状态

1. 在 `stores/game.ts` 中添加 ref
2. 添加相关的 action 方法
3. 在组件中使用 `useGameStore()` 访问

### 添加新事件

1. 在 `useSocket.ts` 中添加监听
2. 更新 store 状态
3. 在组件中响应状态变化

## 调试技巧

### Vue DevTools
- 安装 Vue DevTools 浏览器扩展
- 查看组件树和状态

### Socket调试
```typescript
socket.onAny((event, ...args) => {
  console.log('Socket event:', event, args)
})
```

### 状态快照
```typescript
watch(() => store.gameState, (state) => {
  console.log('Game state updated:', state)
}, { deep: true })
```

## 常见问题

### Q: 组件不更新？
A: 确保状态是响应式的，使用 ref/reactive

### Q: Socket连接失败？
A: 检查服务端是否启动，端口是否正确

### Q: 样式不生效？
A: 检查 scoped 样式，确认选择器正确
