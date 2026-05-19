export type CardSuit = 'spades' | 'hearts' | 'clubs' | 'diamonds' | 'joker';
export type CardRank = '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | '2' | 'SJ' | 'BJ';
export interface Card {
    id: string;
    suit: CardSuit;
    rank: CardRank;
    value: number;
}
export type CardPatternType = 'single' | 'pair' | 'triple' | 'triple_with_pair' | 'straight' | 'straight_pair' | 'triple_run' | 'bomb' | 'straight_bomb' | 'joker_bomb';
export interface CardPattern {
    type: CardPatternType;
    cards: Card[];
    mainValue: number;
}
export declare const CARD_VALUES: Record<CardRank, number>;
export declare const RANK_ORDER: CardRank[];
/** 升级对应的级牌（当前打几）：2～10、J、Q、K、A（14） */
export declare function levelToRank(level: number): CardRank;
/**
 * 掼蛋（惯蛋）：四人、两副牌共 108 张（每副 52 张 + 小王、大王各 1 张），每人 27 张。
 */
export declare function createDeck(): Card[];
export declare function shuffleDeck(deck: Card[]): Card[];
export declare function dealCards(deck: Card[], playerCount: number): Card[][];
export declare function sortCards(cards: Card[]): Card[];
export declare function getCardDisplay(rank: CardRank, suit: CardSuit): string;
