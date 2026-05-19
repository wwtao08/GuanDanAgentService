import type { Card } from '../game/rules.js'
import type { CoachGameContext, CoachRecommended } from './types.js'
import { describePlayColloquially, describePressureFromLastPlay } from './coach-narration.js'
import { buildPartnerAndThreatLine, buildRoundFinishLine, relSeatLabel, type SeatPublicInfo } from './hand-context.js'

/** 口语化一手牌（「出了一对红桃十…」）；供外部或兜底文案复用 */
export function describeFacingPattern(pattern: any): string {
  if (!pattern) return '首轮可任意合法领出'
  return describePlayColloquially(pattern)
}

function describeLastPlayShort(my: number, lastPlayerIndex: number, pattern: any): string {
  if (!pattern || lastPlayerIndex < 0) return '本轮由你领出'
  return `${relSeatLabel(my, lastPlayerIndex)}${describePlayColloquially(pattern)}`
}

function hasHighValueCards(cards: Card[]): boolean {
  return cards.some((c) => c.value >= 15)
}

/** 与局面绑定的伪随机种子，同局面稳定、不同局面可区分 */
function coachSeed(handCards: Card[], context: CoachGameContext, action: 'play' | 'pass'): number {
  let h = 0
  for (const c of handCards) {
    for (let i = 0; i < c.id.length; i++) h = (h * 31 + c.id.charCodeAt(i)) >>> 0
  }
  h ^= context.roundNumber * 1009
  h ^= context.myPosition * 17
  h ^= context.currentPlayerIndex * 13
  h ^= context.lastPlayerIndex * 7
  h ^= action === 'pass' ? 1 : 0
  return h >>> 0
}

function nextSeed(s: number): number {
  return Math.imul(s, 1664525) + 1013904223
}

function pickFrom<T>(arr: T[], seed: number): { item: T; next: number } {
  if (!arr.length) throw new Error('empty pool')
  const idx = seed % arr.length
  return { item: arr[idx], next: nextSeed(seed) >>> 0 }
}

function enemyLowSeats(seats: SeatPublicInfo[], my: number): SeatPublicInfo[] {
  const partner = (my + 2) % 4
  return seats.filter((s) => s.position !== my && s.position !== partner && s.remainingCards > 0 && s.remainingCards <= 6)
}

function partnerSeat(seats: SeatPublicInfo[], my: number): SeatPublicInfo | undefined {
  return seats.find((s) => s.position === (my + 2) % 4)
}

/**
 * 供 LLM 阅读的「算法侧启发要点」：多组可轮换表述，与 BasicAI 推荐方向一致，但**不是**最终文案。
 * 模型应据此用自己的话结合手牌/本圈历史展开，禁止照抄句式。
 */
export function buildCoachReferenceNotes(params: {
  recommended: CoachRecommended
  lastPlayedPattern: any
  handCards: Card[]
  context: CoachGameContext
}): string {
  const { recommended, lastPlayedPattern, handCards, context } = params
  const seats = context.seats.map((s) => ({
    position: s.position,
    name: s.name,
    remainingCards: s.remainingCards,
    isAI: s.isAI,
  }))
  const my = context.myPosition
  const finish = buildRoundFinishLine(context.roundFinishOrder, my)
  const partnerLine = buildPartnerAndThreatLine(seats, my)

  const lines: string[] = [
    `· 与算法推荐一致：${recommended.action === 'pass' ? '本步倾向「过」' : `本步倾向打出「${recommended.patternType || '推荐牌型'}」`}。`,
    `· 上一手：${describePressureFromLastPlay(my, context.lastPlayerIndex, lastPlayedPattern)}`,
    `· 公开节奏：${finish}；${partnerLine}`,
  ]

  const lowEnemies = enemyLowSeats(seats, my)
  if (lowEnemies.length) {
    lines.push(
      `· 终局信号：${lowEnemies.map((s) => `${relSeatLabel(my, s.position)}剩 ${s.remainingCards} 张`).join('、')}，控制与送牌权重上升。`,
    )
  }

  const ps = partnerSeat(seats, my)
  if (ps && ps.remainingCards > 0 && ps.remainingCards <= 8) {
    lines.push(`· 队友（对家）剩 ${ps.remainingCards} 张，可考虑是否让路或配合走牌。`)
  }

  if (context.lastPlayerIndex >= 0 && context.lastPlayerIndex === (my + 2) % 4) {
    lines.push(`· 本圈当前最大在队友一侧，「过」有时能保留火力或让队友继续控圈。`)
  }

  return lines.join('\n')
}

export interface BuildFallbackReasonParams {
  recommended: CoachRecommended
  lastPlayedPattern: any
  handCards: Card[]
  context: CoachGameContext
}

/**
 * 无 LLM 或接口失败时的兜底文案：与 `buildCoachReferenceNotes` 同源启发逻辑，多组轮换，避免千篇一律。
 */
export function buildFallbackReason(params: BuildFallbackReasonParams): string {
  const { recommended, lastPlayedPattern, handCards, context } = params
  const seed = coachSeed(handCards, context, recommended.action === 'pass' ? 'pass' : 'play')
  let s = seed
  const lastPlayShort = describeLastPlayShort(context.myPosition, context.lastPlayerIndex, lastPlayedPattern)

  if (recommended.action === 'pass') {
    const reserve = hasHighValueCards(handCards)
    const a = pickFrom(
      [
        '此时硬顶可能性价比不高',
        '跟牌收益有限',
        '不必强行消耗关键张',
      ],
      s,
    )
    s = a.next
    const b = pickFrom(
      [
        reserve ? '手牌里仍有 2/王级等强点，可留到更关键一圈' : '可观察一圈队友与下家反应',
        reserve ? '保留大牌与炸弹的弹性' : '避免在信息不足时轻易拆结构',
        '让队友有机会接牌或控圈',
      ],
      s,
    )
    s = b.next
    const c = pickFrom(
      [
        '若本圈最大已在己方，过牌也合理。',
        '结合敌方低张提示，控制节奏有时比顶牌更重要。',
        '后续再根据手牌结构决定是否抢权。',
      ],
      s,
    )
    return `${lastPlayShort}，算法建议先「过」：${a.item}，${b.item}；${c.item}。`
  }

  if (!lastPlayedPattern) {
    const b = pickFrom(
      [
        '同时留意别一次性拆光后续依赖的搭子',
        '若敌方已报少张，需评估是否仍值得继续施压',
        '可与队友张数配合，争取本副升级节奏',
      ],
      seed,
    )
    const pattern = recommended.patternType || '推荐牌型'
    return `本轮由你领出，这手${pattern}意在抢回节奏。${b.item}。`
  }

  const pattern = recommended.patternType || '推荐牌型'
  const a = pickFrom(
    [
      `用 ${pattern} 应对可夺回主动权`,
      `这一手 ${pattern} 意在顶住上家压力`,
      `打出 ${pattern} 有助于重新掌握出牌节奏`,
    ],
    s,
  )
  s = a.next
  const b = pickFrom(
    [
      '同时留意别一次性拆光后续依赖的搭子',
      '若敌方已报少张，需评估是否仍值得继续施压',
      '可与队友张数配合，争取本副升级节奏',
    ],
    s,
  )
  return `${a.item}（要压过：${lastPlayShort}）。${b.item}。`
}
