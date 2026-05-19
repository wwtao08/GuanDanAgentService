import type { Card, CardPattern, CardPatternType, CardRank } from './rules.js';
/** 判牌上下文：逢人配 = 与当前级牌同点数的红桃 */
export interface JudgeContext {
    levelRank: CardRank;
}
export declare function analyzePattern(cards: Card[], ctx?: JudgeContext): CardPattern | null;
export declare function canBeat(pattern: CardPattern, target: CardPattern | null): boolean;
export declare function getPatternName(type: CardPatternType): string;
