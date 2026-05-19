/**
 * =============================================================================
 * 服务端环境变量说明（process.env）
 * =============================================================================
 * 下列变量均为可选，除非特别说明；未设置时使用 `server.defaults.ts` 中的默认值。
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 一、HTTP 服务                                                             │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * PORT
 *   中文：Node 监听端口。
 *   默认：3001（见 server.defaults.ts 的 httpPort）
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 二、OpenAI 兼容 API（教练 LLM、部分 AI 能力共用）                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * OPENAI_API_KEY
 *   中文：API 密钥。教练功能调用大模型时必填（否则走本地兜底文案）。
 *   安全：切勿提交到仓库；生产环境请用环境变量或密钥管理服务。
 *
 * OPENAI_API_BASE
 *   中文：API 根地址，无尾部斜杠；实际请求会拼接 `/chat/completions`。
 *   示例：https://api.moonshot.cn/v1（Moonshot / Kimi）
 *   默认：见 server.defaults.ts 的 defaultOpenAiApiBase
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 三、教练（Coach）功能开关与模型行为                                        │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * COACH_HINT_ENABLED
 *   中文：是否允许客户端请求教练提示。
 *   取值：设为字符串 `false` 时关闭；其它或未设置为开启。
 *
 * COACH_USE_LLM
 *   中文：是否调用大模型生成思路；关闭则始终使用服务端模板兜底。
 *   取值：设为字符串 `false` 时关闭；其它或未设置为开启。
 *
 * COACH_USE_STREAM
 *   中文：教练思路是否使用 SSE 流式输出（需 API 支持 stream）。
 *   取值：设为字符串 `false` 时改为单次非流式请求；其它或未设置为开启。
 *
 * COACH_OPENAI_MODEL
 *   中文：教练使用的模型 ID（覆盖默认 kimi-k2.5 等）。
 *
 * COACH_REASON_TIMEOUT_MS
 *   中文：教练请求大模型的超时时间（毫秒）。云端较慢时可适当加大。
 *
 * COACH_OPENAI_TEMPERATURE
 *   中文：采样温度（仅非 Kimi K2 系列模型使用本变量；Kimi K2.x 固定为 0.6，否则 Moonshot 会 400）。
 *   未设置时非 K2 模型使用内置默认（约 0.58）。
 *
 * COACH_OPENAI_JSON_MODE
 *   中文：非流式模式下是否请求 `response_format: json_object`（依赖供应商支持）。
 *   取值：设为字符串 `true` 时开启。
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 四、其它（AI 出牌等模块，非本文件组装的 gameConfig）                        │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ANTHROPIC_API_KEY
 *   中文：若使用 Anthropic 相关封装时会读取（见 `ai/llm.ts`）。
 *
 * =============================================================================
 */

import { serverRuntimeDefaults, type ServerRuntimeDefaults } from './server.defaults.js'

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') return fallback
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

function parseOptionalPositiveNumber(raw: string | undefined): number | undefined {
  if (raw === undefined || raw.trim() === '') return undefined
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

/** 解析后的服务端运行时配置（供 gameConfig.server 使用） */
export interface ResolvedServerGameConfig {
  httpPort: number
  aiPlayDelayMs: number
  aiPassDelayMs: number
  tributeStepDelayMs: number
  coachReasonTimeoutMs: number
  /** 解析后的教练用模型 ID */
  coachLlmModel: string
  openAiApiBase: string
  openAiApiKey: string
  coachUseLlm: boolean
  coachUseStream: boolean
  coachHintEnabled: boolean
  /** 非 Kimi K2 时作为 temperature；undefined 表示使用 reason-engine 内建默认 */
  coachOpenAiTemperature: number | undefined
  coachOpenAiJsonMode: boolean
}

/**
 * 根据环境变量与 `serverRuntimeDefaults` 生成最终写入 `gameConfig.server` 的对象。
 */
export function buildResolvedServerConfig(
  defaults: ServerRuntimeDefaults = serverRuntimeDefaults,
): ResolvedServerGameConfig {
  const openAiApiBase =
    process.env.OPENAI_API_BASE?.trim() || defaults.defaultOpenAiApiBase.replace(/\/$/, '')

  const openAiApiKey = process.env.OPENAI_API_KEY?.trim() || ''

  const coachLlmModel =
    process.env.COACH_OPENAI_MODEL?.trim() || defaults.coachDefaultOpenAiModel

  const coachReasonTimeoutMs = parsePositiveInt(
    process.env.COACH_REASON_TIMEOUT_MS,
    defaults.coachReasonTimeoutMs,
  )

  return {
    httpPort: parsePositiveInt(process.env.PORT, defaults.httpPort),
    aiPlayDelayMs: defaults.aiPlayDelayMs,
    aiPassDelayMs: defaults.aiPassDelayMs,
    tributeStepDelayMs: defaults.tributeStepDelayMs,
    coachReasonTimeoutMs,
    coachLlmModel,
    openAiApiBase,
    openAiApiKey,
    coachUseLlm: process.env.COACH_USE_LLM !== 'false',
    coachUseStream: process.env.COACH_USE_STREAM !== 'false',
    coachHintEnabled: process.env.COACH_HINT_ENABLED !== 'false',
    coachOpenAiTemperature: parseOptionalPositiveNumber(process.env.COACH_OPENAI_TEMPERATURE),
    coachOpenAiJsonMode: process.env.COACH_OPENAI_JSON_MODE === 'true',
  }
}
