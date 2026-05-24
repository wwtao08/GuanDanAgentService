# AI模块 Wiki

## 概述

AI模块负责游戏中的AI玩家决策，包括基础规则AI、LLM增强AI和团队协作AI。

## 文件结构

```
server/src/ai/
├── basic.ts              # 基础AI引擎
├── llm.ts                # LLM AI引擎
├── team-ai.ts            # 团队协作AI
└── legal-move-fallback.ts # 合法出牌回退
```

## AI架构

```
┌─────────────────────────────────────────────────────────┐
│                     TeamAI (主控制器)                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │  1. 尝试 LLM 决策                                 │   │
│  │  2. 生成团队消息                                  │   │
│  │  3. 回退到 BasicAI                               │   │
│  └─────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
┌───────▼────────┐           ┌────────▼────────┐
│   BasicAI      │           │  ReasonEngine   │
│  (规则引擎)    │           │   (LLM推理)     │
└────────────────┘           └─────────────────┘
```

## 核心类

### 1. TeamAI - 团队协作AI

**职责**:
- 协调LLM和基础AI
- 生成团队消息
- 管理AI配置

**类定义**:
```typescript
export class TeamAI {
  private basicAI: BasicAI
  private reasonEngine: ReasonEngine
  private game: GuandanGame
  private config: TeamAIConfig
  private teamMessages: TeamMessage[]
  
  constructor(game: GuandanGame, config: Partial<TeamAIConfig> = {}) {
    this.game = game
    this.basicAI = new BasicAI(game, 'hard')
    this.reasonEngine = new ReasonEngine()
    this.config = {
      useLLM: config.useLLM !== undefined ? config.useLLM : true,
      teamChatEnabled: config.teamChatEnabled !== undefined ? config.teamChatEnabled : true,
      maxMessageLength: config.maxMessageLength || 50,
    }
    this.teamMessages = []
  }
}
```

**配置选项**:
```typescript
export interface TeamAIConfig {
  useLLM: boolean              // 是否使用LLM
  teamChatEnabled: boolean     // 是否启用团队聊天
  maxMessageLength: number     // 消息最大长度
}
```

**主要方法**:

```typescript
// 选择出牌
async selectCards(
  cards: Card[], 
  lastPattern: CardPattern | null, 
  position: number
): Promise<TeamAIResult>

// 设置团队消息
setTeamMessages(messages: TeamMessage[]): void

// 添加团队消息
addTeamMessage(message: TeamMessage): void
```

**出牌流程**:
```typescript
async selectCards(cards: Card[], lastPattern: CardPattern | null, position: number): Promise<TeamAIResult> {
  // 1. 构建输入
  const hintInput = this.buildHintInput(cards, lastPattern, position)
  
  if (this.config.useLLM && hintInput) {
    try {
      // 2. 尝试LLM决策
      const llmResult = await this.reasonEngine.fetchLlmValidatedPlay(hintInput, ctx)
      
      if (llmResult) {
        // 3. 生成团队消息
        const message = await this.generateTeamMessage(llmResult.cards, cards, lastPattern, position)
        
        return {
          cards: llmCards,
          message,
          confidence: 'high',
          source: 'llm'
        }
      }
    } catch (error) {
      console.error('[team-ai] LLM 调用失败:', error)
    }
  }
  
  // 4. 回退到基础AI
  const selected = this.basicAI.selectCards(cards, lastPattern)
  const message = await this.generateTeamMessage(selected, cards, lastPattern, position)
  
  return {
    cards: selected,
    message,
    confidence: 'medium',
    source: 'basic-ai'
  }
}
```

**返回结果**:
```typescript
export interface TeamAIResult {
  cards: Card[]                              // 选择的卡牌
  message?: string                           // 团队消息
  confidence: 'low' | 'medium' | 'high'     // 置信度
  source: 'llm' | 'basic-ai'                // 来源
}
```

### 2. BasicAI - 基础AI

**职责**:
- 基于规则的出牌决策
- 快速响应
- 无需外部依赖

**类定义**:
```typescript
export class BasicAI {
  constructor(
    private game: GuandanGame,
    private difficulty: AIDifficulty
  ) {}
  
  selectCards(cards: Card[], lastPattern: CardPattern | null): Card[] {
    // 根据难度选择策略
    switch (this.difficulty) {
      case 'easy':
        return this.selectRandomCards(cards, lastPattern)
      case 'normal':
        return this.selectOptimizedCards(cards, lastPattern)
      case 'hard':
        return this.selectSmartCards(cards, lastPattern)
    }
  }
}
```

**出牌策略**:

#### 简单难度
```typescript
private selectRandomCards(cards: Card[], lastPattern: CardPattern | null): Card[] {
  // 随机选择能出的牌
  if (!lastPattern) {
    // 首家：随机出最小单张
    return [this.findSmallestCard(cards)]
  }
  
  // 跟牌：随机选择能压过的牌
  const validPlays = this.findAllValidPlays(cards, lastPattern)
  return validPlays[Math.floor(Math.random() * validPlays.length)]
}
```

#### 普通难度
```typescript
private selectOptimizedCards(cards: Card[], lastPattern: CardPattern | null): Card[] {
  // 优化策略：考虑牌型结构
  if (!lastPattern) {
    // 首家：优先出小牌，保留炸弹
    return this.findBestLead(cards)
  }
  
  // 跟牌：选择刚好能压过的牌
  return this.findMinimalWinningPlay(cards, lastPattern)
}
```

#### 困难难度
```typescript
private selectSmartCards(cards: Card[], lastPattern: CardPattern | null): Card[] {
  // 智能策略：考虑队友配合
  const teammatePosition = (this.position + 2) % 4
  const teammate = this.game.getState().players[teammatePosition]
  
  // 如果队友牌少，帮助队友
  if (teammate.cards.length <= 5) {
    return this.helpTeammate(cards, lastPattern)
  }
  
  // 正常策略
  return this.selectOptimizedCards(cards, lastPattern)
}
```

### 3. LLM AI (集成在TeamAI中)

**职责**:
- 使用大语言模型决策
- 生成团队消息
- 提供推理依据

**LLM调用流程**:
```typescript
// 1. 构建输入
const hintInput = {
  roomId: this.game.getState().roomId,
  handCards: cards,
  lastPlayedPattern: lastPattern,
  playedHistory: state.playedCards,
  context: {
    currentLevel: state.currentLevel,
    levelRank: state.levelRank,
    roundNumber: state.roundNumber,
    // ...
  },
  teamMessages: teamMsgStr
}

// 2. 调用LLM
const llmResult = await this.reasonEngine.fetchLlmValidatedPlay(hintInput, ctx)

// 3. 验证结果
if (llmResult && llmResult.action === 'play') {
  return llmResult.cards
}
```

## 团队消息生成

### 消息生成流程

```typescript
private async generateTeamMessage(
  selectedCards: Card[], 
  handCards: Card[], 
  lastPattern: CardPattern | null, 
  position: number
): Promise<string | undefined> {
  // 1. 检查是否启用团队聊天
  if (!this.config.teamChatEnabled) return undefined
  
  // 2. 检查是否有出牌
  if (selectedCards.length === 0) return undefined
  
  // 3. 构建提示词
  const prompt = this.buildMessagePrompt(selectedCards, handCards, lastPattern, position)
  
  try {
    // 4. 调用LLM生成消息
    const response = await this.reasonEngine.callLLMForMessage(prompt)
    
    // 5. 验证消息
    if (response && response.trim().length > 0 && response.trim().length <= this.config.maxMessageLength) {
      return response.trim()
    }
  } catch (error) {
    console.error('[team-ai] 消息生成失败:', error)
  }
  
  // 6. 回退到简单消息
  return this.generateSimpleMessage(selectedCards, lastPattern)
}
```

### 消息提示词

```typescript
private buildMessagePrompt(
  selectedCards: Card[], 
  handCards: Card[], 
  lastPattern: CardPattern | null, 
  position: number
): string {
  const cardStr = selectedCards.map(c => `${c.rank}${c.suit}`).join(', ')
  
  return `
你正在玩掼蛋游戏，位置${position + 1}。你刚选择打出: ${cardStr}。

请生成一条简短的团队提示消息（不超过20字），告诉队友你的意图或建议。
例如：
- "我有大牌，你放心出"
- "注意下家还有5张"
- "我帮你清小牌"
- "这把稳了"

只输出消息内容，不要其他解释。
  `
}
```

### 简单消息生成

```typescript
private generateSimpleMessage(selectedCards: Card[], lastPattern: CardPattern | null): string {
  const cardCount = selectedCards.length
  
  if (cardCount === 1) {
    return '出单张'
  } else if (cardCount === 2) {
    return '出对子'
  } else if (cardCount >= 4) {
    return '出炸弹'
  }
  
  return '出牌'
}
```

## AI难度配置

### 难度对比

| 特性 | 简单 | 普通 | 困难 |
|------|------|------|------|
| 出牌策略 | 随机 | 优化 | 智能 |
| LLM支持 | 否 | 否 | 是 |
| 团队配合 | 无 | 基础 | 高级 |
| 消息生成 | 无 | 无 | 有 |
| 响应速度 | 快 | 快 | 较慢 |

### 难度选择

```typescript
export type AIDifficulty = 'easy' | 'normal' | 'hard'

// 在创建房间时设置
socket.emit('create-room', {
  roomId: 'ROOM123',
  playerName: 'Player',
  aiDifficulty: 'hard',  // AI难度
  mode: 'local'
})
```

## AI决策逻辑

### 1. 首家出牌

```typescript
private findBestLead(cards: Card[]): Card[] {
  // 1. 分析手牌结构
  const structure = this.analyzeHandStructure(cards)
  
  // 2. 优先级：
  //    - 单张小牌
  //    - 对子小牌
  //    - 顺子
  //    - 保留炸弹和同花顺
  
  if (structure.singles.length > 0) {
    return [this.findSmallestCard(structure.singles)]
  }
  
  if (structure.pairs.length > 0) {
    return this.findSmallestPair(structure.pairs)
  }
  
  // ...
}
```

### 2. 跟牌策略

```typescript
private findMinimalWinningPlay(cards: Card[], lastPattern: CardPattern): Card[] {
  // 1. 找到所有能压过的牌型
  const validPlays = this.findAllValidPlays(cards, lastPattern)
  
  if (validPlays.length === 0) {
    return [] // 不出
  }
  
  // 2. 选择最小代价的牌
  return validPlays.sort((a, b) => {
    // 优先级：
    // 1. 不拆炸弹
    // 2. 不拆同花顺
    // 3. 选择最小牌力
    return this.calculateCost(a) - this.calculateCost(b)
  })[0]
}
```

### 3. 团队配合

```typescript
private helpTeammate(cards: Card[], lastPattern: CardPattern | null): Card[] {
  const state = this.game.getState()
  const teammatePosition = (this.position + 2) % 4
  const teammate = state.players[teammatePosition]
  
  // 如果队友牌少，帮助队友先出完
  if (teammate.cards.length <= 3) {
    // 出大牌帮队友清路
    return this.findBiggestPlay(cards, lastPattern)
  }
  
  // 如果队友牌多，自己先出小牌
  return this.findSmallestPlay(cards, lastPattern)
}
```

## 性能优化

### 1. 缓存机制

```typescript
private patternCache = new Map<string, CardPattern[]>()

private findAllValidPlays(cards: Card[], lastPattern: CardPattern): Card[][] {
  const key = `${cards.map(c => c.id).join(',')}_${lastPattern.type}_${lastPattern.mainValue}`
  
  if (this.patternCache.has(key)) {
    return this.patternCache.get(key)!
  }
  
  const plays = this.doFindAllValidPlays(cards, lastPattern)
  this.patternCache.set(key, plays)
  return plays
}
```

### 2. 超时控制

```typescript
async selectCards(cards: Card[], lastPattern: CardPattern | null, position: number): Promise<TeamAIResult> {
  const timeout = 5000 // 5秒超时
  
  try {
    const result = await Promise.race([
      this.doSelectCards(cards, lastPattern, position),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), timeout)
      )
    ])
    
    return result
  } catch (error) {
    // 超时回退到基础AI
    return this.fallbackToBasicAI(cards, lastPattern)
  }
}
```

### 3. 并发控制

```typescript
private static llmQueue: Array<() => Promise<any>> = []
private static isProcessing = false

static async enqueue<T>(task: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    this.llmQueue.push(async () => {
      try {
        const result = await task()
        resolve(result)
      } catch (error) {
        reject(error)
      }
    })
    
    this.processQueue()
  })
}

private static async processQueue() {
  if (this.isProcessing || this.llmQueue.length === 0) return
  
  this.isProcessing = true
  const task = this.llmQueue.shift()!
  
  try {
    await task()
  } finally {
    this.isProcessing = false
    this.processQueue()
  }
}
```

## 错误处理

### LLM调用失败

```typescript
try {
  const llmResult = await this.reasonEngine.fetchLlmValidatedPlay(hintInput, ctx)
  // ...
} catch (error) {
  console.error('[team-ai] LLM 调用失败:', error)
  
  // 回退到基础AI
  const selected = this.basicAI.selectCards(cards, lastPattern)
  return {
    cards: selected,
    confidence: 'low',
    source: 'basic-ai'
  }
}
```

### 验证失败

```typescript
const validated = validateLlmPlayRecommendation(
  parsed.action,
  parsed.cardIds,
  input.handCards,
  input.lastPlayedPattern,
  judgeCtx,
  input.context.lastPlayerIndex
)

if (!validated.ok) {
  console.warn('[team-ai] LLM 出牌建议未通过校验:', validated.reason)
  return null
}
```

## 测试

### 单元测试

```typescript
describe('TeamAI', () => {
  it('应该正确选择出牌', async () => {
    const game = new GuandanGame()
    const ai = new TeamAI(game, { useLLM: false })
    
    const cards = [
      { id: '1', rank: 'A', suit: 'hearts' },
      { id: '2', rank: 'K', suit: 'hearts' }
    ]
    
    const result = await ai.selectCards(cards, null, 0)
    
    expect(result.cards.length).toBeGreaterThan(0)
    expect(result.source).toBe('basic-ai')
  })
})
```

### 集成测试

```typescript
describe('AI Integration', () => {
  it('应该正确处理完整游戏', async () => {
    const game = new GuandanGame()
    game.addPlayer('p1', 'Player', 0)
    game.addPlayer('ai-1', 'AI', 1, true)
    // ...
    
    game.dealCards()
    
    // 模拟AI出牌
    const ai = new TeamAI(game)
    const result = await ai.selectCards(game.getState().players[1].cards, null, 1)
    
    expect(result.cards).toBeDefined()
  })
})
```

## 配置示例

### 基础配置

```typescript
const ai = new TeamAI(game, {
  useLLM: false,
  teamChatEnabled: false
})
```

### 完整配置

```typescript
const ai = new TeamAI(game, {
  useLLM: true,
  teamChatEnabled: true,
  maxMessageLength: 50
})
```

## 常见问题

### Q: AI出牌太慢？
A: 检查LLM配置，考虑关闭LLM或使用更快的模型

### Q: AI出牌不合理？
A: 检查难度设置，困难模式会更智能

### Q: 团队消息不生成？
A: 确保teamChatEnabled为true，且LLM配置正确
