import type { Card, CardRank } from '../game/rules.js';
/**
 * 从手牌生成供 LLM 参考的中文摘要（不含未公开的他人手牌）
 */
export declare function buildHandStructureSummary(handCards: Card[], levelRank: CardRank): string;
export interface SeatPublicInfo {
    position: number;
    name: string;
    remainingCards: number;
    isAI: boolean;
}
/**
 * 各座位剩余张数（不暴露具体牌），用于 LLM 判断节奏
 */
export declare function buildSeatsLine(seats: SeatPublicInfo[], myPosition: number): string;
/**
 * 本圈出牌节奏：谁领出、上一轮谁最大
 */
export declare function buildTrickLine(params: {
    firstPlayerIndex: number;
    lastPlayerIndex: number;
    currentPlayerIndex: number;
    myPosition: number;
}): string;
/** 相对本家的方位：上家 / 下家 / 对家（队友） / 本家 */
export declare function relSeatLabel(myPosition: number, seatPosition: number): string;
/**
 * 队友剩牌 + 敌方低张预警（仅公开张数，不猜具体牌）
 */
export declare function buildPartnerAndThreatLine(seats: SeatPublicInfo[], myPosition: number): string;
/** 本副已确定名次（掼蛋：头游～末游） */
export declare function buildRoundFinishLine(roundFinishOrder: number[], myPosition: number): string;
/**
 * 手牌点数分布 Top（帮助模型做「牌力个性化」描述，不含他家信息）
 */
export declare function buildHandValueTopLine(handCards: Card[], topN?: number): string;
