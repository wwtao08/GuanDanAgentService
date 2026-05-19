import { randomInt } from 'node:crypto'

import { gameConfig } from '../config/game.js'
import type { JudgeContext } from '../game/judge.js'
import type { Card } from '../game/rules.js'
import type { BuildCoachHintInput, CoachGameContext, CoachHintMode, CoachRecommended } from './types.js'
import { buildFallbackReason } from './fallback-reason.js'
import {
  buildCoachSystemPrompt,
  buildCoachUserPrompt,
  buildCoachPlayRecommendationSystemPrompt,
  buildCoachPlayRecommendationUserPrompt,
  type CoachPromptOutputFormat,
} from './prompt-builder.js'
import { consumeOpenAIChatSse } from './openai-stream.js'
import { validateLlmPlayRecommendation, toCoachRecommendedFromCards } from './validate-play-recommendation.js'

export interface GenerateCoachReasonParams {
  recommended: CoachRecommended
  handCards: Card[]
  lastPlayedPattern: any
  playedHistory: Array<{ pattern: any; cards?: Card[]; position: number }>
  context: CoachGameContext
  coachMode: CoachHintMode
}

interface ReasonResult {
  text: string
  confidence?: 'low' | 'medium' | 'high'
}

function stripMarkdownFence(raw: string): string {
  const t = raw.trim()
  const fenced = t.match(/^```(?:json)?\s*([\s\S]*?)```$/m)
  if (fenced) return fenced[1].trim()
  return t
}

function safeJsonExtract(text: string): { reason?: string; confidence?: 'low' | 'medium' | 'high' } | null {
  const cleaned = stripMarkdownFence(text)
  try {
    const direct = JSON.parse(cleaned) as { reason?: string; confidence?: 'low' | 'medium' | 'high' }
    if (direct && typeof direct === 'object' && 'reason' in direct) return direct
  } catch {
    /* fall through */
  }
  const m = cleaned.match(/\{[\s\S]*\}/)
  if (!m) return null
  try {
    return JSON.parse(m[0]) as { reason?: string; confidence?: 'low' | 'medium' | 'high' }
  } catch {
    return null
  }
}

function extractCompletionText(data: unknown): string {
  const d = data as {
    choices?: Array<{ message?: { content?: unknown } }>
  }
  const msg = d?.choices?.[0]?.message
  const c = msg?.content
  if (typeof c === 'string' && c.trim()) return c
  if (Array.isArray(c)) {
    return c
      .filter((x: { type?: string; text?: string }) => x?.type === 'text' && x.text)
      .map((x: { text?: string }) => x.text ?? '')
      .join('\n')
  }
  return ''
}

function looksLikeChineseCoachReason(s: string): boolean {
  const t = s.trim()
  return t.length >= 24 && /[\u4e00-\u9fff]/.test(t) && !/^\s*[\[{]/.test(t)
}

function isAbortError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false
  const name = (e as { name?: string }).name
  return name === 'AbortError'
}

function openAiChatUrl(): string {
  const base = gameConfig.server.openAiApiBase.replace(/\/$/, '')
  return `${base}/chat/completions`
}

function coachModel(): string {
  return gameConfig.server.coachLlmModel
}

function isKimiK2FamilyModel(model: string): boolean {
  return model.startsWith('kimi-k2')
}

/** Kimi K2 系列（如 kimi-k2.5）仅允许 temperature=0.6，否则会 400 */
function setCoachRequestTemperature(
  body: Record<string, unknown>,
  model: string,
  defaultNonK2: number,
): void {
  if (isKimiK2FamilyModel(model)) {
    body.temperature = 0.6
  } else {
    const t = gameConfig.server.coachOpenAiTemperature
    body.temperature = t !== undefined && Number.isFinite(t) ? t : defaultNonK2
  }
}

function resolveOpenAiApiKey(): string | undefined {
  const k = gameConfig.server.openAiApiKey.trim()
  return k || undefined
}

/** 与 prompt 中「高手约 120 字 / 新手约 260 字」配套，从上限压短模型输出 */
function maxTokensForMode(coachMode: CoachHintMode): number {
  return coachMode === 'expert' ? 240 : 520
}

async function callOpenAIChat(
  systemPrompt: string,
  userPrompt: string,
  timeoutMs: number,
  maxTokens: number,
  outputFormat: CoachPromptOutputFormat,
): Promise<Response> {
  const key = resolveOpenAiApiKey()
  if (!key) throw new Error('OpenAI API key missing (set environment variable OPENAI_API_KEY)')

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  const model = coachModel()
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: maxTokens,
    stream: false,
  }
  if (isKimiK2FamilyModel(model)) {
    body.thinking = { type: 'disabled' }
  }
  setCoachRequestTemperature(body, model, 0.58)
  if (outputFormat === 'json' && gameConfig.server.coachOpenAiJsonMode) {
    body.response_format = { type: 'json_object' }
  }

  try {
    const res = await fetch(openAiChatUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    return res
  } finally {
    clearTimeout(timer)
  }
}

async function callOpenAIChatStreamResponse(
  systemPrompt: string,
  userPrompt: string,
  timeoutMs: number,
  maxTokens: number,
): Promise<Response> {
  const key = resolveOpenAiApiKey()
  if (!key) throw new Error('OpenAI API key missing (set environment variable OPENAI_API_KEY)')

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  const model = coachModel()
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: maxTokens,
    stream: true,
  }
  if (isKimiK2FamilyModel(model)) {
    body.thinking = { type: 'disabled' }
  }
  setCoachRequestTemperature(body, model, 0.58)

  try {
    return await fetch(openAiChatUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

function safeParsePlayRecommendationJson(text: string): { action: 'play' | 'pass'; cardIds: string[] } | null {
  const cleaned = stripMarkdownFence(text.trim())
  const tryParse = (s: string): { action: 'play' | 'pass'; cardIds: string[] } | null => {
    try {
      const o = JSON.parse(s) as { action?: string; cardIds?: unknown }
      if (!o || typeof o !== 'object') return null
      const action = o.action === 'pass' ? 'pass' : o.action === 'play' ? 'play' : null
      if (!action) return null
      const cardIds = Array.isArray(o.cardIds)
        ? o.cardIds.filter((x): x is string => typeof x === 'string')
        : []
      return { action, cardIds }
    } catch {
      return null
    }
  }
  const direct = tryParse(cleaned)
  if (direct) return direct
  const m = cleaned.match(/\{[\s\S]*\}/)
  if (!m) return null
  return tryParse(m[0])
}

/** 出牌建议专用：较低 temperature，非流式，短 max_tokens */
async function callOpenAIPlayRecommendation(
  systemPrompt: string,
  userPrompt: string,
  timeoutMs: number,
): Promise<Response> {
  const key = resolveOpenAiApiKey()
  if (!key) throw new Error('OpenAI API key missing (set environment variable OPENAI_API_KEY)')

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  const model = coachModel()
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 500,
    stream: false,
  }
  if (isKimiK2FamilyModel(model)) {
    body.thinking = { type: 'disabled' }
  }
  /* 非 K2 默认略低；K2 仅允许 0.6（见 setCoachRequestTemperature） */
  setCoachRequestTemperature(body, model, 0.42)
  if (gameConfig.server.coachOpenAiJsonMode) {
    body.response_format = { type: 'json_object' }
  }

  try {
    return await fetch(openAiChatUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

export class ReasonEngine {
  /**
   * 仅调用非流式 Chat Completions，成功返回解析结果；任一步失败返回 null（不拼模板兜底）。
   * 供流式失败后的重试与 `generateReason` 共用。
   */
  private async invokeLlmNonStream(params: GenerateCoachReasonParams): Promise<ReasonResult | null> {
    const timeoutMs = gameConfig.server.coachReasonTimeoutMs
    const coachMode = params.coachMode ?? 'beginner'
    const maxTokens = maxTokensForMode(coachMode)

    try {
      console.log('[coach] LLM non-stream →', openAiChatUrl(), 'model=', coachModel())
      const varietySeed = randomInt(1, 0x7fffffff)
      const systemPrompt = buildCoachSystemPrompt({ coachMode, outputFormat: 'json' })
      const userPrompt = buildCoachUserPrompt({
        handCards: params.handCards,
        lastPlayedPattern: params.lastPlayedPattern,
        playedHistory: params.playedHistory,
        recommended: params.recommended,
        context: params.context,
        coachMode,
        outputFormat: 'json',
        varietySeed,
      })
      const res = await callOpenAIChat(systemPrompt, userPrompt, timeoutMs, maxTokens, 'json')
      const raw = await res.text()
      if (!res.ok) {
        console.warn(`[coach] LLM HTTP ${res.status}: ${raw.slice(0, 400)}`)
        return null
      }
      const data = JSON.parse(raw) as unknown
      const content = extractCompletionText(data)
      const parsed = safeJsonExtract(content)
      if (parsed?.reason && parsed.reason.trim()) {
        const text = parsed.reason.trim()
        console.log('[coach] LLM JSON reason ok, length=', text.length)
        return {
          text,
          confidence: parsed.confidence || 'medium',
        }
      }
      if (looksLikeChineseCoachReason(content)) {
        const text = content.trim()
        console.log('[coach] LLM plain-text reason ok, length=', text.length)
        return {
          text,
          confidence: 'medium',
        }
      }
      console.warn('[coach] LLM returned unparsable body, first chars:', content.slice(0, 200))
      return null
    } catch (e) {
      if (isAbortError(e)) {
        console.warn(
          `[coach] LLM non-stream timed out after ${timeoutMs}ms (AbortError). Check network/API or COACH_REASON_TIMEOUT_MS.`,
        )
      } else {
        console.warn('[coach] LLM non-stream request failed:', e)
      }
      return null
    }
  }

  async generateReasonStream(
    params: GenerateCoachReasonParams,
    onDelta: (chunk: string) => void,
  ): Promise<ReasonResult> {
    const timeoutMs = gameConfig.server.coachReasonTimeoutMs
    const useLLM = gameConfig.server.coachUseLlm
    const useStream = gameConfig.server.coachUseStream

    const fallback = (): ReasonResult => ({
      text: buildFallbackReason({
        recommended: params.recommended,
        lastPlayedPattern: params.lastPlayedPattern,
        handCards: params.handCards,
        context: params.context,
      }),
      confidence: 'low',
    })

    if (!useLLM || !resolveOpenAiApiKey()) {
      if (!useLLM) {
        console.log('[coach] 使用模板兜底：COACH_USE_LLM=false')
      } else {
        console.log('[coach] 使用模板兜底：未设置 OPENAI_API_KEY（或为空）')
      }
      const r = fallback()
      if (r.text) onDelta(r.text)
      return r
    }

    if (!useStream) {
      const r = await this.generateReason(params)
      if (r.text) onDelta(r.text)
      return r
    }

    try {
      console.log('[coach] LLM stream →', openAiChatUrl(), 'model=', coachModel())
      const varietySeed = randomInt(1, 0x7fffffff)
      const maxTokens = maxTokensForMode(params.coachMode)
      const systemPrompt = buildCoachSystemPrompt({
        coachMode: params.coachMode,
        outputFormat: 'stream_plain',
      })
      const userPrompt = buildCoachUserPrompt({
        handCards: params.handCards,
        lastPlayedPattern: params.lastPlayedPattern,
        playedHistory: params.playedHistory,
        recommended: params.recommended,
        context: params.context,
        coachMode: params.coachMode,
        outputFormat: 'stream_plain',
        varietySeed,
      })

      const res = await callOpenAIChatStreamResponse(systemPrompt, userPrompt, timeoutMs, maxTokens)
      if (!res.ok) {
        const raw = await res.text()
        throw new Error(`OpenAI HTTP ${res.status}: ${raw.slice(0, 500)}`)
      }
      if (!res.body) {
        const raw = await res.text()
        throw new Error(`empty stream body: ${raw.slice(0, 200)}`)
      }

      const full = await consumeOpenAIChatSse(res, onDelta)
      const text = full.trim()
      if (text.length >= 8) {
        console.log('[coach] LLM stream ok, length=', text.length)
        return { text, confidence: 'medium' }
      }
      console.warn('[coach] LLM stream empty or too short, retrying non-stream…')
      const retry = await this.invokeLlmNonStream(params)
      if (retry?.text?.trim()) {
        onDelta(retry.text)
        return retry
      }
      throw new Error('empty stream content')
    } catch (e) {
      if (isAbortError(e)) {
        console.warn(
          `[coach] LLM stream timed out after ${timeoutMs}ms (AbortError), will try non-stream then fallback.`,
        )
      } else {
        console.warn('[coach] LLM stream failed, will try non-stream then fallback:', e)
      }
      const retry = await this.invokeLlmNonStream(params)
      if (retry?.text?.trim()) {
        onDelta(retry.text)
        return retry
      }
      const r = fallback()
      if (r.text) onDelta(r.text)
      return r
    }
  }

  /** 非流式（回退或 COACH_USE_STREAM=false） */
  async generateReason(params: GenerateCoachReasonParams): Promise<ReasonResult> {
    const useLLM = gameConfig.server.coachUseLlm

    if (!useLLM) {
      console.log('[coach] generateReason：模板兜底（COACH_USE_LLM=false）')
      return {
        text: buildFallbackReason({
          recommended: params.recommended,
          lastPlayedPattern: params.lastPlayedPattern,
          handCards: params.handCards,
          context: params.context,
        }),
        confidence: 'low',
      }
    }

    if (!resolveOpenAiApiKey()) {
      console.log('[coach] generateReason：模板兜底（无 OPENAI_API_KEY）')
      return {
        text: buildFallbackReason({
          recommended: params.recommended,
          lastPlayedPattern: params.lastPlayedPattern,
          handCards: params.handCards,
          context: params.context,
        }),
        confidence: 'low',
      }
    }

    const fromLlm = await this.invokeLlmNonStream(params)
    if (fromLlm) return fromLlm

    console.log('[coach] generateReason：LLM 解析失败，使用模板兜底')
    return {
      text: buildFallbackReason({
        recommended: params.recommended,
        lastPlayedPattern: params.lastPlayedPattern,
        handCards: params.handCards,
        context: params.context,
      }),
      confidence: 'low',
    }
  }

  /**
   * 与教练「出牌建议」同源：校验通过的 Card[] 或 pass；失败返回 null。
   * 供 AI 回合在规则引擎无法落子时兜底调用。
   */
  async fetchLlmValidatedPlay(
    input: BuildCoachHintInput,
    judgeCtx: JudgeContext,
  ): Promise<{ action: 'play'; cards: Card[] } | { action: 'pass' } | null> {
    if (!gameConfig.server.coachUseLlm || !resolveOpenAiApiKey()) return null

    const timeoutMs = gameConfig.server.coachReasonTimeoutMs
    const sys = buildCoachPlayRecommendationSystemPrompt()
    const user = buildCoachPlayRecommendationUserPrompt({
      handCards: input.handCards,
      lastPlayedPattern: input.lastPlayedPattern,
      playedHistory: input.playedHistory,
      context: input.context,
    })

    try {
      const res = await callOpenAIPlayRecommendation(sys, user, timeoutMs)
      const raw = await res.text()
      if (!res.ok) {
        console.warn('[coach] play recommendation HTTP', res.status, raw.slice(0, 400))
        return null
      }
      let data: unknown
      try {
        data = JSON.parse(raw) as unknown
      } catch {
        console.warn('[coach] play recommendation response is not JSON:', raw.slice(0, 240))
        return null
      }
      const content = extractCompletionText(data)
      const parsed = safeParsePlayRecommendationJson(content)
      if (!parsed) {
        console.warn('[coach] play recommendation JSON parse failed:', content.slice(0, 320))
        return null
      }
      const v = validateLlmPlayRecommendation(
        parsed.action,
        parsed.cardIds,
        input.handCards,
        input.lastPlayedPattern,
        judgeCtx,
        input.context.lastPlayerIndex,
      )
      if (!v.ok) {
        console.warn('[coach] LLM 出牌建议未通过校验:', v.reason)
        return null
      }
      if (parsed.action === 'pass') {
        return { action: 'pass' }
      }
      console.log('[coach] 出牌建议来自 LLM')
      return { action: 'play', cards: v.cards }
    } catch (e) {
      if (isAbortError(e)) {
        console.warn('[coach] play recommendation timeout (AbortError)')
      } else {
        console.warn('[coach] fetchLlmValidatedPlay failed:', e)
      }
      return null
    }
  }

  /**
   * 由大模型推理本步出牌（或不出）；校验不通过或请求失败时返回 null，由调用方回退规则引擎。
   */
  async fetchLlmPlayRecommendation(
    input: BuildCoachHintInput,
    judgeCtx: JudgeContext,
  ): Promise<CoachRecommended | null> {
    const raw = await this.fetchLlmValidatedPlay(input, judgeCtx)
    if (!raw) return null
    if (raw.action === 'pass') {
      return { action: 'pass', cards: [], patternType: null }
    }
    return toCoachRecommendedFromCards(raw.cards, judgeCtx)
  }
}
