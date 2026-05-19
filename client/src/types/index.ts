export type CardSuit = 'spades' | 'hearts' | 'clubs' | 'diamonds' | 'joker'
export type CardRank = '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | '2' | 'SJ' | 'BJ'

export interface Card {
  id: string
  suit: CardSuit
  rank: CardRank
  value: number
}

export type CardPatternType = 
  | 'single'
  | 'pair'
  | 'triple'
  | 'triple_with_pair'
  | 'straight'
  | 'straight_pair'
  | 'triple_run'
  | 'bomb'
  | 'straight_bomb'
  | 'joker_bomb'

export interface CardPattern {
  type: CardPatternType
  cards: Card[]
  mainValue: number
}

export type PlayerPosition = 'top' | 'right' | 'bottom' | 'left'

export interface Player {
  id: string
  name: string
  position: PlayerPosition
  isAI: boolean
  isHost?: boolean
  cards: Card[]
  isReady: boolean
  isOnline: boolean
  level: number
  isWinner?: boolean
}

export type GameStatus = 
  | 'waiting'
  | 'dealing'
  | 'playing'
  | 'tribute'
  | 'round_end'
  | 'game_over'

export interface TributeAction {
  type: 'tribute' | 'return'
  from: number
  to: number
}

export interface GameState {
  roomId: string
  status: GameStatus
  players: Player[]
  currentPlayerIndex: number
  playedCards: Array<{
    position: number
    cards: Card[]
    pattern: CardPattern | null
  }>
  currentLevel: number
  levelRank: CardRank
  lastRoundRanking: number[] | null
  lastPlayedPattern: CardPattern | null
  lastPlayerIndex: number
  firstPlayerIndex: number
  roundNumber: number
  /** 本副已确定名次（与 server 一致时存在） */
  roundFinishOrder?: number[]
  tributeQueue: TributeAction[] | null
  tributeStepIndex: number
}

export interface ChatMessage {
  id: string
  playerId: string
  playerName: string
  content: string
  type: 'text' | 'emoji' | 'system'
  timestamp: number
}

export interface Room {
  id: string
  name: string
  players: Player[]
  maxPlayers: number
  isPrivate: boolean
  password?: string
  createdAt: number
}

export interface GameConfig {
  mode: 'local' | 'online'
  aiDifficulty: 'easy' | 'normal' | 'hard'
  playerName: string
}

export type CoachHintMode = 'expert' | 'beginner'

export interface CoachRecommended {
  action: 'play' | 'pass'
  cards: string[]
  patternType: string | null
}

export interface CoachHintPayload {
  ok: boolean
  roomId: string
  requestId: string
  recommended?: CoachRecommended
  reason?: string
  confidence?: 'low' | 'medium' | 'high'
  errorCode?: string
  errorMessage?: string
}

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

export interface CoachHintState {
  loading: boolean
  reasonStreaming: boolean
  coachMode: CoachHintMode | null
  requestId: string | null
  recommended: CoachRecommended | null
  reason: string | null
  confidence: 'low' | 'medium' | 'high' | null
  errorCode: string | null
  errorMessage: string | null
}
