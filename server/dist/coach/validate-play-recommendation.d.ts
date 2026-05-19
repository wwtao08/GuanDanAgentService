import { type JudgeContext } from '../game/judge.js';
import type { Card, CardPattern } from '../game/rules.js';
/**
 * 校验 LLM 返回的出牌建议是否可执行（牌在手、牌型合法、能压上家或首家）。
 * @param lastPlayerIndex 与游戏 state 一致：-1 表示本圈尚无人出牌，此时不可「不出」
 */
export declare function validateLlmPlayRecommendation(action: 'play' | 'pass', cardIds: string[], handCards: Card[], lastPlayedPattern: CardPattern | null, judgeCtx: JudgeContext, lastPlayerIndex: number): {
    ok: true;
    cards: Card[];
} | {
    ok: false;
    reason: string;
};
export declare function toCoachRecommendedFromCards(cards: Card[], judgeCtx: JudgeContext): import("./types.js").CoachRecommended;
