import type { Card, CardRank } from '../game/rules.js'
import { relSeatLabel } from './hand-context.js'

const SUIT_ZH: Record<string, string> = {
  hearts: '红桃',
  spades: '黑桃',
  clubs: '梅花',
  diamonds: '方块',
}

/** 口语化点数（例如 10→十），便于「一对红桃十」式表达 */
export function spokenRank(rank: CardRank): string {
  switch (rank) {
    case '10':
      return '十'
    case 'J':
      return 'J'
    case 'Q':
      return 'Q'
    case 'K':
      return 'K'
    case 'A':
      return 'A'
    case '2':
      return '二'
    case 'SJ':
      return '小王'
    case 'BJ':
      return '大王'
    default:
      return rank
  }
}

/** 口语化单张牌名：红桃十、大王 */
export function humanCardName(c: Card): string {
  if (c.suit === 'joker') {
    return c.rank === 'BJ' ? '大王' : '小王'
  }
  return `${SUIT_ZH[c.suit] ?? ''}${spokenRank(c.rank)}`
}

function patternTypeToZh(type: string | null | undefined): string {
  const map: Record<string, string> = {
    single: '单张',
    pair: '对子',
    triple: '三张',
    triple_with_pair: '三带二',
    straight: '顺子',
    straight_pair: '三连对',
    triple_run: '钢板',
    bomb: '炸弹（同点≥四张）',
    straight_bomb: '同花顺',
    joker_bomb: '王炸',
  }
  if (!type) return '未知牌型'
  return map[type] || type
}

function sortCardsForDisplay(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    if (a.value !== b.value) return a.value - b.value
    return a.id.localeCompare(b.id)
  })
}

/**
 * 拟人化描述这一手牌（以「出了…」开头，便于接在「对家」「上家」后面）
 */
export function describePlayColloquially(pattern: any): string {
  if (!pattern) {
    return '（无牌）'
  }
  const type = pattern.type as string | undefined
  const cards = pattern.cards as Card[] | undefined
  if (!type) {
    return pattern.mainValue != null ? `未知牌型（主值 ${pattern.mainValue}）` : '未知出牌'
  }
  if (!cards?.length) {
    return `${patternTypeToZh(type)}（主值 ${pattern.mainValue ?? '?'}）`
  }

  const sorted = sortCardsForDisplay(cards)

  switch (type) {
    case 'single':
      return `出了一张${humanCardName(sorted[0])}`
    case 'pair':
      return `出了一对${humanCardName(sorted[0])}和${humanCardName(sorted[1])}`
    case 'triple':
      return `出了三个${humanCardName(sorted[0])}、${humanCardName(sorted[1])}和${humanCardName(sorted[2])}`
    case 'triple_with_pair':
      return `出了三带二：${sorted.map((c) => humanCardName(c)).join('、')}`
    case 'straight':
      return `出了一条顺子：${sorted.map((c) => humanCardName(c)).join('、')}`
    case 'straight_pair':
      return `出了三连对：${sorted.map((c) => humanCardName(c)).join('、')}`
    case 'triple_run':
      return `出了钢板：${sorted.map((c) => humanCardName(c)).join('、')}`
    case 'bomb':
      return `出了${sorted.length}张的炸弹：${sorted.map((c) => humanCardName(c)).join('、')}`
    case 'straight_bomb':
      return `出了同花顺：${sorted.map((c) => humanCardName(c)).join('、')}`
    case 'joker_bomb':
      return '出了王炸'
    default:
      return `出了${patternTypeToZh(type)}：${sorted.map((c) => humanCardName(c)).join('、')}`
  }
}

/**
 * 本圈历史一行：「对家出了一对红桃十和方块十」
 */
export function describeSeatPlayLine(seatLabel: string, pattern: any): string {
  return `${seatLabel}${describePlayColloquially(pattern)}`
}

/**
 * 你要压过的那一手（带方位），用于提示「上一手」口语块
 */
export function describePressureFromLastPlay(myPosition: number, lastPlayerIndex: number, pattern: any): string {
  if (!pattern || lastPlayerIndex < 0) {
    return '本轮尚无人出牌，你可自由领出。'
  }
  const who = relSeatLabel(myPosition, lastPlayerIndex)
  return `${who}${describePlayColloquially(pattern)}，轮到你压这一手。`
}
