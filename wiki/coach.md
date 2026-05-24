# 教练模块 Wiki

## 概述

教练模块提供基于LLM的游戏指导功能，包括出牌建议、策略讲解和实时提示。

## 文件结构

```
server/src/coach/
├── coach-hint-service.ts      # 教练提示服务
├── reason-engine.ts           # 推理引擎
├── prompt-builder.ts          # 提示词构建
├── openai-stream.ts           # OpenAI流式调用
├── coach-knowledge-base.ts    # 知识库
├── coach-narration.ts         # 叙述生成
├── hand-context.ts            # 手牌上下文
├── fallback-reason.ts         # 回退推理
├── guandan-rules-prompt.ts    # 规则提示
├── coach-card-labels.ts       # 卡牌标签
├── validate-play-recommendation.ts # 出牌验证
└── types.ts                   # 类型定义
```

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    CoachHintService                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  1. 接收教练请求                                       │  │
│  │  2. 获取基础推荐                                       │  │
│  │  3. 调用推理引擎                                       │  │
│  │  4. 返回结果                                          │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    ReasonEngine                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  1. 构建系统提示词                                     │  │
│  │  2. 构建用户提示词                                     │  │
│  │  3. 调用LLM（流式/非流式）                            │  │
│  │  4. 解析响应                                          │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
┌───────▼────────┐           ┌────────▼────────┐
│ PromptBuilder  │           │  OpenAIStream   │
│  (提示词构建)  │           │   (API调用)     │
└────────────────┘           └─────────────────┘
```

## 核心类

### 1. CoachHintService - 教练提示服务

**职责**:
- 处理教练提示请求
- 协调推理引擎
- 管理提示流程

**类定义**:
```typescript
export class CoachHintService {
  private reasonEngine: ReasonEngine
  
  constructor() {
    this.reasonEngine = new ReasonEngine()
  }
  
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
      coachMode: input.coachMode,
      teamMessages: input.teamMessages
    })
    
    return {
      recommended,
      reason: reason.text,
      confidence: reason.confidence
    }
  }
}
```

### 2. ReasonEngine - 推理引擎

**职责**:
- 构建提示词
- 调用LLM API
- 解析响应结果

**类定义**:
```typescript
export class ReasonEngine {
  async generateReason(params: GenerateCoachReasonParams): Promise<ReasonResult> {
    const { coachMode = 'beginner' } = params
    
    // 选择输出格式
    const useStream = true
    const outputFormat = useStream ? 'stream_plain' : 'json'
    
    // 构建提示词
    const systemPrompt = buildCoachSystemPrompt({ coachMode, outputFormat })
    const userPrompt = buildCoachUserPrompt({
      handCards: params.handCards,
      lastPlayedPattern: params.lastPlayedPattern,
      playedHistory: params.playedHistory,
      recommended: params.recommended,
      context: params.context,
      coachMode,
      outputFormat,
      varietySeed: randomInt(1, 0x7fffffff),
      teamMessages: params.teamMessages
    })
    
    // 调用LLM
    if (useStream) {
      return this.invokeLlmStream(params, systemPrompt, userPrompt)
    } else {
      return this.invokeLlmNonStream(params)
    }
  }
  
  async fetchLlmValidatedPlay(
    input: BuildCoachHintInput,
    judgeCtx: JudgeContext
  ): Promise<{ action: 'play', cards: Card[] } | { action: 'pass' } | null> {
    // 构建出牌建议提示词
    const sys = buildCoachPlayRecommendationSystemPrompt()
    const user = buildCoachPlayRecommendationUserPrompt({
      handCards: input.handCards,
      lastPlayedPattern: input.lastPlayedPattern,
      playedHistory: input.playedHistory,
      context: input.context,
      teamMessages: input.teamMessages
    })
    
    // 调用LLM
    const res = await callOpenAIPlayRecommendation(sys, user, timeoutMs)
    
    // 解析响应
    const parsed = safeParsePlayRecommendationJson(content)
    
    // 验证出牌
    const validated = validateLlmPlayRecommendation(
      parsed.action,
      parsed.cardIds,
      input.handCards,
      input.lastPlayedPattern,
      judgeCtx,
      input.context.lastPlayerIndex
    )
    
    return validated.ok ? { action: validated.action, cards: validated.cards } : null
  }
}
```

### 3. PromptBuilder - 提示词构建

**职责**:
- 构建系统提示词
- 构建用户提示词
- 格式化游戏信息

**系统提示词**:
```typescript
export function buildCoachSystemPrompt(options: {
  coachMode: CoachHintMode
  outputFormat: CoachPromptOutputFormat
}): string {
  const { coachMode, outputFormat } = options
  
  const modeBlock = coachMode === 'expert'
    ? [
        '【讲解模式：高手】',
        '· 总字数控制在约 90～120 字（中文）；1～3 句即可。',
        '· 只写：关键矛盾或压力点 + 为何这步推荐合理 + 一句风险；禁止铺垫、重复、排比。',
      ]
    : [
        '【讲解模式：新手】',
        '· 总字数控制在约 200～260 字（中文）；约 3～5 句，一段说完。',
        '· 简要交代局面压力 + 推荐依据 + 主要风险即可；不写长段落、不展开多种分支。',
      ]
  
  return [
    '身份：你是坐在牌桌旁教玩家打牌的「掼蛋教练」，不是玩家本人。',
    '· 对学员用第二人称「你」给建议（例如「建议你…」「你这手可以…」）。',
    '· 描述牌桌、对手、队友时用第三人称（本家、对家、上家、下家、敌方等）。',
    '',
    ...modeBlock,
    '',
    GUANDAN_TERMINOLOGY_BLOCK,
  ].join('\n')
}
```

**用户提示词**:
```typescript
export function buildCoachUserPrompt(params: {
  handCards: Card[]
  lastPlayedPattern: any
  playedHistory: Array<{ pattern, cards, position }>
  recommended: CoachRecommended
  context: CoachGameContext
  coachMode: CoachHintMode
  outputFormat: CoachPromptOutputFormat
  varietySeed: number
  teamMessages?: string
}): string {
  return [
    '—— 公开局势 ——',
    `当前打「${context.currentLevel}」；级牌为：${context.levelRank}`,
    `各座位剩余张数：${seatsLine}`,
    `队友与压力：${partnerThreat}`,
    '',
    '—— 本圈出牌 ——',
    historyLines,
    '',
    ...(teamMessages ? [
      '—— 团队交流 ——',
      teamMessages,
      ''
    ] : []),
    '—— 我方手牌 ——',
    `列表：${handList}`,
    `结构摘要：${handStruct}`,
    '',
    '—— 推荐动作 ——',
    rec,
    '',
    '—— 任务 ——',
    '请解读推荐动作，给出策略讲解。',
  ].join('\n')
}
```

## 教练模式

### 1. 新手模式 (beginner)

**特点**:
- 讲解详细
- 字数200-260字
- 包含基础策略

**示例输出**:
```
你这手牌整体牌力不错，有炸弹和同花顺。当前上家出了对K，
你手上有对A可以压过。建议出对A，因为：
1. 对A是最大对子，能稳拿本轮
2. 保留炸弹应对后续
3. 帮助队友减轻压力

风险：如果下家有炸弹，可能会反压，需要观察对手反应。
```

### 2. 高手模式 (expert)

**特点**:
- 讲解简洁
- 字数90-120字
- 直击要点

**示例输出**:
```
上家对K，你有对A可压。建议出对A稳拿本轮，保留炸弹后续发力。
队友剩5张，需尽快帮其清牌。风险：下家可能有炸弹反压。
```

## 流式输出

### 流式响应处理

```typescript
async invokeLlmStream(
  params: GenerateCoachReasonParams,
  onDelta: (text: string) => void
): Promise<ReasonResult> {
  const systemPrompt = buildCoachSystemPrompt({ coachMode, outputFormat: 'stream_plain' })
  const userPrompt = buildCoachUserPrompt({ ...params, outputFormat: 'stream_plain' })
  
  const res = await callOpenAIChatStreamResponse(systemPrompt, userPrompt, timeoutMs, maxTokens)
  
  // 处理SSE流
  const full = await consumeOpenAIChatSse(res, onDelta)
  
  return {
    text: full,
    confidence: 'high'
  }
}
```

### Socket事件流

```typescript
// 服务端
socket.emit('coach-hint-stream-start', {
  requestId,
  recommended: { action: 'play', cards: [...], patternType: 'pair' }
})

// 流式发送
for (const chunk of reasonChunks) {
  socket.emit('coach-hint-stream-chunk', {
    requestId,
    text: chunk
  })
}

// 客户端
socket.on('coach-hint-stream-start', (data) => {
  store.setCoachHintRecommended(data.recommended)
})

socket.on('coach-hint-stream-chunk', (data) => {
  store.appendCoachHintReason(data.text)
})
```

## 知识库

### 掼蛋术语

```typescript
export const GUANDAN_TERMINOLOGY_BLOCK = `
—— 掼蛋术语 ——
· 本家：自己
· 对家：队友（对面座位）
· 上家：右手边玩家
· 下家：左手边玩家
· 级牌：当前打几，几就是级牌（逢人配）
· 炸弹：4张及以上相同点数
· 同花顺：同花色的顺子
· 四王：4张王（最大牌型）
· 双下：队友两人一二游
· 头游：第一个出完牌
`
```

### 顺口溜

```typescript
export const PROVERB_BLOCK = `
—— 掼蛋口诀 ——
· 有炸不着急，看准再出牌
· 小牌先出手，大牌留后头
· 队友配合好，胜算自然高
· 看清对手牌，决策不慌张
`
```

## 出牌验证

### 验证逻辑

```typescript
export function validateLlmPlayRecommendation(
  action: 'play' | 'pass',
  cardIds: string[],
  handCards: Card[],
  lastPattern: CardPattern | null,
  judgeCtx: JudgeContext,
  lastPlayerIndex: number
): ValidationResult {
  // 1. 验证不出
  if (action === 'pass') {
    if (lastPlayerIndex === -1) {
      return { ok: false, reason: '首家不能不出' }
    }
    return { ok: true, action: 'pass', cards: [] }
  }
  
  // 2. 验证卡牌存在
  const cards = cardIds.map(id => handCards.find(c => c.id === id)).filter(Boolean)
  if (cards.length !== cardIds.length) {
    return { ok: false, reason: '卡牌不在手中' }
  }
  
  // 3. 验证牌型
  const pattern = judgeCtx.identifyPattern(cards)
  if (!pattern) {
    return { ok: false, reason: '无效牌型' }
  }
  
  // 4. 验证能否压过
  if (lastPattern && !judgeCtx.canBeat(pattern, lastPattern)) {
    return { ok: false, reason: '牌力不够' }
  }
  
  return { ok: true, action: 'play', cards }
}
```

## 上下文构建

### 手牌上下文

```typescript
export function buildHandStructureSummary(cards: Card[], levelRank: CardRank): string {
  const counts = new Map<CardRank, number>()
  cards.forEach(c => counts.set(c.rank, (counts.get(c.rank) || 0) + 1))
  
  const singles = [...counts.entries()].filter(([_, n]) => n === 1).length
  const pairs = [...counts.entries()].filter(([_, n]) => n === 2).length
  const triples = [...counts.entries()].filter(([_, n]) => n === 3).length
  const bombs = [...counts.entries()].filter(([_, n]) => n >= 4).length
  
  return `单张${singles}张，对子${pairs}对，三张${triples}组，炸弹${bombs}个`
}
```

### 局势上下文

```typescript
export function buildPartnerAndThreatLine(
  seats: SeatInfo[],
  myPosition: number
): string {
  const teammatePosition = (myPosition + 2) % 4
  const teammate = seats[teammatePosition]
  const opponents = seats.filter((_, i) => i !== myPosition && i !== teammatePosition)
  
  return [
    `队友（对家）剩 ${teammate.remainingCards} 张`,
    `对手剩 ${opponents.map(o => o.remainingCards).join('/')} 张`
  ].join('；')
}
```

## 配置

### 环境变量

```env
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.openai.com/v1
COACH_MODEL=gpt-4
COACH_TIMEOUT_MS=30000
```

### 游戏配置

```typescript
export const gameConfig = {
  server: {
    coachReasonTimeoutMs: 30000,
    coachUseLlm: true,
    coachModel: 'gpt-4',
  }
}
```

## 错误处理

### 超时处理

```typescript
const timeoutMs = gameConfig.server.coachReasonTimeoutMs

const res = await Promise.race([
  callOpenAIChat(systemPrompt, userPrompt, timeoutMs, maxTokens),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout')), timeoutMs)
  )
])
```

### API错误

```typescript
if (!res.ok) {
  console.warn(`[coach] LLM HTTP ${res.status}: ${raw.slice(0, 400)}`)
  
  // 回退到规则引擎
  return this.generateFallbackReason(params)
}
```

### 解析错误

```typescript
try {
  const parsed = JSON.parse(content)
  return parsed
} catch {
  // 尝试提取JSON
  const match = content.match(/\{[\s\S]*\}/)
  if (match) {
    return JSON.parse(match[0])
  }
  
  // 使用纯文本
  return { reason: content }
}
```

## 性能优化

### 1. 提示词压缩

```typescript
// 移除不必要的空格和换行
const compressed = prompt
  .replace(/\n{3,}/g, '\n\n')
  .replace(/ {2,}/g, ' ')
```

### 2. 缓存机制

```typescript
private promptCache = new Map<string, string>()

buildUserPrompt(params: any): string {
  const key = this.hashParams(params)
  
  if (this.promptCache.has(key)) {
    return this.promptCache.get(key)!
  }
  
  const prompt = this.doBuildUserPrompt(params)
  this.promptCache.set(key, prompt)
  return prompt
}
```

### 3. 并发控制

```typescript
private static queue: Array<() => Promise<any>> = []
private static concurrent = 0
private static maxConcurrent = 3

static async enqueue<T>(task: () => Promise<T>): Promise<T> {
  while (this.concurrent >= this.maxConcurrent) {
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  this.concurrent++
  try {
    return await task()
  } finally {
    this.concurrent--
  }
}
```

## 测试

### 单元测试

```typescript
describe('ReasonEngine', () => {
  it('应该生成正确的推理', async () => {
    const engine = new ReasonEngine()
    const result = await engine.generateReason({
      recommended: { action: 'play', cards: ['A'], patternType: 'single' },
      handCards: [...],
      context: {...},
      coachMode: 'beginner'
    })
    
    expect(result.text).toBeDefined()
    expect(result.text.length).toBeGreaterThan(50)
  })
})
```

### 集成测试

```typescript
describe('Coach Integration', () => {
  it('应该正确处理完整请求', async () => {
    const service = new CoachHintService()
    const result = await service.generateHint({
      handCards: [...],
      lastPlayedPattern: {...},
      context: {...}
    })
    
    expect(result.recommended).toBeDefined()
    expect(result.reason).toBeDefined()
  })
})
```

## 常见问题

### Q: 教练提示太慢？
A: 检查网络连接，考虑使用更快的模型或增加超时时间

### Q: 提示内容不合理？
A: 检查提示词模板，确保游戏状态正确传递

### Q: 流式输出中断？
A: 检查Socket连接，确保客户端正确处理流事件
