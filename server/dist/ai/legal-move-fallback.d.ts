import { type JudgeContext } from '../game/judge.js';
import type { Card, CardPattern } from '../game/rules.js';
/**
 * 穷举手牌子集，找能压过上家、且主牌力尽量小的一手（同主值则更短张数优先）。
 * 用于 BasicAI 漏算或返回非法组合时的兜底。
 */
export declare function findLegalBeatingPlay(hand: Card[], target: CardPattern, judgeCtx: JudgeContext): Card[] | null;
/** 首家领出：任一张合法单张即可（取点数最小的一张，减少浪费大牌） */
export declare function findMinimalLegalLead(hand: Card[], judgeCtx: JudgeContext): Card[] | null;
