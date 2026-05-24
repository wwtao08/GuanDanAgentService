import type { Card, CardPattern } from '../game/rules.js';
import type { GuandanGame } from '../game/game.js';
export interface TeamMessage {
    playerId: string;
    playerName: string;
    position: number;
    content: string;
    timestamp: number;
}
export interface TeamAIConfig {
    useLLM: boolean;
    teamChatEnabled: boolean;
    maxMessageLength: number;
}
export interface TeamAIResult {
    cards: Card[];
    message?: string;
    confidence: 'low' | 'medium' | 'high';
    source: 'llm' | 'basic-ai';
}
export declare class TeamAI {
    private basicAI;
    private reasonEngine;
    private game;
    private config;
    private teamMessages;
    constructor(game: GuandanGame, config?: Partial<TeamAIConfig>);
    setTeamMessages(messages: TeamMessage[]): void;
    addTeamMessage(message: TeamMessage): void;
    selectCards(cards: Card[], lastPattern: CardPattern | null, position: number): Promise<TeamAIResult>;
    private buildHintInput;
    private generateTeamMessage;
    private buildMessagePrompt;
    private generateSimpleMessage;
}
