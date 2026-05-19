import type { JudgeContext } from '../game/judge.js';
import type { Card } from '../game/rules.js';
import type { BuildCoachHintInput, CoachGameContext, CoachHintMode, CoachRecommended } from './types.js';
export interface GenerateCoachReasonParams {
    recommended: CoachRecommended;
    handCards: Card[];
    lastPlayedPattern: any;
    playedHistory: Array<{
        pattern: any;
        cards?: Card[];
        position: number;
    }>;
    context: CoachGameContext;
    coachMode: CoachHintMode;
}
interface ReasonResult {
    text: string;
    confidence?: 'low' | 'medium' | 'high';
}
export declare class ReasonEngine {
    /**
     * 仅调用非流式 Chat Completions，成功返回解析结果；任一步失败返回 null（不拼模板兜底）。
     * 供流式失败后的重试与 `generateReason` 共用。
     */
    private invokeLlmNonStream;
    generateReasonStream(params: GenerateCoachReasonParams, onDelta: (chunk: string) => void): Promise<ReasonResult>;
    /** 非流式（回退或 COACH_USE_STREAM=false） */
    generateReason(params: GenerateCoachReasonParams): Promise<ReasonResult>;
    /**
     * 与教练「出牌建议」同源：校验通过的 Card[] 或 pass；失败返回 null。
     * 供 AI 回合在规则引擎无法落子时兜底调用。
     */
    fetchLlmValidatedPlay(input: BuildCoachHintInput, judgeCtx: JudgeContext): Promise<{
        action: 'play';
        cards: Card[];
    } | {
        action: 'pass';
    } | null>;
    /**
     * 由大模型推理本步出牌（或不出）；校验不通过或请求失败时返回 null，由调用方回退规则引擎。
     */
    fetchLlmPlayRecommendation(input: BuildCoachHintInput, judgeCtx: JudgeContext): Promise<CoachRecommended | null>;
}
export {};
