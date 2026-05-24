import type { Card, CardPattern } from '../game/rules.js';
import type { GuandanGame } from '../game/game.js';
import { BasicAI } from './basic.js';
import { ReasonEngine } from '../coach/reason-engine.js';
import type { BuildCoachHintInput } from '../coach/types.js';
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
export class TeamAI {
 private basicAI: BasicAI;
 private reasonEngine: ReasonEngine;
 private game: GuandanGame;
 private config: TeamAIConfig;
 private teamMessages: TeamMessage[];
 constructor(game: GuandanGame, config: Partial<TeamAIConfig> = {}) {
 this.game = game;
 this.basicAI = new BasicAI(game, 'hard');
 this.reasonEngine = new ReasonEngine();
 this.config = {
 useLLM: config.useLLM !== undefined ? config.useLLM : true,
 teamChatEnabled: config.teamChatEnabled !== undefined ? config.teamChatEnabled : true,
 maxMessageLength: config.maxMessageLength || 50,
 };
 this.teamMessages = [];
 }
 setTeamMessages(messages: TeamMessage[]) {
 this.teamMessages = messages;
 }
 addTeamMessage(message: TeamMessage) {
 this.teamMessages.push(message);
 if (this.teamMessages.length > 50) {
 this.teamMessages = this.teamMessages.slice(-50);
 }
 }
 async selectCards(cards: Card[], lastPattern: CardPattern | null, position: number): Promise<TeamAIResult> {
 const ctx = this.game.getJudgeContext();
 if (!this.config.useLLM) {
 const selected = this.basicAI.selectCards(cards, lastPattern);
 const message = await this.generateTeamMessage(selected, cards, lastPattern, position);
 return {
 cards: selected,
 message,
 confidence: 'medium',
 source: 'basic-ai'
 };
 }
 const hintInput = this.buildHintInput(cards, lastPattern, position);
 if (!hintInput) {
 const selected = this.basicAI.selectCards(cards, lastPattern);
 const message = await this.generateTeamMessage(selected, cards, lastPattern, position);
 return {
 cards: selected,
 message,
 confidence: 'medium',
 source: 'basic-ai'
 };
 }
 try {
 const llmResult = await this.reasonEngine.fetchLlmValidatedPlay(hintInput, ctx);
 if (llmResult) {
 const llmCards = llmResult.action === 'play' ? llmResult.cards : [];
 const message = await this.generateTeamMessage(llmCards, cards, lastPattern, position);
 return {
 cards: llmCards,
 message,
 confidence: 'high',
 source: 'llm'
 };
 }
 }
 catch (error) {
 console.error('[team-ai] LLM 调用失败:', error);
 }
 const selected = this.basicAI.selectCards(cards, lastPattern);
 const message = await this.generateTeamMessage(selected, cards, lastPattern, position);
 return {
 cards: selected,
 message,
 confidence: 'medium',
 source: 'basic-ai'
 };
 }
 private buildHintInput(cards: Card[], lastPattern: CardPattern | null, position: number): BuildCoachHintInput | null {
 const state = this.game.getState();
 const teamMsgStr = this.teamMessages
 .filter(m => m.timestamp > Date.now() - 300000)
 .map(m => `玩家${m.position + 1}(${m.playerName}): ${m.content}`)
 .join('\n');
 return {
 roomId: this.game.getState().roomId,
 handCards: cards,
 lastPlayedPattern: lastPattern,
 playedHistory: state.playedCards.map(step => ({
 position: step.position,
 cards: step.cards,
 pattern: step.pattern,
 })),
 context: {
 currentLevel: state.currentLevel,
 levelRank: state.levelRank,
 roundNumber: state.roundNumber,
 firstPlayerIndex: state.firstPlayerIndex,
 lastPlayerIndex: state.lastPlayerIndex,
 currentPlayerIndex: position,
 myPosition: position,
 roundFinishOrder: [...state.roundFinishOrder],
 seats: state.players.map((p, i) => ({
 position: i,
 name: p.name,
 remainingCards: p.cards.length,
 isAI: p.isAI,
 })),
 },
 coachMode: 'expert',
 teamMessages: teamMsgStr || undefined,
 };
 }
 private async generateTeamMessage(selectedCards: Card[], handCards: Card[], lastPattern: CardPattern | null, position: number): Promise<string | undefined> {
 if (!this.config.teamChatEnabled)
 return undefined;
 if (selectedCards.length === 0)
 return undefined;
 const teammatePosition = (position + 2) % 4;
 const state = this.game.getState();
 const teammate = state.players[teammatePosition];
 if (!teammate)
 return undefined;
 const prompt = this.buildMessagePrompt(selectedCards, handCards, lastPattern, position, teammatePosition);
 try {
 const response = await this.reasonEngine.callLLMForMessage(prompt);
 if (response && response.trim().length > 0 && response.trim().length <= this.config.maxMessageLength) {
 return response.trim();
 }
 }
 catch (error) {
 console.error('[team-ai] 消息生成失败:', error);
 }
 return this.generateSimpleMessage(selectedCards, lastPattern);
 }
 private buildMessagePrompt(selectedCards: Card[], handCards: Card[], lastPattern: CardPattern | null, position: number, teammatePosition: number): string {
 const cardStr = selectedCards.map(c => `${c.rank}${c.suit}`).join(', ');
 const teammateCards = this.game.getState().players[teammatePosition]?.cards.length || 0;
 let prompt = `你正在玩掼蛋游戏，位置${position + 1}。你刚选择打出: ${cardStr}。\n\n`;
 if (lastPattern) {
 prompt += `上家出牌类型: ${lastPattern.type}, 主值: ${lastPattern.mainValue}\n`;
 }
 prompt += `队友在位置${teammatePosition + 1}，剩余${teammateCards}张牌。\n`;
 prompt += `请生成一条简短的提示消息给队友（不超过${this.config.maxMessageLength}字），暗示你的出牌意图或请求队友配合。\n`;
 prompt += `消息要隐晦但有用，避免违反规则。不要直接说出具体牌面。\n`;
 prompt += `例子："我能接", "你先出", "需要支援", "小心炸弹"\n`;
 prompt += `只输出消息内容，不要有其他文字。`;
 return prompt;
 }
 private generateSimpleMessage(selectedCards: Card[], lastPattern: CardPattern | null): string | undefined {
 if (selectedCards.length === 0)
 return undefined;
 const patterns = ['我上', '接得住', '看你的', '顶住', '稳一点', '走你', '小心', '有炸弹'];
 return patterns[Math.floor(Math.random() * patterns.length)];
 }
}

