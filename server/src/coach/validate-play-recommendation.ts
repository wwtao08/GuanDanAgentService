import { analyzePattern, canBeat, type JudgeContext } from '../game/judge.js'
import type { Card, CardPattern } from '../game/rules.js'
import { normalizeRecommended } from './coach-card-labels.js'

/**
 * 校验 LLM 返回的出牌建议是否可执行（牌在手、牌型合法、能压上家或首家）。
 * @param lastPlayerIndex 与游戏 state 一致：-1 表示本圈尚无人出牌，此时不可「不出」
 */
export function validateLlmPlayRecommendation(
  action: 'play' | 'pass',
  cardIds: string[],
  handCards: Card[],
  lastPlayedPattern: CardPattern | null,
  judgeCtx: JudgeContext,
  lastPlayerIndex: number,
): { ok: true; cards: Card[] } | { ok: false; reason: string } {
  const handById = new Map(handCards.map((c) => [c.id, c]))

  if (action === 'pass') {
    if (lastPlayerIndex === -1) {
      return { ok: false, reason: '首家领出不能不出' }
    }
    if (cardIds.length > 0) {
      return { ok: false, reason: 'pass 时 cardIds 须为空' }
    }
    return { ok: true, cards: [] }
  }

  const seen = new Set<string>()
  const picked: Card[] = []
  for (const id of cardIds) {
    if (seen.has(id)) return { ok: false, reason: '重复的牌 id' }
    seen.add(id)
    const c = handById.get(id)
    if (!c) return { ok: false, reason: '含有不在手牌中的 id' }
    picked.push(c)
  }

  if (picked.length === 0) {
    return { ok: false, reason: '出牌时须至少选一张' }
  }

  const pattern = analyzePattern(picked, judgeCtx)
  if (!pattern) {
    return { ok: false, reason: '所选牌不构成合法牌型' }
  }

  if (lastPlayerIndex !== -1 && lastPlayedPattern && !canBeat(pattern, lastPlayedPattern)) {
    return { ok: false, reason: '该牌型不足以压制当前上家' }
  }

  return { ok: true, cards: picked }
}

export function toCoachRecommendedFromCards(cards: Card[], judgeCtx: JudgeContext) {
  return normalizeRecommended(cards, judgeCtx)
}
