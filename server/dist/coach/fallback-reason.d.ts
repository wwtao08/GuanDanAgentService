import type { Card } from '../game/rules.js';
import type { CoachGameContext, CoachRecommended } from './types.js';
/** 口语化一手牌（「出了一对红桃十…」）；供外部或兜底文案复用 */
export declare function describeFacingPattern(pattern: any): string;
/**
 * 供 LLM 阅读的「算法侧启发要点」：多组可轮换表述，与 BasicAI 推荐方向一致，但**不是**最终文案。
 * 模型应据此用自己的话结合手牌/本圈历史展开，禁止照抄句式。
 */
export declare function buildCoachReferenceNotes(params: {
    recommended: CoachRecommended;
    lastPlayedPattern: any;
    handCards: Card[];
    context: CoachGameContext;
}): string;
export interface BuildFallbackReasonParams {
    recommended: CoachRecommended;
    lastPlayedPattern: any;
    handCards: Card[];
    context: CoachGameContext;
}
/**
 * 无 LLM 或接口失败时的兜底文案：与 `buildCoachReferenceNotes` 同源启发逻辑，多组轮换，避免千篇一律。
 */
export declare function buildFallbackReason(params: BuildFallbackReasonParams): string;
