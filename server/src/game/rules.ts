export type CardSuit = 'spades' | 'hearts' | 'clubs' | 'diamonds' | 'joker'
export type CardRank = '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | '2' | 'SJ' | 'BJ'

export interface Card {
  id: string
  suit: CardSuit
  rank: CardRank
  value: number
}

export type CardPatternType =
  | 'single'
  | 'pair'
  | 'triple'
  | 'triple_with_pair'
  | 'straight'
  | 'straight_pair' // 三连对（三连对木板）
  | 'triple_run' // 三同连张：相邻两副三张（掼蛋“钢板”）
  | 'bomb'
  | 'straight_bomb'
  | 'joker_bomb'

export interface CardPattern {
  type: CardPatternType
  cards: Card[]
  mainValue: number
}

export const CARD_VALUES: Record<CardRank, number> = {
  '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15,
  'SJ': 16, 'BJ': 17
}

export const RANK_ORDER: CardRank[] = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2', 'SJ', 'BJ']

/** 升级对应的级牌（当前打几）：2～10、J、Q、K、A（14） */
export function levelToRank(level: number): CardRank {
  if (level >= 2 && level <= 9) return String(level) as CardRank
  if (level === 10) return '10'
  if (level === 11) return 'J'
  if (level === 12) return 'Q'
  if (level === 13) return 'K'
  if (level === 14) return 'A'
  return '2'
}

/**
 * 掼蛋：四人、两副牌共 108 张（每副 52 张 + 小王、大王各 1 张），每人 27 张。
 */
export function createDeck(): Card[] {
  const suits: CardSuit[] = ['spades', 'hearts', 'clubs', 'diamonds']
  const ranks: CardRank[] = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2']

  const deck: Card[] = []
  let id = 0

  for (let d = 0; d < 2; d++) {
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({
          id: `d${d}_${suit}_${rank}_${id++}`,
          suit,
          rank,
          value: CARD_VALUES[rank],
        })
      }
    }
    deck.push({
      id: `d${d}_joker_SJ_${id++}`,
      suit: 'joker',
      rank: 'SJ',
      value: CARD_VALUES['SJ'],
    })
    deck.push({
      id: `d${d}_joker_BJ_${id++}`,
      suit: 'joker',
      rank: 'BJ',
      value: CARD_VALUES['BJ'],
    })
  }

  return deck
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function dealCards(deck: Card[], playerCount: number): Card[][] {
  const hands: Card[][] = Array.from({ length: playerCount }, () => [])
  const cardsPerPlayer = Math.floor(deck.length / playerCount)
  
  let cardIndex = 0
  for (let i = 0; i < cardsPerPlayer; i++) {
    for (let p = 0; p < playerCount; p++) {
      if (deck[cardIndex]) {
        hands[p].push(deck[cardIndex++])
      }
    }
  }
  
  return hands.map(hand => sortCards(hand))
}

export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => a.value - b.value)
}

export function getCardDisplay(rank: CardRank, suit: CardSuit): string {
  const suitSymbols: Record<CardSuit, string> = {
    spades: '♠', hearts: '♥', clubs: '♣', diamonds: '♦', joker: '🃏'
  }
  return `${rank}${suitSymbols[suit]}`
}
