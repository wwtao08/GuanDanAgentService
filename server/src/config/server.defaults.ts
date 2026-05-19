/**
 * 服务端「非密钥」类默认值：可被 `env.ts` 中的环境变量覆盖后写入 `gameConfig.server`。
 */
export const serverRuntimeDefaults = {
  /** HTTP 服务监听端口（可被环境变量 PORT 覆盖） */
  httpPort: 3001,

  /**
   * AI 出完一手牌后，等待多少毫秒再执行下一步（出牌或进贡等），用于控制对局节奏
   */
  aiPlayDelayMs: 1000,

  /**
   * AI 选择「不要/过」后，等待多少毫秒再轮到后续逻辑
   */
  aiPassDelayMs: 500,

  /**
   * 进贡、还牌阶段，AI 自动步骤之间的间隔（毫秒），便于玩家看清过程
   */
  tributeStepDelayMs: 550,

  /**
   * 教练调用大模型生成「思路」时的请求超时（毫秒）
   * 对应环境变量：COACH_REASON_TIMEOUT_MS
   */
  coachReasonTimeoutMs: 25_000,

  /**
   * 教练默认使用的模型 ID（OpenAI 兼容接口）
   * 对应环境变量：COACH_OPENAI_MODEL
   */
  coachDefaultOpenAiModel: 'kimi-k2.5',

  /**
   * 未设置 OPENAI_API_BASE 时，OpenAI 兼容 API 的根地址（无尾部斜杠）
   * 例如 Moonshot：`https://api.moonshot.cn/v1`
   */
  defaultOpenAiApiBase: 'https://api.moonshot.cn/v1',
} as const

export type ServerRuntimeDefaults = typeof serverRuntimeDefaults
