import type { Card, CardRank } from '../game/rules.js'

/** 教练讲解模式：高手简要 / 新手详尽 */
export type CoachHintMode = 'expert' | 'beginner'

export type CoachErrorCode =
  | 'COACH_ROOM_NOT_FOUND'
  | 'COACH_NOT_AVAILABLE_MODE'
  | 'COACH_NOT_YOUR_TURN'
  | 'COACH_REQUEST_PLAYER_IS_AI'
  | 'COACH_HINT_DISABLED'
  | 'COACH_INTERNAL_ERROR'

/** 教练可见的公开局势（不含他家具体牌面） */
export interface CoachGameContext {
  /** 当前打几（升级进度） */
  currentLevel: number
  levelRank: CardRank
  roundNumber: number
  firstPlayerIndex: number
  lastPlayerIndex: number
  currentPlayerIndex: number
  /** 请求者座位 0-3 */
  myPosition: number
  seats: Array<{
    position: number
    name: string
    remainingCards: number
    isAI: boolean
  }>
  /** 本副已出完牌的顺序（可能 0～4 项），用于判断终局节奏 */
  roundFinishOrder: number[]
}

export interface CoachRecommended {
  action: 'play' | 'pass'
  cards: string[]
  patternType: string | null
}

export interface CoachHintSuccessPayload {
  ok: true
  roomId: string
  requestId: string
  recommended: CoachRecommended
  reason: string
  confidence?: 'low' | 'medium' | 'high'
}

export interface CoachHintErrorPayload {
  ok: false
  roomId: string
  requestId: string
  errorCode: CoachErrorCode
  errorMessage: string
}

export type CoachHintPayload = CoachHintSuccessPayload | CoachHintErrorPayload

export interface BuildCoachHintInput {
  roomId: string
  handCards: Card[]
  lastPlayedPattern: any
  playedHistory: Array<{
    cards: Card[]
    pattern: any
    /** 出这一手的座位 0-3 */
    position: number
  }>
  /** 场上公开信息，供 LLM 综合判断 */
  context: CoachGameContext
  /** 默认 beginner */
  coachMode?: CoachHintMode
}

/** 流式：先下发推荐，再逐段下发思路 */
export interface CoachHintStreamStartPayload {
  roomId: string
  requestId: string
  recommended: CoachRecommended
  coachMode: CoachHintMode
}

export interface CoachHintStreamChunkPayload {
  roomId: string
  requestId: string
  text: string
}

export interface CoachHintStreamEndPayload {
  ok: true
  roomId: string
  requestId: string
  reason: string
  confidence?: 'low' | 'medium' | 'high'
}

export interface BuildCoachHintResult {
  recommended: CoachRecommended
  reason: string
  confidence?: 'low' | 'medium' | 'high'
}

