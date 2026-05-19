import type { Card } from '../game/rules.js';
import type { CoachGameContext } from './types.js';
/**
 * 掼蛋民间教学顺口溜 / 口诀（本地知识库，供教练 LLM 作文化背景与经验参考）。
 * 说明：各地打法略有差异，条目以常见说法为主；模型应结合当前局面取舍，不可生搬硬套。
 */
export interface CoachProverbEntry {
    /** 顺口溜或短句本身 */
    line: string;
    /** 适用场景或含义提示，便于模型理解 */
    gist?: string;
}
export declare const COACH_GUANDAN_PROVERBS: ReadonlyArray<CoachProverbEntry>;
/**
 * 注入用户提示的格式化文本（编号列表，便于模型扫读）
 */
export declare function formatProverbsForPrompt(entries?: ReadonlyArray<CoachProverbEntry>): string;
/** 为单次请求选几条「优先呼应」的顺口溜 + 随机一条，增强多样性与可引用性 */
export declare function buildProverbMandateBlock(params: {
    context: CoachGameContext;
    handCards: Card[];
    playedHistoryLength: number;
    recommendedAction: 'play' | 'pass';
    varietySeed: number;
}): string;
/** 每局随机：表达角度 + 禁用开头，减少千篇一律 */
export declare function buildCoachVarietyBlock(varietySeed: number): string;
export declare function buildCoachKnowledgePrompt(context: CoachGameContext): string;
