import type { Card } from '../game/rules.js';
import type { CoachGameContext, CoachHintMode, CoachRecommended } from './types.js';
export type CoachPromptOutputFormat = 'json' | 'stream_plain';
/** 系统角色：场外教练、第三人称牌桌描述；推理优先 */
export declare function buildCoachSystemPrompt(options: {
    coachMode: CoachHintMode;
    outputFormat: CoachPromptOutputFormat;
}): string;
export declare function buildCoachUserPrompt(params: {
    handCards: Card[];
    lastPlayedPattern: any;
    playedHistory: Array<{
        pattern: any;
        cards?: Card[];
        position: number;
    }>;
    recommended: CoachRecommended;
    context: CoachGameContext;
    coachMode: CoachHintMode;
    outputFormat: CoachPromptOutputFormat;
    /** 每次请求不同，驱动表达角度与顺口溜聚焦，减少千篇一律 */
    varietySeed: number;
}): string;
/** 仅用于「本步出牌建议」：输出 play+cardIds 或 pass */
export declare function buildCoachPlayRecommendationSystemPrompt(): string;
export declare function buildCoachPlayRecommendationUserPrompt(params: {
    handCards: Card[];
    lastPlayedPattern: any;
    playedHistory: Array<{
        pattern: any;
        cards?: Card[];
        position: number;
    }>;
    context: CoachGameContext;
}): string;
