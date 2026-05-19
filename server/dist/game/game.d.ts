import { type Card, type CardRank } from './rules.js';
import { analyzePattern, type JudgeContext } from './judge.js';
export type PlayerPosition = 0 | 1 | 2 | 3;
export type TributeActionType = 'tribute' | 'return';
export interface TributeAction {
    type: TributeActionType;
    from: PlayerPosition;
    to: PlayerPosition;
}
export interface Player {
    id: string;
    name: string;
    position: PlayerPosition;
    isAI: boolean;
    cards: Card[];
    isReady: boolean;
    isOnline: boolean;
    level: number;
}
export type GameStatus = 'waiting' | 'dealing' | 'playing' | 'tribute' | 'round_end' | 'game_over';
export interface PlayedCards {
    position: PlayerPosition;
    cards: Card[];
    pattern: ReturnType<typeof analyzePattern>;
}
export interface GameState {
    roomId: string;
    status: GameStatus;
    players: Player[];
    currentPlayerIndex: PlayerPosition;
    playedCards: PlayedCards[];
    currentLevel: number;
    levelRank: CardRank;
    lastRoundRanking: PlayerPosition[] | null;
    /** 本副已出完牌的顺序 [头游, 二游, 三游, 末游] */
    roundFinishOrder: PlayerPosition[];
    lastPlayedPattern: ReturnType<typeof analyzePattern>;
    lastPlayerIndex: PlayerPosition | -1;
    firstPlayerIndex: PlayerPosition;
    roundNumber: number;
    /** 进贡/还牌队列（手动）；null 表示非进贡阶段 */
    tributeQueue: TributeAction[] | null;
    tributeStepIndex: number;
    /** 本副进贡结束后先出牌者（头游），进贡链完成后使用 */
    tributeRoundHead: PlayerPosition | null;
}
export declare class GuandanGame {
    private state;
    constructor(roomId: string);
    getJudgeContext(): JudgeContext;
    private firstSeatFromReveal;
    private isSameTeam;
    private countBigJoker;
    /** 逆时针下一个仍有手牌的玩家 */
    nextActivePlayer(from: PlayerPosition): PlayerPosition;
    /**
     * 接风：一名玩家刚出完牌且无手牌时，下一圈由**其对家（队友）**领出（若其仍有牌）；
     * 对家也已出完则按逆时针找下一个仍有牌者。
     */
    private leaderAfterPlayerFinishedOut;
    private removeCardFromPlayer;
    private isFengRenPei;
    /** 进贡牌须为手中最大（逢人配不可进贡） */
    private isValidTributePick;
    /** 还牌：有 10 点及以下时任选一张 ≤10；否则须还最小的一张 */
    private isValidReturnPick;
    private buildTributeQueue;
    private syncTributeCurrentPlayer;
    private startTributePhase;
    /** 提交进贡或还牌（仅轮到 from 座位的玩家） */
    submitTributeAction(playerId: string, cardId: string): {
        success: boolean;
        message?: string;
    };
    /** AI 自动进贡/还牌一步 */
    autoAdvanceTributeStep(): void;
    getCurrentTributeStep(): TributeAction | null;
    addPlayer(id: string, name: string, isAI: boolean): Player | null;
    removePlayer(id: string): void;
    startGame(): void;
    playCards(playerId: string, cards: Card[]): {
        success: boolean;
        message?: string;
        roundFinished?: boolean;
    };
    pass(playerId: string): {
        success: boolean;
        message?: string;
    };
    /** 有人出完牌后新开一圈：领出者依「接风」由对家优先（见 leaderAfterPlayerFinishedOut） */
    private startTrickAfterPlayerOut;
    private nextPlayer;
    private startNextTrick;
    private handleRoundEnd;
    private calculateUpgrades;
    private startNewRound;
    getState(): GameState;
    getPlayer(id: string): Player | undefined;
}
