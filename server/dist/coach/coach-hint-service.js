import { BasicAI } from '../ai/basic.js';
import { normalizeRecommended } from './coach-card-labels.js';
import { ReasonEngine } from './reason-engine.js';
function validateCardsInHand(cardIds, handIds) {
    return cardIds.every((id) => handIds.has(id));
}
export class CoachHintService {
    constructor(game) {
        this.game = game;
        this.reasonEngine = new ReasonEngine();
    }
    /** 先算推荐（优先 LLM，失败则规则引擎），再流式生成思路（通过回调推送增量） */
    async buildCoachHintStream(input, callbacks) {
        const judgeCtx = this.game.getJudgeContext();
        const passRecommendation = { action: 'pass', cards: [], patternType: null };
        const fromLlm = await this.reasonEngine.fetchLlmPlayRecommendation(input, judgeCtx);
        let recommended;
        if (fromLlm) {
            recommended = fromLlm;
        }
        else {
            const ai = new BasicAI(this.game, 'hard');
            const selected = ai.selectCards(input.handCards, input.lastPlayedPattern || null);
            const selectedIds = selected.map((c) => c.id);
            const handIds = new Set(input.handCards.map((c) => c.id));
            const isValid = validateCardsInHand(selectedIds, handIds);
            recommended = isValid ? normalizeRecommended(selected, judgeCtx) : passRecommendation;
            console.log('[coach] 出牌建议使用规则引擎（LLM 未启用、失败或未通过校验）');
        }
        callbacks.onRecommendation(recommended);
        const coachMode = input.coachMode ?? 'beginner';
        const reason = await this.reasonEngine.generateReasonStream({
            recommended,
            handCards: input.handCards,
            lastPlayedPattern: input.lastPlayedPattern,
            playedHistory: input.playedHistory,
            context: input.context,
            coachMode,
        }, callbacks.onReasonDelta);
        return {
            recommended,
            reason: reason.text,
            confidence: reason.confidence,
        };
    }
    /** 兼容：无流式回调时一次性返回（内部仍会走流式 API，但不对外推送） */
    async buildCoachHint(input) {
        return this.buildCoachHintStream(input, {
            onRecommendation: () => { },
            onReasonDelta: () => { },
        });
    }
}
