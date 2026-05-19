import type { Card, CardRank } from '../game/rules.js'
import type { CoachGameContext } from './types.js'

/**
 * 掼蛋民间教学顺口溜 / 口诀（本地知识库，供教练 LLM 作文化背景与经验参考）。
 * 说明：各地打法略有差异，条目以常见说法为主；模型应结合当前局面取舍，不可生搬硬套。
 */
export interface CoachProverbEntry {
  /** 顺口溜或短句本身 */
  line: string
  /** 适用场景或含义提示，便于模型理解 */
  gist?: string
}

export const COACH_GUANDAN_PROVERBS: ReadonlyArray<CoachProverbEntry> = [
  { line: '情况不明，对子先行', gist: '信息不足时用小对试探，少拆结构' },
  { line: '情况不明，小对先行', gist: '与「对子先行」同义，开局试探常见' },
  { line: '枪不打四', gist: '对手报四张左右时，慎用炸弹以免帮对方理顺' },
  { line: '枪打四，不炸也要防', gist: '四张往往是组合牌，施压方式需斟酌' },
  { line: '三不带，怪怪怪', gist: '三不带在部分局况下易被压或浪费节奏' },
  { line: '三不带，独怪怪', gist: '与上条同系说法；是否三不带看手牌结构' },
  { line: '三带两，稳又好', gist: '三带二较常见，易与顺子、钢板等衔接' },
  { line: '小牌先走，大牌留后', gist: '抢上游时先清小牌，关键张控尾' },
  { line: '逢人配，关键牌', gist: '红桃级牌作万能，组炸弹、补缺门要算清' },
  { line: '逢人配，配大牌', gist: '好钢用在刀刃上，别轻易配散' },
  { line: '上家不放，下家不亮', gist: '跟牌与顶牌要配合，避免乱送下家' },
  { line: '对家剩少，能送则送', gist: '队友快走完时，优先送牌而非抢权' },
  { line: '对手剩五，出牌出两', gist: '残局张数口诀的一种，需结合牌型判断' },
  { line: '对手剩六，能打三夯', gist: '残局可尝试用三同连、夯等控节奏' },
  { line: '炸七不炸八', gist: '民间经验，是否开炸要看牌权与分值' },
  { line: '该炸不炸，等于白打', gist: '有压制机会且值得时，炸弹要敢用' },
  { line: '王炸在手，心里有数', gist: '王炸最大，出手时机决定胜负' },
  { line: '顺子多，走得快', gist: '顺子利于脱手，但别拆光炸弹' },
  { line: '钢板一响，黄金万两', gist: '钢板（六张）压制力强，注意出牌时机' },
  { line: '连对三副，步步为营', gist: '三连对节奏长，易被反制，留后手' },
  { line: '头游二游，升级不愁', gist: '双上升级多，配合比个人秀重要' },
  { line: '保三游，不垫底', gist: '劣势时先求不脱后腿，再谋升级' },
  { line: '单张走头，对子殿后', gist: '领出时小单常见，对子保结构' },
  { line: '牌弱跟牌，牌强顶牌', gist: '强弱与位置决定跟还是顶' },
  { line: '记牌不清，输得真明', gist: '记大、记炸、记已出，减少低级失误' },
  { line: '饭前不掼蛋，等于没吃饭', gist: '戏谑；社交局与竞技思路要分清' },
]

/**
 * 注入用户提示的格式化文本（编号列表，便于模型扫读）
 */
export function formatProverbsForPrompt(entries: ReadonlyArray<CoachProverbEntry> = COACH_GUANDAN_PROVERBS): string {
  return entries
    .map((e, i) => {
      const g = e.gist ? ` —— ${e.gist}` : ''
      return `${i + 1}. ${e.line}${g}`
    })
    .join('\n')
}

/**
 * 完整知识库块 + 与当前公开张数相关的轻量提示（非强制结论）
 */
function isFengRenPei(card: Card, levelRank: CardRank): boolean {
  return card.suit === 'hearts' && card.rank === levelRank
}

/** 为单次请求选几条「优先呼应」的顺口溜 + 随机一条，增强多样性与可引用性 */
export function buildProverbMandateBlock(params: {
  context: CoachGameContext
  handCards: Card[]
  playedHistoryLength: number
  recommendedAction: 'play' | 'pass'
  varietySeed: number
}): string {
  const { context, handCards, playedHistoryLength, recommendedAction, varietySeed } = params
  const my = context.myPosition
  const partner = (my + 2) % 4
  const levelRank = context.levelRank

  const byLine = new Map(COACH_GUANDAN_PROVERBS.map((e) => [e.line, e]))

  const chosen: CoachProverbEntry[] = []
  const pushLine = (line: string) => {
    const e = byLine.get(line)
    if (e && !chosen.some((x) => x.line === line)) chosen.push(e)
  }

  const enemy4 = context.seats.some(
    (s) => s.position !== my && s.position !== partner && s.remainingCards === 4,
  )
  if (enemy4) {
    pushLine('枪不打四')
    pushLine('枪打四，不炸也要防')
  }

  const ps = context.seats.find((s) => s.position === partner)
  if (ps && ps.remainingCards > 0 && ps.remainingCards <= 8) {
    pushLine('对家剩少，能送则送')
  }

  let feng = 0
  for (const c of handCards) {
    if (isFengRenPei(c, levelRank)) feng++
  }
  if (feng >= 1) {
    pushLine('逢人配，关键牌')
  }

  if (playedHistoryLength <= 1) {
    pushLine('情况不明，对子先行')
  }

  if (recommendedAction === 'pass') {
    pushLine('牌弱跟牌，牌强顶牌')
  } else {
    pushLine('小牌先走，大牌留后')
  }

  const idx = Math.abs(varietySeed) % COACH_GUANDAN_PROVERBS.length
  const wild = COACH_GUANDAN_PROVERBS[idx]
  if (!chosen.some((x) => x.line === wild.line)) {
    chosen.push(wild)
  }

  const maxShow = 5
  const lines = chosen.slice(0, maxShow).map((e) => `· ${e.line}${e.gist ? `（${e.gist}）` : ''}`)

  return [
    '下列顺口溜与当前局面较相关（含一条随机穿插防雷同）。若自然能呼应，可在推理中带过一句（改说即可）；不必硬套，更不要整段堆砌。',
    ...lines,
  ].join('\n')
}

/** 每局随机：表达角度 + 禁用开头，减少千篇一律 */
export function buildCoachVarietyBlock(varietySeed: number): string {
  const angles = [
    '像场边观战的高手随口点拨，短句为主，少用公文腔。',
    '把笔墨放在「谁先走完、谁还在憋大牌」上，点出这步在整副里的位置感。',
    '从「队友还剩几张」切入，说这步是在帮对家开路还是在抢权。',
    '从「敌方低张压力」切入，说这步是在控节奏还是在冒险。',
    '强调牌型结构：顺子、钢板、炸弹要不要动、动了亏不亏。',
    '用一句轻比喻点一下即可（别太文艺），马上接具体分析。',
  ]
  const forbids = [
    '不要使用「综合来看」「总的来说」「不难看出」「首先…其次…」这类模板开头。',
    '不要以「在这一手」「此时我们需要」连续作为两段开头。',
    '不要用「综上所述」收尾；结尾用一句干脆的判断或提醒即可。',
    '避免套话三连：「压制对手」「保留实力」「合理应对」若出现须附带具体牌面或张数。',
    '不要用「从策略上讲」「从战术角度」起头。',
    '少用「值得注意的是」；直接说牌或人。',
  ]
  const a = angles[Math.abs(varietySeed) % angles.length]
  const f = forbids[Math.abs(Math.floor(varietySeed / 7)) % forbids.length]
  const tone = varietySeed % 2 === 0 ? '语气可略带口语，但不要堆砌网络梗。' : '语气偏紧凑牌理，但仍要生动。'
  return [`【本轮表达】${a}`, `【本轮避坑】${f}`, `【语气】${tone}`].join('\n')
}

export function buildCoachKnowledgePrompt(context: CoachGameContext): string {
  const my = context.myPosition
  const partner = (my + 2) % 4
  const lines: string[] = []

  const enemy4 = context.seats.some(
    (s) => s.position !== my && s.position !== partner && s.remainingCards === 4,
  )
  if (enemy4) {
    lines.push('【与局面可能相关】有敌方恰好剩 4 张牌：民间常提「枪不打四」，是否开炸、是否强压请结合牌型与队友张数判断。')
  }

  const low = context.seats.filter(
    (s) => s.position !== my && s.position !== partner && s.remainingCards > 0 && s.remainingCards <= 6,
  )
  if (low.length && !enemy4) {
    lines.push(
      `【与局面可能相关】敌方有人低张（≤6）：顺口溜里「残局」「送牌」「顶牌」类条目可多对照，仍以实际手牌为准。`,
    )
  }

  if (lines.length) {
    lines.push('')
  }
  lines.push(formatProverbsForPrompt())
  return lines.join('\n')
}
