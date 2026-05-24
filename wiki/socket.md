# Socket通信模块 Wiki

## 概述

Socket通信模块负责客户端与服务端之间的实时双向通信，使用Socket.io实现WebSocket连接。

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Socket.io | 4.x | WebSocket框架 |
| Socket.io Client | 4.x | 客户端库 |

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   useSocket.ts                        │  │
│  │  · connect()                                          │  │
│  │  · createRoom()                                       │  │
│  │  · joinRoom()                                         │  │
│  │  · playCards()                                        │  │
│  │  · requestCoachHint()                                 │  │
│  │  · sendTeamMessage()                                  │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │ WebSocket
┌──────────────────────▼──────────────────────────────────────┐
│                        服务端                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   socket/index.ts                     │  │
│  │  · 房间管理                                           │  │
│  │  · 游戏流程                                           │  │
│  │  · AI调度                                             │  │
│  │  · 教练服务                                           │  │
│  │  · 团队聊天                                           │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 服务端实现

### Socket初始化

```typescript
import { Server } from 'socket.io'
import { createServer } from 'http'

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
})

// 房间存储
const rooms = new Map<string, Room>()

interface Room {
  game: GuandanGame
  sockets: Map<string, string>
  aiDifficulty: AIDifficulty
  mode: 'local' | 'online'
  teamChatEnabled: boolean
  teamMessages: TeamMessage[]
}
```

### 连接处理

```typescript
io.on('connection', (socket) => {
  console.log('客户端连接:', socket.id)
  
  // 注册事件处理器
  registerEventHandlers(socket, io)
  
  socket.on('disconnect', () => {
    console.log('客户端断开:', socket.id)
    handleDisconnect(socket)
  })
})
```

## 事件定义

### 客户端 -> 服务端

#### 1. 房间管理

```typescript
// 创建房间
socket.emit('create-room', {
  roomId: string,
  playerName: string,
  aiDifficulty: 'easy' | 'normal' | 'hard',
  mode: 'local' | 'online',
  teamChatEnabled: boolean
}, callback: (response) => void)

// 加入房间
socket.emit('join-room', {
  roomId: string,
  playerName: string
}, callback: (response) => void)

// 离开房间
socket.emit('leave-room', {
  roomId: string
})

// 开始游戏
socket.emit('start-game', {
  roomId: string
})
```

#### 2. 游戏操作

```typescript
// 出牌
socket.emit('play-cards', {
  roomId: string,
  cards: Card[]
})

// 不出
socket.emit('pass', {
  roomId: string
})

// 选择进贡
socket.emit('select-tribute', {
  roomId: string,
  cards: Card[]
})
```

#### 3. 教练服务

```typescript
// 请求教练提示
socket.emit('request-coach-hint', {
  roomId: string,
  requestId: string,
  coachMode: 'beginner' | 'expert'
})
```

#### 4. 团队聊天

```typescript
// 发送团队消息
socket.emit('send-team-message', {
  roomId: string,
  message: string
})

// 切换团队聊天
socket.emit('toggle-team-chat', {
  roomId: string,
  enabled: boolean
})
```

### 服务端 -> 客户端

#### 1. 游戏状态

```typescript
// 游戏状态更新
socket.emit('game-state', {
  status: 'waiting' | 'playing' | 'tribute' | 'game_over',
  players: Player[],
  currentPlayerIndex: number,
  currentLevel: number,
  levelRank: CardRank,
  roundNumber: number,
  lastPlayedPattern: CardPattern | null,
  lastPlayerIndex: number,
  playedCards: PlayedCard[],
  roundFinishOrder: number[]
})

// 玩家加入
socket.emit('player-joined', {
  playerId: string,
  playerName: string,
  position: number
})

// 玩家离开
socket.emit('player-left', {
  playerId: string
})
```

#### 2. 出牌通知

```typescript
// 出牌
socket.emit('cards-played', {
  playerId: string,
  cards: Card[],
  state: GameState
})

// 不出
socket.emit('player-passed', {
  playerId: string,
  state: GameState
})

// 回合结束
socket.emit('round-finished', {
  finishOrder: number[],
  levelUp: number
})

// 游戏结束
socket.emit('game-over', {
  winner: 'team1' | 'team2',
  finishOrder: number[]
})
```

#### 3. 教练提示

```typescript
// 流式开始
socket.emit('coach-hint-stream-start', {
  roomId: string,
  requestId: string,
  recommended: {
    action: 'play' | 'pass',
    cards: string[],
    patternType: string | null
  }
})

// 流式内容
socket.emit('coach-hint-stream-chunk', {
  roomId: string,
  requestId: string,
  text: string
})

// 流式结束
socket.emit('coach-hint-stream-end', {
  ok: true,
  roomId: string,
  requestId: string,
  reason: string,
  confidence: 'low' | 'medium' | 'high'
})

// 错误
socket.emit('coach-hint-error', {
  roomId: string,
  requestId: string,
  errorCode: string,
  errorMessage: string
})
```

#### 4. 团队聊天

```typescript
// 团队消息
socket.emit('team-message', {
  playerId: string,
  playerName: string,
  position: number,
  content: string,
  timestamp: number
})

// 团队聊天开关
socket.emit('team-chat-toggled', {
  enabled: boolean
})
```

## 服务端事件处理

### 创建房间

```typescript
socket.on('create-room', ({ roomId, playerName, aiDifficulty, mode, teamChatEnabled }, callback) => {
  // 1. 验证参数
  if (!roomId || !playerName) {
    callback?.({ success: false, message: '参数错误' })
    return
  }
  
  // 2. 检查房间是否存在
  if (rooms.has(roomId)) {
    callback?.({ success: false, message: '房间已存在' })
    return
  }
  
  // 3. 创建游戏
  const game = new GuandanGame()
  const player = game.addPlayer(socket.id, playerName, 0)
  
  // 4. 添加AI玩家
  for (let i = 1; i < 4; i++) {
    game.addPlayer(`ai-${i}`, `AI-${i}`, i, true)
  }
  
  // 5. 创建房间
  rooms.set(roomId, {
    game,
    sockets: new Map([[socket.id, playerName]]),
    aiDifficulty,
    mode,
    teamChatEnabled: teamChatEnabled !== false,
    teamMessages: []
  })
  
  // 6. 加入Socket房间
  socket.join(roomId)
  
  // 7. 返回成功
  callback?.({ success: true, playerId: socket.id })
  console.log(`[room] ${playerName} 创建房间 ${roomId}`)
})
```

### 出牌处理

```typescript
socket.on('play-cards', async ({ roomId, cards }) => {
  const room = rooms.get(roomId)
  if (!room) return
  
  // 1. 执行出牌
  const result = room.game.playCards(socket.id, cards)
  
  if (!result.success) {
    socket.emit('play-error', { message: result.error })
    return
  }
  
  // 2. 广播出牌
  io.to(roomId).emit('cards-played', {
    playerId: socket.id,
    cards,
    state: room.game.getState()
  })
  
  // 3. 检查回合结束
  if (result.roundFinished) {
    io.to(roomId).emit('round-finished', {
      finishOrder: result.finishOrder,
      levelUp: result.levelUp
    })
  }
  
  // 4. 检查游戏结束
  if (result.gameOver) {
    io.to(roomId).emit('game-over', {
      winner: result.winner,
      finishOrder: result.finishOrder
    })
    return
  }
  
  // 5. 触发AI出牌
  await handleAITurn(roomId, io)
})
```

### 教练提示处理

```typescript
socket.on('request-coach-hint', async ({ roomId, requestId, coachMode }) => {
  const room = rooms.get(roomId)
  if (!room) {
    socket.emit('coach-hint-error', {
      roomId, requestId,
      errorCode: 'COACH_ROOM_NOT_FOUND',
      errorMessage: '房间不存在'
    })
    return
  }
  
  // 1. 验证玩家
  const player = room.game.getPlayer(socket.id)
  if (!player || player.isAI) {
    socket.emit('coach-hint-error', {
      roomId, requestId,
      errorCode: 'COACH_REQUEST_PLAYER_IS_AI',
      errorMessage: 'AI不能请求教练提示'
    })
    return
  }
  
  // 2. 验证回合
  const state = room.game.getState()
  if (state.currentPlayerIndex !== player.position) {
    socket.emit('coach-hint-error', {
      roomId, requestId,
      errorCode: 'COACH_NOT_YOUR_TURN',
      errorMessage: '不是你的回合'
    })
    return
  }
  
  // 3. 生成提示
  const coachService = new CoachHintService()
  const teamMsgStr = room.teamMessages
    .filter(m => m.timestamp > Date.now() - 300000)
    .map(m => `玩家${m.position + 1}(${m.playerName}): ${m.content}`)
    .join('\n')
  
  try {
    // 4. 流式输出
    const stream = coachService.generateHintStream({
      handCards: player.cards,
      lastPlayedPattern: state.lastPlayedPattern,
      playedHistory: state.playedCards,
      context: buildContext(state, player.position),
      coachMode,
      teamMessages: teamMsgStr
    })
    
    // 5. 发送流式事件
    socket.emit('coach-hint-stream-start', {
      roomId, requestId,
      recommended: stream.recommended
    })
    
    for await (const chunk of stream.reason) {
      socket.emit('coach-hint-stream-chunk', {
        roomId, requestId,
        text: chunk
      })
    }
    
    socket.emit('coach-hint-stream-end', {
      ok: true, roomId, requestId,
      reason: stream.fullReason,
      confidence: stream.confidence
    })
    
  } catch (error) {
    socket.emit('coach-hint-error', {
      roomId, requestId,
      errorCode: 'COACH_INTERNAL_ERROR',
      errorMessage: error.message
    })
  }
})
```

### 团队消息处理

```typescript
socket.on('send-team-message', ({ roomId, message }, callback) => {
  const room = rooms.get(roomId)
  if (!room) {
    callback?.({ success: false, message: '房间不存在' })
    return
  }
  
  if (!room.teamChatEnabled) {
    callback?.({ success: false, message: '团队聊天已关闭' })
    return
  }
  
  const player = room.game.getPlayer(socket.id)
  if (!player) {
    callback?.({ success: false, message: '玩家不存在' })
    return
  }
  
  // 1. 创建消息
  const teamMessage: TeamMessage = {
    playerId: socket.id,
    playerName: player.name,
    position: player.position,
    content: message,
    timestamp: Date.now()
  }
  
  // 2. 存储消息
  room.teamMessages.push(teamMessage)
  if (room.teamMessages.length > 50) {
    room.teamMessages = room.teamMessages.slice(-50)
  }
  
  // 3. 广播消息
  io.to(roomId).emit('team-message', teamMessage)
  callback?.({ success: true })
  
  console.log(`[team-chat] ${player.name} (位置${player.position}): ${message}`)
})
```

## 客户端实现

### Socket连接

```typescript
import { io, Socket } from 'socket.io-client'

const SERVER_URL = 'http://localhost:3001'
let socket: Socket | null = null

export function useSocket() {
  function connect() {
    if (socket?.connected) return
    
    socket = io(SERVER_URL, {
      transports: ['websocket'],
      autoConnect: true
    })
    
    // 连接成功
    socket.on('connect', () => {
      console.log('Socket connected:', socket?.id)
    })
    
    // 连接错误
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
    })
    
    // 断开连接
    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
    })
    
    // 注册事件监听
    registerEventListeners()
  }
  
  function disconnect() {
    socket?.disconnect()
    socket = null
  }
  
  return { connect, disconnect }
}
```

### 事件监听

```typescript
function registerEventListeners() {
  const store = useGameStore()
  
  // 游戏状态
  socket.on('game-state', (state: GameState) => {
    store.setGameState(state)
  })
  
  // 出牌
  socket.on('cards-played', ({ playerId, cards, state }) => {
    store.setGameState(state)
    // 播放出牌动画
  })
  
  // 教练提示流
  socket.on('coach-hint-stream-start', (data) => {
    store.setCoachHintRecommended(data.recommended)
    store.setCoachHintReason('')
  })
  
  socket.on('coach-hint-stream-chunk', (data) => {
    store.appendCoachHintReason(data.text)
  })
  
  socket.on('coach-hint-stream-end', (data) => {
    store.setCoachHintConfidence(data.confidence)
    store.setCoachHintLoading(false)
  })
  
  // 团队消息
  socket.on('team-message', (message: TeamMessage) => {
    store.addTeamMessage(message)
  })
}
```

### API方法

```typescript
// 创建房间
function createRoom(
  roomId: string,
  playerName: string,
  aiDifficulty: string,
  mode: 'local' | 'online',
  teamChatEnabled: boolean
): Promise<any> {
  return new Promise((resolve) => {
    socket?.emit('create-room', 
      { roomId, playerName, aiDifficulty, mode, teamChatEnabled },
      (response) => {
        if (response.success) {
          store.setRoomInfo(roomId, playerName, response.playerId || socket?.id || '', mode)
          store.setTeamChatEnabled(teamChatEnabled)
          store.clearTeamMessages()
        }
        resolve(response)
      }
    )
  })
}

// 出牌
function playCards(roomId: string, cards: Card[]): void {
  socket?.emit('play-cards', { roomId, cards })
}

// 请求教练提示
function requestCoachHint(roomId: string, coachMode: CoachHintMode): string {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  store.setCoachHintLoading(requestId, coachMode)
  socket?.emit('request-coach-hint', { roomId, requestId, coachMode }, () => {})
  return requestId
}

// 发送团队消息
function sendTeamMessage(roomId: string, message: string): void {
  socket?.emit('send-team-message', { roomId, message })
}
```

## AI调度

### AI出牌调度

```typescript
async function handleAITurn(roomId: string, io: Server) {
  const room = rooms.get(roomId)
  if (!room) return
  
  const state = room.game.getState()
  if (state.status !== 'playing') return
  
  const currentPlayer = state.players[state.currentPlayerIndex]
  if (!currentPlayer?.isAI) return
  
  await executeAiPlayTurn(room, roomId, io)
}

async function executeAiPlayTurn(room: Room, roomId: string, io: Server) {
  const game = room.game
  const state = game.getState()
  const current = state.players[state.currentPlayerIndex]
  
  // 1. 创建AI实例
  const teamAI = new TeamAI(game, {
    useLLM: room.aiDifficulty === 'hard',
    teamChatEnabled: room.teamChatEnabled
  })
  
  // 2. 设置团队消息
  teamAI.setTeamMessages(room.teamMessages)
  
  // 3. 获取AI决策
  const result = await teamAI.selectCards(
    current.cards,
    state.lastPlayedPattern,
    current.position
  )
  
  // 4. 执行出牌
  if (result.cards.length > 0) {
    const playResult = game.playCards(current.id, result.cards)
    
    if (playResult.success) {
      // 广播出牌
      io.to(roomId).emit('cards-played', {
        playerId: current.id,
        cards: result.cards,
        state: game.getState()
      })
      
      // 发送团队消息
      if (result.message) {
        const teamMessage: TeamMessage = {
          playerId: current.id,
          playerName: current.name,
          position: current.position,
          content: result.message,
          timestamp: Date.now()
        }
        room.teamMessages.push(teamMessage)
        io.to(roomId).emit('team-message', teamMessage)
      }
    }
  } else {
    // 不出
    game.pass(current.id)
    io.to(roomId).emit('player-passed', {
      playerId: current.id,
      state: game.getState()
    })
  }
  
  // 5. 继续AI回合
  setTimeout(() => handleAITurn(roomId, io), 1000)
}
```

## 错误处理

### 连接错误

```typescript
socket.on('connect_error', (error) => {
  console.error('连接错误:', error)
  
  // 重连逻辑
  setTimeout(() => {
    socket?.connect()
  }, 3000)
})
```

### 事件错误

```typescript
socket.on('play-error', ({ message }) => {
  console.error('出牌错误:', message)
  // 显示错误提示
})

socket.on('coach-hint-error', ({ errorCode, errorMessage }) => {
  console.error('教练提示错误:', errorCode, errorMessage)
  store.setCoachHintError(errorMessage)
})
```

### 超时处理

```typescript
function playCardsWithTimeout(roomId: string, cards: Card[], timeout = 5000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('出牌超时'))
    }, timeout)
    
    socket?.emit('play-cards', { roomId, cards }, (response) => {
      clearTimeout(timer)
      resolve(response)
    })
  })
}
```

## 性能优化

### 1. 房间清理

```typescript
// 定期清理空房间
setInterval(() => {
  for (const [roomId, room] of rooms) {
    if (room.sockets.size === 0) {
      rooms.delete(roomId)
      console.log(`[room] 清理空房间: ${roomId}`)
    }
  }
}, 60000) // 每分钟检查一次
```

### 2. 消息限制

```typescript
// 限制消息频率
const messageRateLimit = new Map<string, number[]>()

socket.on('send-team-message', ({ roomId, message }) => {
  const now = Date.now()
  const history = messageRateLimit.get(socket.id) || []
  
  // 清理旧记录
  const recent = history.filter(t => now - t < 10000)
  
  if (recent.length >= 5) {
    callback?.({ success: false, message: '消息发送太频繁' })
    return
  }
  
  recent.push(now)
  messageRateLimit.set(socket.id, recent)
  
  // 处理消息...
})
```

### 3. 状态压缩

```typescript
// 压缩游戏状态
function compressState(state: GameState): CompressedState {
  return {
    ...state,
    players: state.players.map(p => ({
      ...p,
      cards: p.cards.map(c => c.id) // 只发送ID
    }))
  }
}
```

## 安全考虑

### 1. 身份验证

```typescript
io.use((socket, next) => {
  const token = socket.handshake.auth.token
  // 验证token
  next()
})
```

### 2. 房间权限

```typescript
socket.on('play-cards', ({ roomId, cards }) => {
  const room = rooms.get(roomId)
  if (!room || !room.sockets.has(socket.id)) {
    return // 无权限
  }
  // 处理...
})
```

### 3. 输入验证

```typescript
socket.on('send-team-message', ({ roomId, message }) => {
  // 验证消息长度
  if (message.length > 50) {
    callback?.({ success: false, message: '消息太长' })
    return
  }
  
  // 过滤敏感词
  const filtered = filterSensitiveWords(message)
  // 处理...
})
```

## 测试

### 连接测试

```typescript
describe('Socket Connection', () => {
  it('应该成功连接', (done) => {
    const socket = io(SERVER_URL)
    socket.on('connect', () => {
      expect(socket.connected).toBe(true)
      socket.disconnect()
      done()
    })
  })
})
```

### 房间测试

```typescript
describe('Room Management', () => {
  it('应该成功创建房间', (done) => {
    const socket = io(SERVER_URL)
    socket.emit('create-room', {
      roomId: 'TEST123',
      playerName: 'TestPlayer',
      aiDifficulty: 'normal',
      mode: 'local'
    }, (response) => {
      expect(response.success).toBe(true)
      socket.disconnect()
      done()
    })
  })
})
```

## 常见问题

### Q: 连接频繁断开？
A: 检查网络稳定性，增加心跳间隔

### Q: 消息丢失？
A: 确保事件监听器正确注册，检查房间是否正确加入

### Q: AI出牌卡住？
A: 检查AI逻辑是否有死循环，增加超时处理
