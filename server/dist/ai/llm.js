import { BasicAI } from './basic.js';
export class LLMController {
    constructor(game, apiKey, provider = 'openai') {
        this.basicAI = new BasicAI(game, 'hard');
        this.apiKey = apiKey || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
        this.provider = apiKey ? provider : (process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'openai');
    }
    async selectCards(cards, lastPattern) {
        if (!this.apiKey) {
            return this.basicAI.selectCards(cards, lastPattern);
        }
        try {
            const response = await this.callLLM(cards, lastPattern);
            return this.parseLLMResponse(response, cards);
        }
        catch (error) {
            console.error('LLM 调用失败，回退到基础 AI:', error);
            return this.basicAI.selectCards(cards, lastPattern);
        }
    }
    async callLLM(cards, lastPattern) {
        const prompt = this.buildPrompt(cards, lastPattern);
        if (this.provider === 'openai') {
            return this.callOpenAI(prompt);
        }
        else {
            return this.callAnthropic(prompt);
        }
    }
    async callOpenAI(prompt) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 500
            })
        });
        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
    }
    async callAnthropic(prompt) {
        if (!this.apiKey)
            throw new Error('API key missing');
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 500,
                messages: [{ role: 'user', content: prompt }]
            })
        });
        const data = await response.json();
        return data.content?.[0]?.text || '';
    }
    buildPrompt(cards, lastPattern) {
        const cardStr = cards.map(c => `${c.rank}${c.suit}`).join(', ');
        let prompt = `你正在玩惯蛋扑克游戏。
    
你手上有以下牌: ${cardStr}

`;
        if (lastPattern) {
            prompt += `上家打出的牌型: ${lastPattern.type}, 牌值: ${lastPattern.mainValue}\n`;
        }
        else {
            prompt += `你是第一个出牌.\n`;
        }
        prompt += `请选择你要打出的牌，以JSON格式返回，格式如下:
{"cards": ["牌1", "牌2", ...]}

例如: {"cards": ["3hearts", "4hearts", "5hearts"]}

注意：你必须选择能压制上家的牌型，或者如果你是第一个出牌则选择任意牌型。`;
        return prompt;
    }
    parseLLMResponse(response, availableCards) {
        try {
            const match = response.match(/\{[\s\S]*\}/);
            if (!match)
                return this.basicAI.selectCards(availableCards, null);
            const parsed = JSON.parse(match[0]);
            const cardNames = parsed.cards || [];
            const selected = availableCards.filter(c => cardNames.some((name) => name.toLowerCase().includes(c.rank.toLowerCase())));
            return selected.length > 0 ? selected : this.basicAI.selectCards(availableCards, null);
        }
        catch {
            return this.basicAI.selectCards(availableCards, null);
        }
    }
}
