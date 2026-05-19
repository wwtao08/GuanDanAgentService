import { analyzePattern, type JudgeContext } from '../game/judge.js'
import type { Card } from '../game/rules.js'
import type { CoachRecommended } from './types.js'

export function patternTypeToZh(type: string | null | undefined): string | null {
  if (!type) return null
  const map: Record<string, string> = {
    single: '单张',
    pair: '对子',
    triple: '三张',
    triple_with_pair: '三带二',
    /** 普通顺子，与同花顺、炸弹区分 */
    straight: '顺子',
    straight_pair: '三连对',
    triple_run: '钢板',
    /** 四张及以上同点，勿与普通顺子混淆 */
    bomb: '炸弹（同点≥四张）',
    /** 同花色顺子；与「顺子」不同 */
    straight_bomb: '同花顺',
    joker_bomb: '王炸',
  }
  return map[type] || type
}

export function toReadableCardName(card: Card): string {
  if (card.suit === 'joker') {
    if (card.rank === 'BJ') return '大王'
    if (card.rank === 'SJ') return '小王'
    return '王'
  }
  const suitMap: Record<string, string> = {
    hearts: '红桃',
    spades: '黑桃',
    clubs: '梅花',
    diamonds: '方块',
  }
  const suit = suitMap[card.suit] || card.suit
  return `${suit}${card.rank}`
}

export function normalizeRecommended(cards: Card[], ctx: JudgeContext): CoachRecommended {
  if (!cards.length) {
    return { action: 'pass', cards: [], patternType: null }
  }
  const pattern = analyzePattern(cards, ctx)
  return {
    action: 'play',
    cards: cards.map((c) => toReadableCardName(c)),
    patternType: patternTypeToZh(pattern?.type),
  }
}
