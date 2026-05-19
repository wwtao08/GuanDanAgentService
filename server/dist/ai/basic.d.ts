import type { Card, CardPattern } from '../game/rules.js';
import type { GuandanGame } from '../game/game.js';
export type AIDifficulty = 'easy' | 'normal' | 'hard';
export declare class BasicAI {
    private game;
    private difficulty;
    constructor(game: GuandanGame, difficulty?: AIDifficulty);
    selectCards(cards: Card[], lastPattern: CardPattern | null): Card[];
    private selectFirstPlay;
    private findBeatingCards;
    private selectBestBeating;
    private shouldPass;
    private findSmallestBeatable;
    private findAllPatterns;
    private groupByValue;
}
