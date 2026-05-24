# 服务端模块 Wiki

## 概述

服务端是基于 Node.js + Express + Socket.io 构建的实时游戏服务器，负责游戏逻辑处理、AI决策、WebSocket通信和LLM教练服务。

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | 18+ | 运行环境 |
| Express | 4.x | HTTP服务 |
| Socket.io | 4.x | WebSocket通信 |
| TypeScript | 5.x | 类型安全 |

## 目录结构

```
server/src/
├── game/                # 游戏核心逻辑
│   ├── game.ts         # 游戏引擎
│   ├── rules.ts        # 游戏规则
│   └── judge.ts        # 牌型判断
├── ai/                  # AI引擎
│   ├── basic.ts        # 基础AI
│   ├── llm.ts          # LLM AI
│   ├── team-ai.ts      # 团队AI
│   └── legal-move-fallback.ts
├── coach/               # 教练服务
│   ├── coach-hint-service.ts    # 教练提示服务
│   ├── reason-engine.ts         # 推理引擎
│   ├── prompt-builder.ts        # 提示词构建
│   ├── openai-stream.ts         # OpenAI流式调用
│   ├── coach-knowledge-base.ts  # 知识库
│   ├── coach-narration.ts       # 叙述生成
│   ├── hand-context.ts          # 手牌上下文
│   ├── fallback-reason.ts       # 回退推理
│   ├── guandan-rules-prompt.ts  # 规则提示
│   ├── coach-card-labels.ts     # 卡牌标签
│   ├── validate-play-recommendation.ts
│   └── types.ts                 # 类型定义
├── socket/              # WebSocket处理
│   └── index.ts        # Socket事件处理
├── config/              # 配置
│   ├── env.ts          # 环境变量
│   ├── game.ts         # 游戏配置
│   ├── server.defaults.ts
│   └── client.defaults.ts
├── index.ts             # 入口文件
└── load-env.ts          # 环境加载
```

## 核心模块

### 1. 入口文件 (index.ts)

**功能**:
- 创建HTTP服务器
- 初始化Socket.io
- 配置CORS
- 启动服务监听

```typescript
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL }
})

httpServer.listen(3001, () => {
  console.log('Server running on port 3001')
})
```

### 2. Socket处理 (socket/index.ts)

**房间管理**:
```typescript
interface Room {
  game: GuandanGame
  sockets: Map<string, string>
  aiDifficulty: AIDifficulty
  mode: 'local' | 'online'
  teamChatEnabled: boolean
  teamMessages: TeamMessage[]
}

const rooms = new Map<string, Room>()
```

**主要事件**:

| 事件 | 描述 | 参数 |
|------|------|------|
| create-room | 创建房间 | roomId, playerName, aiDifficulty, mode, teamChatEnabled |
| join-room | 加入房间 | roomId, playerName |
| start-game | 开始游戏 | roomId |
| play-cards | 出牌 | roomId, cards |
| pass | 不出 | roomId |
| request-coach-hint | 请求教练提示 | roomId, requestId, coachMode |
| send-team-message | 发送团队消息 | roomId, message |
| toggle-team-chat | 切换团队聊天 | roomId, enabled |

**事件处理流程**:

```typescript
// 创建房间
socket.on('create-room', ({ roomId, playerName, aiDifficulty, mode, teamChatEnabled }, callback) => {
  const game = new GuandanGame()
  const player = game.addPlayer(socket.id, playerName, 0)
  
  // 添加AI玩家
  for (let i = 1; i < 4; i++) {
    game.addPlayer(`ai-${i}`, `AI-${i}`, i, true)
  }
  
  rooms.set(roomId, {
    game,
    sockets: new Map([[socket.id, playerName]]),
    aiDifficulty,
    mode,
    teamChatEnabled,
    teamMessages: []
  })
  
  callback({ success: true, playerId: socket.id })
})

// 出牌
socket.on('play-cards', async ({ roomId, cards }) => {
  const room = rooms.get(roomId)
  const result = room.game.playCards(socket.id, cards)
  
  if (result.success) {
    io.to(roomId).emit('cards-played', {
      playerId: socket.id,
      cards,
      state: room.game.getState()
    })
    
    // 触发AI出牌
    await handleAITurn(roomId, io)
  }
})
```

### 3. 游戏引擎 (game/game.ts)

**核心类**:
```typescript
export class GuandanGame {
  private state: GameState
  private judge: Judge
  
  constructor() {
    this.state = this.initGameState()
    this.judge = new Judge()
  }
  
  // 添加玩家
  addPlayer(id: string, name: string, position: number, isAI = false): Player
  
  // 发牌
  dealCards(): void
  
  // 出牌
  playCards(playerId: string, cards: Card[]): PlayResult
  
  // 不出
  pass(playerId: string): PassResult
  
  // 获取状态
  getState(): GameState
  
  // 获取玩家
  getPlayer(playerId: string): Player | undefined
}
```

**游戏状态**:
```typescript
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
  roomId: string
}
```

### 4. 游戏规则 (game/rules.ts)

**牌型定义**:
```typescript
export type CardRank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | 'SJ' | 'BJ'
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'

export interface Card {
  id: string
  rank: CardRank
  suit: Suit
}

export type PatternType = 
  | 'single' | 'pair' | 'triple' | 'triple_with_pair'
  | 'straight' | 'straight_flush'
  | 'bomb' | 'rocket'
  | 'full_house' | 'pair_straight'

export interface CardPattern {
  type: PatternType
  cards: Card[]
  mainValue: number
}
```

**牌型判断**:
```typescript
export function identifyPattern(cards: Card[], levelRank: CardRank): CardPattern | null
export function canBeat(pattern: CardPattern, lastPattern: CardPattern): boolean
export function getCardValue(rank: CardRank, levelRank: CardRank): number
```

### 5. AI引擎 (ai/)

#### BasicAI - 基础AI

```typescript
export class BasicAI {
  constructor(private game: GuandanGame, private difficulty: AIDifficulty) {}
  
  selectCards(cards: Card[], lastPattern: CardPattern | null): Card[] {
    // 1. 如果没有上家出牌，选择最小单张或对子
    // 2. 如果有上家出牌，尝试找能压过的牌型
    // 3. 优先出小牌，保留大牌
    // 4. 考虑队友配合
  }
}
```

#### TeamAI - 团队AI

```typescript
export class TeamAI {
  private basicAI: BasicAI
  private reasonEngine: ReasonEngine
  
  async selectCards(cards: Card[], lastPattern: CardPattern | null, position: number): Promise<TeamAIResult> {
    // 1. 尝试使用LLM决策
    const llmResult = await this.reasonEngine.fetchLlmValidatedPlay(input, ctx)
    
    if (llmResult) {
      // 生成团队消息
      const message = await this.generateTeamMessage(llmResult.cards, ...)
      return { cards: llmResult.cards, message, confidence: 'high', source: 'llm' }
    }
    
    // 2. 回退到基础AI
    const basicCards = this.basicAI.selectCards(cards, lastPattern)
    return { cards: basicCards, confidence: 'medium', source: 'basic-ai' }
  }
}
```

### 6. 教练服务 (coach/)

#### CoachHintService - 教练提示服务

```typescript
export class CoachHintService {
  private reasonEngine: ReasonEngine
  
  async generateHint(input: BuildCoachHintInput): Promise<CoachHintResult> {
    // 1. 获取基础推荐
    const recommended = this.getBasicRecommendation(input)
    
    // 2. 生成推理讲解
    const reason = await this.reasonEngine.generateReason({
      recommended,
      handCards: input.handCards,
      lastPlayedPattern: input.lastPlayedPattern,
      playedHistory: input.playedHistory,
      context: input.context,
      coachMode: input.coachMode
    })
    
    return { recommended, reason, confidence: reason.confidence }
  }
}
```

#### ReasonEngine - 推理引擎

```typescript
export class ReasonEngine {
  async generateReason(params: GenerateCoachReasonParams): Promise<ReasonResult> {
    // 1. 构建系统提示词
    const systemPrompt = buildCoachSystemPrompt({ coachMode, outputFormat })
    
    // 2. 构建用户提示词
    const userPrompt = buildCoachUserPrompt({
      handCards, lastPlayedPattern, playedHistory,
      recommended, context, coachMode, teamMessages
    })
    
    // 3. 调用LLM
    const response = await this.callLLM(systemPrompt, userPrompt)
    
    return { text: response.reason, confidence: response.confidence }
  }
  
  async fetchLlmValidatedPlay(input: BuildCoachHintInput, judgeCtx: JudgeContext) {
    // 1. 构建出牌建议提示词
    const userPrompt = buildCoachPlayRecommendationUserPrompt(input)
    
    // 2. 调用LLM获取建议
    const response = await this.callLLM(systemPrompt, userPrompt)
    
    // 3. 验证出牌合法性
    const validated = validateLlmPlayRecommendation(response, handCards, lastPattern, judgeCtx)
    
    return validated.ok ? { action: validated.action, cards: validated.cards } : null
  }
}
```

#### PromptBuilder - 提示词构建

```typescript
export function buildCoachSystemPrompt(options: { coachMode: CoachHintMode, outputFormat: 'json' | 'stream_plain' }): string {
  return `
身份：你是坐在牌桌旁教玩家打牌的「掼蛋教练」，不是玩家本人。
· 对学员用第二人称「你」给建议。
· 描述牌桌、对手、队友时用第三人称。

${coachMode === 'expert' ? '高手模式：总字数约 90～120 字' : '新手模式：总字数约 200～260 字'}

${GUANDAN_TERMINOLOGY_BLOCK}
  `
}

export function buildCoachUserPrompt(params: {
  handCards: Card[]
  lastPlayedPattern: any
  playedHistory: Array<{ pattern, cards, position }>
  recommended: CoachRecommended
  context: CoachGameContext
  coachMode: CoachHintMode
  teamMessages?: string
}): string {
  return `
—— 公开局势 ——
当前打「${context.currentLevel}」；级牌为：${context.levelRank}
各座位剩余张数：${seatsLine}
队友与压力：${partnerThreat}

—— 本圈出牌 ——
${historyLines}

—— 团队交流 ——
${teamMessages}

—— 我方手牌 ——
列表：${handList}
结构摘要：${handStruct}

—— 推荐动作 ——
${rec}

请解读推荐动作。
  `
}
```

### 7. 配置管理 (config/)

#### 环境变量 (env.ts)

```typescript
export const config = {
  port: parseInt(process.env.PORT || '3001'),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiBaseUrl: process.env.OPENAI_BASE_URL,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
}
```

#### 游戏配置 (game.ts)

```typescript
export const gameConfig = {
  server: {
    aiPlayDelayMs: 1000,
    aiPassDelayMs: 500,
    coachReasonTimeoutMs: 30000,
    coachUseLlm: true,
  },
  client: {
    cardAnimationMs: 300,
  }
}
```

## API接口

### Socket事件

#### 客户端 -> 服务端

```typescript
// 创建房间
socket.emit('create-room', {
  roomId: string,
  playerName: string,
  aiDifficulty: 'easy' | 'normal' | 'hard',
  mode: 'local' | 'online',
  teamChatEnabled: boolean
}, callback)

// 出牌
socket.emit('play-cards', {
  roomId: string,
  cards: Card[]
})

// 请求教练提示
socket.emit('request-coach-hint', {
  roomId: string,
  requestId: string,
  coachMode: 'beginner' | 'expert'
})

// 发送团队消息
socket.emit('send-team-message', {
  roomId: string,
  message: string
})
```

#### 服务端 -> 客户端

```typescript
// 游戏状态更新
socket.emit('game-state', gameState: GameState)

// 出牌通知
socket.emit('cards-played', {
  playerId: string,
  cards: Card[],
  state: GameState
})

// 教练提示流
socket.emit('coach-hint-stream-start', {
  roomId: string,
  requestId: string,
  recommended: CoachRecommended
})

socket.emit('coach-hint-stream-chunk', {
  roomId: string,
  requestId: string,
  text: string
})

// 团队消息
socket.emit('team-message', {
  playerId: string,
  playerName: string,
  position: number,
  content: string,
  timestamp: number
})
```

## 部署配置

### 环境变量 (.env)

```env
PORT=3001
CLIENT_URL=http://localhost:5173
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.openai.com/v1
```

### PM2配置

```javascript
module.exports = {
  apps: [{
    name: 'guandan-server',
    script: 'dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
}
```

## 性能优化

### 1. 连接管理
- 使用Socket.io房间隔离
- 定期清理空房间
- 限制单个IP连接数

### 2. 内存管理
- 限制消息历史长度
- 定期垃圾回收
- 监控内存使用

### 3. AI优化
- 缓存LLM响应
- 超时控制
- 并发限制

## 错误处理

### 全局错误捕获

```typescript
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason)
})
```

### Socket错误处理

```typescript
socket.on('error', (error) => {
  console.error('Socket error:', error)
  socket.disconnect()
})
```

## 日志规范

### 日志级别

```typescript
console.log('[info] Server started on port 3001')
console.warn('[warn] Room not found:', roomId)
console.error('[error] LLM call failed:', error)
```

### 关键日志点

- 服务启动/关闭
- 房间创建/销毁
- 玩家加入/离开
- 游戏开始/结束
- AI决策
- LLM调用

## 测试

### 单元测试

```bash
npm test
```

### 集成测试

```bash
npm run test:integration
```

## 常见问题

### Q: 端口被占用？
A: 检查端口占用：`lsof -i :3001`，修改.env中的PORT

### Q: LLM调用超时？
A: 检查网络连接，增加超时时间，检查API Key

### Q: 内存泄漏？
A: 检查事件监听器是否正确移除，检查房间清理逻辑
