import type { Card, CardPattern } from '../game/rules.js'
import type { GuandanGame } from '../game/game.js'
import { BasicAI } from './basic.js'

export class LLMController {
  private basicAI: BasicAI
  private apiKey: string | undefined
  private provider: 'openai' | 'anthropic'
  
  constructor(
    game: GuandanGame, 
    apiKey?: string,
    provider: 'openai' | 'anthropic' = 'openai'
  ) {
    this.basicAI = new BasicAI(game, 'hard')
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY
    this.provider = apiKey ? provider : (process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'openai')
  }
  
  async selectCards(cards: Card[], lastPattern: CardPattern | null): Promise<Card[]> {
    if (!this.apiKey) {
      return this.basicAI.selectCards(cards, lastPattern)
    }
    
    try {
      const response = await this.callLLM(cards, lastPattern)
      return this.parseLLMResponse(response, cards)
    } catch (error) {
      console.error('LLM 调用失败，回退到基础 AI:', error)
      return this.basicAI.selectCards(cards, lastPattern)
    }
  }
  
  private async callLLM(cards: Card[], lastPattern: CardPattern | null): Promise<string> {
    const prompt = this.buildPrompt(cards, lastPattern)
    
    if (this.provider === 'openai') {
      return this.callOpenAI(prompt)
    } else {
      return this.callAnthropic(prompt)
    }
  }
  
  private async callOpenAI(prompt: string): Promise<string> {
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
    })
    
    const data: any = await response.json()
    return data.choices?.[0]?.message?.content || ''
  }
  
  private async callAnthropic(prompt: string): Promise<string> {
    if (!this.apiKey) throw new Error('API key missing')
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      } as Record<string, string>,
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    
    const data: any = await response.json()
    return data.content?.[0]?.text || ''
  }
  
  private buildPrompt(cards: Card[], lastPattern: CardPattern | null): string {
    const cardStr = cards.map(c => `${c.rank}${c.suit}`).join(', ')
    
    let prompt = `你正在玩掼蛋扑克游戏。
    
你手上有以下牌: ${cardStr}

`
    
    if (lastPattern) {
      prompt += `上家打出的牌型: ${lastPattern.type}, 牌值: ${lastPattern.mainValue}\n`
    } else {
      prompt += `你是第一个出牌.\n`
    }
    
    prompt += `请选择你要打出的牌，以JSON格式返回，格式如下:
{"cards": ["牌1", "牌2", ...]}

例如: {"cards": ["3hearts", "4hearts", "5hearts"]}

注意：你必须选择能压制上家的牌型，或者如果你是第一个出牌则选择任意牌型。`
    
    return prompt
  }
  
  private parseLLMResponse(response: string, availableCards: Card[]): Card[] {
    try {
      const match = response.match(/\{[\s\S]*\}/)
      if (!match) return this.basicAI.selectCards(availableCards, null)
      
      const parsed = JSON.parse(match[0])
      const cardNames = parsed.cards || []
      
      const selected = availableCards.filter(c => 
        cardNames.some((name: string) => 
          name.toLowerCase().includes(c.rank.toLowerCase())
        )
      )
      
      return selected.length > 0 ? selected : this.basicAI.selectCards(availableCards, null)
    } catch {
      return this.basicAI.selectCards(availableCards, null)
    }
  }
}
