import type { Card, CardPattern } from '../game/rules.js';
import type { GuandanGame } from '../game/game.js';
export declare class LLMController {
    private basicAI;
    private apiKey;
    private provider;
    constructor(game: GuandanGame, apiKey?: string, provider?: 'openai' | 'anthropic');
    selectCards(cards: Card[], lastPattern: CardPattern | null): Promise<Card[]>;
    private callLLM;
    private callOpenAI;
    private callAnthropic;
    private buildPrompt;
    private parseLLMResponse;
}
