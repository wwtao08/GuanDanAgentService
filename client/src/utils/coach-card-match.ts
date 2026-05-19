import type { Card, CardRank, CardSuit } from '@/types'

const SUIT_ZH: Record<string, CardSuit> = {
  红桃: 'hearts',
  黑桃: 'spades',
  梅花: 'clubs',
  方块: 'diamonds',
}

/**
 * 与教练/服务端 `toReadableCardName` 一致：如「红桃6」「方块10」「大王」
 */
export function parseCoachCardLabel(label: string): { suit: CardSuit; rank: CardRank } | 'BJ' | 'SJ' | null {
  const t = label.replace(/\s/g, '').trim()
  if (t === '大王') return 'BJ'
  if (t === '小王') return 'SJ'
  const m = t.match(/^(红桃|黑桃|梅花|方块)(10|[3-9]|J|Q|K|A|2)$/)
  if (!m) return null
  const suit = SUIT_ZH[m[1]]
  if (!suit) return null
  return { suit, rank: m[2] as CardRank }
}

/**
 * 按建议文案顺序，从手牌中各取一张匹配牌（支持两副牌重复点数）。
 * 无法完整匹配时返回 null。
 */
export function matchHandToCoachLabels(labels: string[], hand: Card[]): Card[] | null {
  const clean = labels.map((s) => (typeof s === 'string' ? s.trim() : '')).filter(Boolean)
  if (!clean.length) return []
  const pool = [...hand]
  const picked: Card[] = []
  for (const label of clean) {
    const p = parseCoachCardLabel(label)
    if (!p) return null
    let idx = -1
    if (p === 'BJ') idx = pool.findIndex((c) => c.suit === 'joker' && c.rank === 'BJ')
    else if (p === 'SJ') idx = pool.findIndex((c) => c.suit === 'joker' && c.rank === 'SJ')
    else idx = pool.findIndex((c) => c.suit === p.suit && c.rank === p.rank)
    if (idx === -1) return null
    picked.push(pool[idx])
    pool.splice(idx, 1)
  }
  return picked
}
