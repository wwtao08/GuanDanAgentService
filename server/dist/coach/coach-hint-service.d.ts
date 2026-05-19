import type { GuandanGame } from '../game/game.js';
import type { BuildCoachHintInput, BuildCoachHintResult, CoachRecommended } from './types.js';
export interface CoachStreamCallbacks {
    onRecommendation: (recommended: CoachRecommended) => void;
    onReasonDelta: (delta: string) => void;
}
export declare class CoachHintService {
    private game;
    private reasonEngine;
    constructor(game: GuandanGame);
    /** 先算推荐（优先 LLM，失败则规则引擎），再流式生成思路（通过回调推送增量） */
    buildCoachHintStream(input: BuildCoachHintInput, callbacks: CoachStreamCallbacks): Promise<BuildCoachHintResult>;
    /** 兼容：无流式回调时一次性返回（内部仍会走流式 API，但不对外推送） */
    buildCoachHint(input: BuildCoachHintInput): Promise<BuildCoachHintResult>;
}
