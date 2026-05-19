import type { Card } from '../game/rules.js'
import type { CoachGameContext, CoachHintMode, CoachRecommended } from './types.js'
import { buildCoachReferenceNotes } from './fallback-reason.js'
import {
  describePressureFromLastPlay,
  describeSeatPlayLine,
  humanCardName,
} from './coach-narration.js'
import { buildCoachVarietyBlock, buildProverbMandateBlock } from './coach-knowledge-base.js'
import {
  buildHandStructureSummary,
  buildHandValueTopLine,
  buildPartnerAndThreatLine,
  buildRoundFinishLine,
  buildSeatsLine,
  buildTrickLine,
  relSeatLabel,
} from './hand-context.js'
import { GUANDAN_PLAY_RULES_BLOCK, GUANDAN_TERMINOLOGY_BLOCK } from './guandan-rules-prompt.js'

function historyLinesWithSeats(
  playedHistory: Array<{ pattern: any; cards?: Card[]; position: number }>,
  myPosition: number,
): string {
  if (!playedHistory.length) return '（本圈尚无出牌记录）'
  const tail = playedHistory.slice(-8)
  return tail
    .map((h, i) => {
      const step = playedHistory.length - tail.length + i + 1
      const who = relSeatLabel(myPosition, h.position)
      return `第 ${step} 手：${describeSeatPlayLine(who, h.pattern)}`
    })
    .join('\n')
}

/** 本副全部已出牌记录（出牌建议用，避免只看最近几手） */
function fullHistoryLinesWithSeats(
  playedHistory: Array<{ pattern: any; cards?: Card[]; position: number }>,
  myPosition: number,
): string {
  if (!playedHistory.length) return '（本副尚未有人出牌）'
  return playedHistory
    .map((h, i) => {
      const who = relSeatLabel(myPosition, h.position)
      return `第 ${i + 1} 手：${describeSeatPlayLine(who, h.pattern)}`
    })
    .join('\n')
}

/** 上一手结构化描述，便于模型比对牌型与主值 */
function lastPlayedPatternDetail(pattern: any, lastPlayerIndex: number, myPosition: number): string {
  if (!pattern || lastPlayerIndex < 0) {
    return '无（你为本圈首家领出，可任选合法牌型出牌；不能选「不出」）。'
  }
  const who = relSeatLabel(myPosition, lastPlayerIndex)
  const type = pattern?.type != null ? String(pattern.type) : '未知'
  const main = pattern?.mainValue != null ? String(pattern.mainValue) : '未知'
  const n = Array.isArray(pattern?.cards) ? pattern.cards.length : '?'
  return [
    `出牌方：${who}（座位 ${lastPlayerIndex}）`,
    `牌型代号：${type}；张数：${n}；用于比大小的主牌力值（程序内）：${main}`,
    `口语复述：${describeSeatPlayLine(who, pattern)}`,
  ].join('\n')
}

export type CoachPromptOutputFormat = 'json' | 'stream_plain'

/** 系统角色：场外教练、第三人称牌桌描述；推理优先 */
export function buildCoachSystemPrompt(options: {
  coachMode: CoachHintMode
  outputFormat: CoachPromptOutputFormat
}): string {
  const { coachMode, outputFormat } = options
  const modeBlock =
    coachMode === 'expert'
      ? [
          '【讲解模式：高手】',
          '· 总字数控制在约 90～120 字（中文）；1～3 句即可。',
          '· 只写：关键矛盾或压力点 + 为何这步推荐合理 + 一句风险；禁止铺垫、重复、排比。',
          '· 顺口溜/俗语最多点一句，或不写。',
        ]
      : [
          '【讲解模式：新手】',
          '· 总字数控制在约 200～260 字（中文）；约 3～5 句，一段说完。',
          '· 简要交代局面压力 + 推荐依据 + 主要风险即可；不写长段落、不展开多种分支。',
          '· 顺口溜/俗语最多一两句；不要列「要点一二三」。',
        ]

  const identity = [
    '身份：你是坐在牌桌旁教玩家打牌的「掼蛋教练」，不是玩家本人。',
    '· 对学员用第二人称「你」给建议（例如「建议你…」「你这手可以…」）。',
    '· 描述牌桌、对手、队友时用第三人称（本家、对家、上家、下家、敌方等），不要说「我出」「咱们这手」「我这把牌」等第一人称代玩家出牌。',
    '',
    ...modeBlock,
    '',
    '用户消息含局面数据、本步推荐、算法摘要与俗语参考；你应内化后**压缩表达**，勿复述各节标题。',
    '只根据已有信息推理，不得断言对手未公开手牌。牌型名称用中文。',
    '',
    GUANDAN_TERMINOLOGY_BLOCK,
  ]

  if (outputFormat === 'stream_plain') {
    return [
      ...identity,
      '',
      '输出格式：直接输出一段连贯中文（纯文本），不要使用 JSON、不要 Markdown 代码块、不要前缀「reason：」。',
      coachMode === 'expert'
        ? '篇幅务必短：宁少勿多，写完后若超过约 120 字须自行删繁就简。'
        : '篇幅务必克制：宁少勿多，写完后若超过约 260 字须自行删繁就简。',
    ].join('\n')
  }

  return [
    ...identity,
    '',
    '输出格式：仅输出一个 JSON 对象，无其它文字。格式：',
    '{"reason":"你的策略解读","confidence":"low|medium|high"}',
    'confidence 表示你对该解读的把握程度。',
  ].join('\n')
}

export function buildCoachUserPrompt(params: {
  handCards: Card[]
  lastPlayedPattern: any
  playedHistory: Array<{ pattern: any; cards?: Card[]; position: number }>
  recommended: CoachRecommended
  context: CoachGameContext
  coachMode: CoachHintMode
  outputFormat: CoachPromptOutputFormat
  /** 每次请求不同，驱动表达角度与顺口溜聚焦，减少千篇一律 */
  varietySeed: number
}): string {
  const { handCards, lastPlayedPattern, playedHistory, recommended, context, varietySeed, coachMode, outputFormat } =
    params

  const seatInfos = context.seats.map((s) => ({
    position: s.position,
    name: s.name,
    remainingCards: s.remainingCards,
    isAI: s.isAI,
  }))
  const handList = handCards.map(humanCardName).join('、')
  const handStruct = buildHandStructureSummary(handCards, context.levelRank)
  const valueTop = buildHandValueTopLine(handCards)
  const seatsLine = buildSeatsLine(seatInfos, context.myPosition)
  const partnerThreat = buildPartnerAndThreatLine(seatInfos, context.myPosition)
  const finishLine = buildRoundFinishLine(context.roundFinishOrder, context.myPosition)
  const trickLine = buildTrickLine({
    firstPlayerIndex: context.firstPlayerIndex,
    lastPlayerIndex: context.lastPlayerIndex,
    currentPlayerIndex: context.currentPlayerIndex,
    myPosition: context.myPosition,
  })

  const rec =
    recommended.action === 'pass'
      ? '【本步推荐】不出（过）'
      : `【本步推荐】出牌：${recommended.patternType || '牌型'}，具体牌面：${recommended.cards.join('、')}`

  return [
    '—— 公开局势 ——',
    `当前打「${context.currentLevel}」；级牌（逢人配基准）为：${context.levelRank}；第 ${context.roundNumber} 副。`,
    `各座位剩余张数：${seatsLine}`,
    `队友与压力：${partnerThreat}`,
    `本副名次进度：${finishLine}`,
    trickLine,
    '',
    '—— 本圈出牌（口语：谁出了什么；不含未公开手牌）——',
    historyLinesWithSeats(playedHistory, context.myPosition),
    '',
    '—— 我方手牌（完整列表，仅供本家）——',
    `列表：${handList}`,
    `结构摘要：${handStruct}`,
    valueTop,
    '',
    '—— 上一手（口语，你要压的牌）——',
    describePressureFromLastPlay(context.myPosition, context.lastPlayerIndex, lastPlayedPattern),
    '',
    '—— 算法侧摘要（非最终答案，勿照抄句式）——',
    buildCoachReferenceNotes({
      recommended,
      lastPlayedPattern,
      handCards,
      context,
    }),
    '',
    '—— 请解读的推荐动作 ——',
    rec,
    '',
    '—— 表达与俗语（轻量约束，勿写成套话填空）——',
    buildCoachVarietyBlock(varietySeed),
    '',
    buildProverbMandateBlock({
      context,
      handCards,
      playedHistoryLength: playedHistory.length,
      recommendedAction: recommended.action === 'pass' ? 'pass' : 'play',
      varietySeed,
    }),
    '',
    '—— 任务 ——',
    coachMode === 'expert'
      ? '第三人称牌桌描述；紧扣「推荐动作」：矛盾/压力 → 为何合理 → 一句风险。**总字数约 120 字内**，短句为主。'
      : '第三人称牌桌描述；交代压力与依据，点出主要风险即可。**总字数约 260 字内**，勿写成长篇。',
    '禁止逐段复述用户消息里的小标题；禁止列清单体；俗语从简。',
    '',
    outputFormat === 'stream_plain'
      ? '请直接输出纯文本（可不分段）；写完若超长请自行压缩后再输出。'
      : '请输出 JSON；reason 字段同样遵守上述字数上限。',
  ].join('\n')
}

/** 仅用于「本步出牌建议」：输出 play+cardIds 或 pass */
export function buildCoachPlayRecommendationSystemPrompt(): string {
  return [
    '你是掼蛋专家级「出牌决策」模型。用户会提供完整公开局面与手牌 id 列表。',
    '你必须**自主综合判断**本步应出哪一手（或不出），像真人牌手一样权衡：规则可行性、牌力分配、队友与对手剩余张数、本圈与升级节奏；不要输出「按算法建议」或机械套用固定套路。',
    '',
    GUANDAN_TERMINOLOGY_BLOCK,
    '',
    '—— 游戏规则与局面要点 ——',
    GUANDAN_PLAY_RULES_BLOCK,
    '',
    '—— 输出格式（仅此一项，禁止其它文字）——',
    '只能使用用户给出的「手牌 id」逐字复制到 cardIds；禁止编造 id。',
    '若本圈须跟牌且你选择出牌，则所选 id 对应的一手牌必须在规则上能压过「上一手」；若选不出则 action 为 pass。',
    '若你为本圈首家领出，必须 action=play 且 cardIds 非空。',
    '只输出一个 JSON 对象：',
    '{"action":"play","cardIds":["id1","id2"]} 或 {"action":"pass","cardIds":[]}',
  ].join('\n')
}

export function buildCoachPlayRecommendationUserPrompt(params: {
  handCards: Card[]
  lastPlayedPattern: any
  playedHistory: Array<{ pattern: any; cards?: Card[]; position: number }>
  context: CoachGameContext
}): string {
  const { handCards, lastPlayedPattern, playedHistory, context } = params
  const seatInfos = context.seats.map((s) => ({
    position: s.position,
    name: s.name,
    remainingCards: s.remainingCards,
    isAI: s.isAI,
  }))
  const canPass = context.lastPlayerIndex !== -1
  const handLines = handCards.map((c) => `${c.id}\t${humanCardName(c)}`)
  const seatsLine = buildSeatsLine(seatInfos, context.myPosition)
  const partnerThreat = buildPartnerAndThreatLine(seatInfos, context.myPosition)
  const finishLine = buildRoundFinishLine(context.roundFinishOrder, context.myPosition)
  const trickLine = buildTrickLine({
    firstPlayerIndex: context.firstPlayerIndex,
    lastPlayerIndex: context.lastPlayerIndex,
    currentPlayerIndex: context.currentPlayerIndex,
    myPosition: context.myPosition,
  })
  const handStruct = buildHandStructureSummary(handCards, context.levelRank)
  const valueTop = buildHandValueTopLine(handCards)
  const lpIdx = context.lastPlayerIndex

  return [
    '—— 升级与公开信息 ——',
    `当前打「${context.currentLevel}」；级牌点数（逢人配基准）：${context.levelRank}；本局第 ${context.roundNumber} 副。`,
    `各座位剩余张数：${seatsLine}`,
    `队友与敌方压力（仅张数）：${partnerThreat}`,
    `本副已出完名次（若有）：${finishLine}`,
    trickLine,
    `当前是否允许「不出」：${canPass ? '是——本圈已有上家出牌，你在跟牌，可压过或不出' : '否——你是本圈首家领出，必须出至少一手合法牌，不能选不出'}`,
    '',
    '—— 本副已发生的全部出牌（按时间顺序；方位相对「本家」）——',
    fullHistoryLinesWithSeats(playedHistory, context.myPosition),
    '',
    '—— 你本步必须应对的「上一手」（若首家领出则无）——',
    lastPlayedPatternDetail(lastPlayedPattern, lpIdx, context.myPosition),
    describePressureFromLastPlay(context.myPosition, lpIdx, lastPlayedPattern),
    '',
    '—— 本家完整手牌（仅你可见；每行 id<TAB>展示名；出牌时 id 必须逐字从下列复制）——',
    handLines.join('\n'),
    `手牌结构摘要：${handStruct}`,
    valueTop,
    '',
    '请根据以上规则与局面，**自主判断**本步最优出牌（或不出），只输出 JSON。',
  ].join('\n')
}
