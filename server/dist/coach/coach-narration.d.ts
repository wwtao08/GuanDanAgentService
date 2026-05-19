import type { Card, CardRank } from '../game/rules.js';
/** 口语化点数（例如 10→十），便于「一对红桃十」式表达 */
export declare function spokenRank(rank: CardRank): string;
/** 口语化单张牌名：红桃十、大王 */
export declare function humanCardName(c: Card): string;
/**
 * 拟人化描述这一手牌（以「出了…」开头，便于接在「对家」「上家」后面）
 */
export declare function describePlayColloquially(pattern: any): string;
/**
 * 本圈历史一行：「对家出了一对红桃十和方块十」
 */
export declare function describeSeatPlayLine(seatLabel: string, pattern: any): string;
/**
 * 你要压过的那一手（带方位），用于提示「上一手」口语块
 */
export declare function describePressureFromLastPlay(myPosition: number, lastPlayerIndex: number, pattern: any): string;
