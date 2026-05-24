# 游戏核心模块 Wiki

## 概述

游戏核心模块实现了完整的掼蛋游戏规则，包括发牌、出牌、牌型判断、升级、进贡等核心逻辑。

## 文件结构

```
server/src/game/
├── game.ts      # 游戏引擎主类
├── rules.ts     # 游戏规则定义
└── judge.ts     # 牌型判断器
```

## 核心类

### 1. GuandanGame - 游戏引擎

**职责**:
- 管理游戏状态
- 处理玩家操作
- 控制游戏流程

**类定义**:
```typescript
export class GuandanGame {
  private state: GameState
  private judge: Judge
  
  constructor() {
    this.state = this.initGameState()
    this.judge = new Judge()
  }
}
```

**主要方法**:

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| addPlayer | id, name, position, isAI | Player | 添加玩家 |
| removePlayer | playerId | boolean | 移除玩家 |
| dealCards | - | void | 发牌 |
| playCards | playerId, cards | PlayResult | 出牌 |
| pass | playerId | PassResult | 不出 |
| getState | - | GameState | 获取游戏状态 |
| getPlayer | playerId | Player \| undefined | 获取玩家 |
| getJudgeContext | - | JudgeContext | 获取判断上下文 |

### 2. Judge - 牌型判断器

**职责**:
- 识别牌型
- 比较牌力
- 验证出牌合法性

**类定义**:
```typescript
export class Judge {
  identifyPattern(cards: Card[], levelRank: CardRank): CardPattern | null
  canBeat(pattern: CardPattern, lastPattern: CardPattern): boolean
  isValidPlay(cards: Card[], handCards: Card[], lastPattern: CardPattern | null, levelRank: CardRank): boolean
}
```

### 3. Rules - 游戏规则

**职责**:
- 定义卡牌类型
- 定义牌型规则
- 提供规则工具函数

## 数据结构

### Card - 卡牌

```typescript
export interface Card {
  id: string          // 唯一标识，如 "hearts-A-1"
  rank: CardRank      // 点数
  suit: Suit          // 花色
}

export type CardRank = 
  | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' 
  | 'J' | 'Q' | 'K' | 'A' 
  | 'SJ'  // 小王
  | 'BJ'  // 大王

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
```

### Player - 玩家

```typescript
export interface Player {
  id: string              // 玩家ID
  name: string            // 玩家名称
  position: number        // 座位位置 0-3
  cards: Card[]           // 手牌
  isAI: boolean           // 是否AI
  level: number           // 当前级别
  finished: boolean       // 是否已出完
  finishOrder: number     // 出完顺序
}
```

### GameState - 游戏状态

```typescript
export interface GameState {
  status: GameStatus                    // 游戏状态
  players: Player[]                     // 玩家列表
  currentPlayerIndex: number            // 当前玩家索引
  currentLevel: number                  // 当前打几
  levelRank: CardRank                   // 级牌点数
  roundNumber: number                   // 第几副
  lastPlayedPattern: CardPattern | null // 上一手牌型
  lastPlayerIndex: number               // 上家索引
  playedCards: PlayedCard[]             // 已出牌历史
  roundFinishOrder: number[]            // 本副出完顺序
  roomId: string                        // 房间ID
}

export type GameStatus = 
  | 'waiting'      // 等待开始
  | 'playing'      // 游戏中
  | 'tribute'      // 进贡阶段
  | 'game_over'    // 游戏结束
```

### CardPattern - 牌型

```typescript
export interface CardPattern {
  type: PatternType       // 牌型类型
  cards: Card[]           // 卡牌列表
  mainValue: number       // 主牌力值
  length?: number         // 顺子长度
  count?: number          // 数量（如三带二的三张数量）
}

export type PatternType = 
  | 'single'              // 单张
  | 'pair'                // 对子
  | 'triple'              // 三张
  | 'triple_with_pair'    // 三带二
  | 'straight'            // 顺子
  | 'straight_flush'      // 同花顺
  | 'bomb'                // 炸弹
  | 'rocket'              // 四王
  | 'full_house'          // 葫芦
  | 'pair_straight'       // 连对
  | 'triple_straight'     // 飞机
```

## 游戏流程

### 1. 初始化

```typescript
const game = new GuandanGame()

// 添加玩家
game.addPlayer('player1', '张三', 0, false)
game.addPlayer('ai-1', 'AI-1', 1, true)
game.addPlayer('player2', '李四', 2, false)
game.addPlayer('ai-2', 'AI-2', 3, true)

// 发牌
game.dealCards()
```

### 2. 出牌流程

```typescript
// 玩家出牌
const result = game.playCards('player1', [
  { id: 'hearts-A-1', rank: 'A', suit: 'hearts' }
])

if (result.success) {
  // 出牌成功
  console.log('当前玩家:', result.state.currentPlayerIndex)
  
  // 检查是否一轮结束
  if (result.roundFinished) {
    console.log('本轮结束')
  }
  
  // 检查是否游戏结束
  if (result.gameOver) {
    console.log('游戏结束')
  }
}
```

### 3. 不出流程

```typescript
const result = game.pass('player1')

if (result.success) {
  console.log('过牌成功')
}
```

## 牌型判断

### 牌型识别

```typescript
const judge = new Judge()

// 识别单张
const single = judge.identifyPattern([card1], '2')
// { type: 'single', cards: [card1], mainValue: 12 }

// 识别对子
const pair = judge.identifyPattern([card1, card2], '2')
// { type: 'pair', cards: [card1, card2], mainValue: 12 }

// 识别炸弹
const bomb = judge.identifyPattern([card1, card2, card3, card4], '2')
// { type: 'bomb', cards: [...], mainValue: 12 }

// 识别顺子
const straight = judge.identifyPattern([card1, card2, card3, card4, card5], '2')
// { type: 'straight', cards: [...], mainValue: 10, length: 5 }
```

### 牌力比较

```typescript
// 比较两个牌型
const canBeat = judge.canBeat(pattern1, pattern2)

// 规则：
// 1. 相同牌型，比较mainValue
// 2. 炸弹可以压任何非炸弹牌型
// 3. 四王（rocket）最大
// 4. 同花顺 > 炸弹
```

### 出牌验证

```typescript
const isValid = judge.isValidPlay(
  cards,           // 要出的牌
  handCards,       // 手牌
  lastPattern,     // 上家牌型
  levelRank        // 级牌
)

// 验证规则：
// 1. 卡牌必须在手牌中
// 2. 牌型必须合法
// 3. 必须能压过上家（如果有）
```

## 游戏规则

### 1. 发牌规则

- 使用两副牌（108张）
- 每人27张
- 随机发牌

```typescript
dealCards(): void {
  const allCards = this.createDeck()
  this.shuffle(allCards)
  
  const cardsPerPlayer = 27
  this.state.players.forEach((player, index) => {
    player.cards = allCards.slice(
      index * cardsPerPlayer,
      (index + 1) * cardsPerPlayer
    )
  })
}
```

### 2. 出牌规则

- 必须轮到自己
- 牌型必须合法
- 必须能压过上家（如果有）
- 首家可以出任意合法牌型

### 3. 升级规则

```typescript
calculateLevelUp(winnerTeam: number[], loserTeam: number[]): number {
  // 双下（队友一二游）：升3级
  if (winnerTeam[0] === 0 && winnerTeam[1] === 1) return 3
  
  // 头游+三游：升2级
  if (winnerTeam[0] === 0 && winnerTeam[1] === 2) return 2
  
  // 头游+末游：升1级
  if (winnerTeam[0] === 0 && winnerTeam[1] === 3) return 1
  
  return 0
}
```

### 4. 进贡规则

```typescript
// 进贡阶段
handleTribute(): void {
  // 下游给上游最大牌
  // 上游还2-10的牌
  // 双下各进贡一张
}
```

### 5. 级牌规则

- 级牌（逢人配）可以当作任意牌使用
- 当前打几，几就是级牌
- 例如：打2，则所有2都是级牌

```typescript
getCardValue(rank: CardRank, levelRank: CardRank): number {
  // 级牌值最大
  if (rank === levelRank) return 15
  
  // 其他按正常值
  const values = { '2': 2, '3': 3, ..., 'A': 14, 'SJ': 16, 'BJ': 17 }
  return values[rank]
}
```

## 牌型详解

### 1. 单张

```typescript
// 任意一张牌
{ type: 'single', cards: [card], mainValue: cardValue }
```

### 2. 对子

```typescript
// 两张相同点数的牌
{ type: 'pair', cards: [card1, card2], mainValue: cardValue }
```

### 3. 三张

```typescript
// 三张相同点数的牌
{ type: 'triple', cards: [card1, card2, card3], mainValue: cardValue }
```

### 4. 三带二

```typescript
// 三张相同点数 + 一对
{ type: 'triple_with_pair', cards: [...], mainValue: tripleValue }
```

### 5. 顺子

```typescript
// 5张以上连续点数的牌
{ type: 'straight', cards: [...], mainValue: maxValue, length: 5 }
// 注意：2和王不能在顺子中
```

### 6. 同花顺

```typescript
// 同花色的顺子
{ type: 'straight_flush', cards: [...], mainValue: maxValue, length: 5 }
// 同花顺 > 炸弹
```

### 7. 炸弹

```typescript
// 4张以上相同点数的牌
{ type: 'bomb', cards: [...], mainValue: cardValue, count: 4 }
// 6张炸弹 > 5张炸弹 > 4张炸弹
```

### 8. 四王（火箭）

```typescript
// 4张王（2大王+2小王）
{ type: 'rocket', cards: [...], mainValue: 100 }
// 最大牌型
```

### 9. 葫芦

```typescript
// 三张 + 一对
{ type: 'full_house', cards: [...], mainValue: tripleValue }
```

### 10. 连对

```typescript
// 3对以上连续的对子
{ type: 'pair_straight', cards: [...], mainValue: maxValue, length: 3 }
```

### 11. 飞机

```typescript
// 2组以上连续的三张
{ type: 'triple_straight', cards: [...], mainValue: maxValue, length: 2 }
```

## 工具函数

### 卡牌排序

```typescript
sortCards(cards: Card[], levelRank: CardRank): Card[] {
  return cards.sort((a, b) => {
    const valueA = getCardValue(a.rank, levelRank)
    const valueB = getCardValue(b.rank, levelRank)
    return valueB - valueA
  })
}
```

### 获取牌力值

```typescript
getCardValue(rank: CardRank, levelRank: CardRank): number {
  if (rank === levelRank) return 15  // 级牌
  
  const values: Record<CardRank, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14,
    'SJ': 16, 'BJ': 17
  }
  
  return values[rank]
}
```

### 判断是否为级牌

```typescript
isLevelCard(card: Card, levelRank: CardRank): boolean {
  return card.rank === levelRank
}
```

## 状态管理

### 状态更新

```typescript
private updateState(updates: Partial<GameState>): void {
  this.state = { ...this.state, ...updates }
}
```

### 状态验证

```typescript
private validateState(): boolean {
  // 检查玩家数量
  if (this.state.players.length !== 4) return false
  
  // 检查当前玩家索引
  if (this.state.currentPlayerIndex < 0 || this.state.currentPlayerIndex > 3) return false
  
  return true
}
```

## 错误处理

### 出牌错误

```typescript
playCards(playerId: string, cards: Card[]): PlayResult {
  try {
    // 验证玩家
    const player = this.getPlayer(playerId)
    if (!player) {
      return { success: false, error: '玩家不存在' }
    }
    
    // 验证轮次
    if (this.state.currentPlayerIndex !== player.position) {
      return { success: false, error: '不是你的回合' }
    }
    
    // 验证卡牌
    if (!this.validateCards(cards, player.cards)) {
      return { success: false, error: '卡牌不在手中' }
    }
    
    // 验证牌型
    const pattern = this.judge.identifyPattern(cards, this.state.levelRank)
    if (!pattern) {
      return { success: false, error: '无效牌型' }
    }
    
    // 验证能否压过
    if (this.state.lastPlayedPattern && !this.judge.canBeat(pattern, this.state.lastPlayedPattern)) {
      return { success: false, error: '牌力不够' }
    }
    
    // 执行出牌
    return this.executePlay(player, cards, pattern)
    
  } catch (error) {
    console.error('出牌错误:', error)
    return { success: false, error: '出牌失败' }
  }
}
```

## 测试用例

### 牌型识别测试

```typescript
describe('Judge', () => {
  it('应该正确识别单张', () => {
    const cards = [{ id: '1', rank: 'A', suit: 'hearts' }]
    const pattern = judge.identifyPattern(cards, '2')
    expect(pattern.type).toBe('single')
    expect(pattern.mainValue).toBe(14)
  })
  
  it('应该正确识别炸弹', () => {
    const cards = [
      { id: '1', rank: 'K', suit: 'hearts' },
      { id: '2', rank: 'K', suit: 'diamonds' },
      { id: '3', rank: 'K', suit: 'clubs' },
      { id: '4', rank: 'K', suit: 'spades' }
    ]
    const pattern = judge.identifyPattern(cards, '2')
    expect(pattern.type).toBe('bomb')
  })
})
```

### 游戏流程测试

```typescript
describe('GuandanGame', () => {
  it('应该正确发牌', () => {
    const game = new GuandanGame()
    game.addPlayer('p1', 'Player 1', 0)
    game.addPlayer('p2', 'Player 2', 1)
    game.addPlayer('p3', 'Player 3', 2)
    game.addPlayer('p4', 'Player 4', 3)
    game.dealCards()
    
    game.getState().players.forEach(player => {
      expect(player.cards.length).toBe(27)
    })
  })
})
```

## 性能优化

### 1. 牌型缓存

```typescript
private patternCache = new Map<string, CardPattern>()

identifyPattern(cards: Card[], levelRank: CardRank): CardPattern | null {
  const key = cards.map(c => c.id).sort().join(',')
  
  if (this.patternCache.has(key)) {
    return this.patternCache.get(key)!
  }
  
  const pattern = this.doIdentifyPattern(cards, levelRank)
  this.patternCache.set(key, pattern)
  return pattern
}
```

### 2. 状态快照

```typescript
getStateSnapshot(): GameState {
  return JSON.parse(JSON.stringify(this.state))
}
```

## 常见问题

### Q: 级牌如何处理？
A: 级牌在判断时会被赋予最高值，可以当作任意牌使用

### Q: 如何判断游戏结束？
A: 当一方两个玩家都出完牌时，游戏结束

### Q: 进贡规则如何实现？
A: 在tribute状态下，下游玩家选择最大牌进贡，上游还牌
