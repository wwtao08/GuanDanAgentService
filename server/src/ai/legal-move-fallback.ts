import { analyzePattern, canBeat, type JudgeContext } from '../game/judge.js'
import type { Card, CardPattern } from '../game/rules.js'

/** 组合 C(n,k)，用于穷举合法牌型（有迭代上限） */
function* combinations<T>(arr: T[], k: number): Generator<T[]> {
  if (k < 0 || k > arr.length) return
  if (k === 0) {
    yield []
    return
  }
  const [head, ...tail] = arr
  for (const c of combinations(tail, k - 1)) {
    yield [head, ...c]
  }
  yield* combinations(tail, k)
}

const MAX_COMBO_SIZE = 12
const MAX_COMBINATIONS_TO_TRY = 120000

/**
 * 穷举手牌子集，找能压过上家、且主牌力尽量小的一手（同主值则更短张数优先）。
 * 用于 BasicAI 漏算或返回非法组合时的兜底。
 */
export function findLegalBeatingPlay(hand: Card[], target: CardPattern, judgeCtx: JudgeContext): Card[] | null {
  if (hand.length === 0) return null
  let tried = 0
  let best: Card[] | null = null
  let bestMain = Infinity
  let bestLen = Infinity

  const consider = (combo: Card[]) => {
    const pat = analyzePattern(combo, judgeCtx)
    if (!pat || !canBeat(pat, target)) return
    const m = pat.mainValue
    const len = combo.length
    if (m < bestMain || (m === bestMain && len < bestLen)) {
      best = combo
      bestMain = m
      bestLen = len
    }
  }

  const maxN = Math.min(MAX_COMBO_SIZE, hand.length)
  for (let n = 1; n <= maxN; n++) {
    for (const combo of combinations(hand, n)) {
      if (++tried > MAX_COMBINATIONS_TO_TRY) {
        return best
      }
      consider(combo)
    }
  }

  return best
}

/** 首家领出：任一张合法单张即可（取点数最小的一张，减少浪费大牌） */
export function findMinimalLegalLead(hand: Card[], judgeCtx: JudgeContext): Card[] | null {
  if (hand.length === 0) return null
  const sorted = [...hand].sort((a, b) => a.value - b.value)
  for (const c of sorted) {
    if (analyzePattern([c], judgeCtx)) return [c]
  }
  return null
}
