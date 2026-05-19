import type { Card, CardRank } from '../game/rules.js'

/** 逢人配：与当前级牌同点数的红桃 */
function isFengRenPei(card: Card, levelRank: CardRank): boolean {
  return card.suit === 'hearts' && card.rank === levelRank
}

function valueCounts(cards: Card[]): Map<number, number> {
  const m = new Map<number, number>()
  for (const c of cards) {
    m.set(c.value, (m.get(c.value) || 0) + 1)
  }
  return m
}

/**
 * 从手牌生成供 LLM 参考的中文摘要（不含未公开的他人手牌）
 */
export function buildHandStructureSummary(handCards: Card[], levelRank: CardRank): string {
  const n = handCards.length
  if (n === 0) return '手牌为空'

  let feng = 0
  let sj = 0
  let bj = 0
  for (const c of handCards) {
    if (isFengRenPei(c, levelRank)) feng++
    if (c.rank === 'SJ') sj++
    if (c.rank === 'BJ') bj++
  }

  const vc = valueCounts(handCards)
  let bombLike = 0
  let pairs = 0
  let triples = 0
  for (const [, cnt] of vc) {
    if (cnt >= 4) bombLike++
    if (cnt >= 2) pairs++
    if (cnt >= 3) triples++
  }

  const maxV = Math.max(...handCards.map((c) => c.value))
  const highNote =
    maxV >= 17
      ? '含大王（牌力顶端）'
      : maxV >= 16
        ? '含小王或同等以上牌力'
        : maxV >= 15
          ? '含 2 点或逢人配参与的高牌力组合可能'
          : '整体牌力偏中前段，需省着关键张打升级'

  const parts = [
    `共 ${n} 张`,
    `逢人配（红桃级牌）${feng} 张`,
    `小王 ${sj} 张、大王 ${bj} 张`,
    `可视为「炸弹类」厚度的组数约 ${bombLike}（同点数≥4 张的非王牌组合，含逢人配时实战需再拆）`,
    `对子层次 ${pairs} 组、三张层次 ${triples} 组（含重叠计数，仅供结构感）`,
    highNote,
  ]

  return parts.join('；')
}

export interface SeatPublicInfo {
  position: number
  name: string
  remainingCards: number
  isAI: boolean
}

/**
 * 各座位剩余张数（不暴露具体牌），用于 LLM 判断节奏
 */
export function buildSeatsLine(seats: SeatPublicInfo[], myPosition: number): string {
  return seats
    .map((s) => {
      const who = s.position === myPosition ? '本家（我）' : s.isAI ? `AI-${s.name}` : s.name
      return `${who} 剩 ${s.remainingCards} 张`
    })
    .join('；')
}

/**
 * 本圈出牌节奏：谁领出、上一轮谁最大
 */
export function buildTrickLine(params: {
  firstPlayerIndex: number
  lastPlayerIndex: number
  currentPlayerIndex: number
  myPosition: number
}): string {
  const rel = (p: number) => (p === params.myPosition ? '我' : `座位${p}`)
  const last =
    params.lastPlayerIndex < 0 ? '本轮尚无人出牌（或你领出）' : `当前圈最大牌在 ${rel(params.lastPlayerIndex)}`
  const lead = `本圈领出：座位 ${params.firstPlayerIndex}；当前轮到：${rel(params.currentPlayerIndex)}`
  return `${lead}。${last}。`
}

/** 相对本家的方位：上家 / 下家 / 对家（队友） / 本家 */
export function relSeatLabel(myPosition: number, seatPosition: number): string {
  if (seatPosition === myPosition) return '本家'
  const d = (seatPosition - myPosition + 4) % 4
  if (d === 1) return '下家'
  if (d === 2) return '对家（队友）'
  return '上家'
}

/**
 * 队友剩牌 + 敌方低张预警（仅公开张数，不猜具体牌）
 */
export function buildPartnerAndThreatLine(seats: SeatPublicInfo[], myPosition: number): string {
  const partner = (myPosition + 2) % 4
  const partnerSeat = seats.find((s) => s.position === partner)
  const enemies = seats.filter((s) => s.position !== myPosition && s.position !== partner)
  const parts: string[] = []
  if (partnerSeat) {
    parts.push(`队友（对家）剩 ${partnerSeat.remainingCards} 张`)
  }
  const low = enemies.filter((s) => s.remainingCards > 0 && s.remainingCards <= 6)
  if (low.length) {
    parts.push(
      `敌方低张：${low
        .map((s) => `${relSeatLabel(myPosition, s.position)}仅 ${s.remainingCards} 张`)
        .join('、')}（终局节奏可能加快）`,
    )
  }
  return parts.length ? parts.join('；') : '各方牌量尚足，节奏偏常规'
}

/** 本副已确定名次（掼蛋：头游～末游） */
export function buildRoundFinishLine(roundFinishOrder: number[], myPosition: number): string {
  if (!roundFinishOrder.length) return '本副尚未有人出完牌（名次未定）'
  const labels = ['头游', '二游', '三游', '末游']
  return roundFinishOrder
    .map((pos, i) => `${labels[i]}：${relSeatLabel(myPosition, pos)}（座位${pos}）`)
    .join('；')
}

/**
 * 手牌点数分布 Top（帮助模型做「牌力个性化」描述，不含他家信息）
 */
export function buildHandValueTopLine(handCards: Card[], topN = 5): string {
  if (!handCards.length) return ''
  const vc = valueCounts(handCards)
  const rankLabel = (v: number): string => {
    if (v >= 17) return '王级'
    if (v === 16) return '小王附近'
    if (v === 15) return '2/级牌附近'
    return `主值${v}`
  }
  const sorted = [...vc.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])
  const head = sorted.slice(0, topN).map(([v, c]) => `${rankLabel(v)}×${c}`)
  return `手牌点数集中度（按张数优先）：${head.join('，')}`
}
