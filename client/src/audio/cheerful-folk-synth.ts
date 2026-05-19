/**
 * 无外部 mp3 时的占位：民乐合奏感 —— 多层 + 长动机、休止、连音与副旋律（Web Audio）
 */
const PENT = [261.63, 293.66, 329.63, 392.0, 440.0] as const
const PENT_HI = [523.25, 587.33, 659.25, 783.99, 880.0] as const

/** -1 休止；0–4 五声阶音级 */
type Deg = -1 | 0 | 1 | 2 | 3 | 4

function playTone(
  ctx: AudioContext,
  dest: AudioNode,
  t: number,
  freq: number,
  type: OscillatorType,
  dur: number,
  peak: number,
) {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(peak, t + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g)
  g.connect(dest)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

function playFifth(ctx: AudioContext, dest: AudioNode, t: number, rootIdx: number, dur: number, peak: number) {
  const r = PENT[rootIdx % 5]
  const fifth = PENT[(rootIdx + 2) % 5]
  playTone(ctx, dest, t, r, 'triangle', dur, peak * 0.55)
  playTone(ctx, dest, t, fifth * 0.99, 'sine', dur, peak * 0.45)
}

function playPerc(ctx: AudioContext, dest: AudioNode, t: number, accent: boolean) {
  const dur = accent ? 0.06 : 0.035
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) {
    d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
  }
  const src = ctx.createBufferSource()
  src.buffer = buf
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = accent ? 420 : 1800
  bp.Q.value = 1.2
  const g = ctx.createGain()
  g.gain.setValueAtTime(accent ? 0.12 : 0.06, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(bp)
  bp.connect(g)
  g.connect(dest)
  src.start(t)
  src.stop(t + dur + 0.01)
}

/**
 * 128 拍一循环：多段主题 + 休止 + 连音；与打击/低音时间轴独立（每拍一格）
 */
const MAIN: readonly Deg[] = [
  2, 4, 2, 0, -1, 4, 3, 2, 2, -1, 4, 3, 2, 0, -1, 2,
  4, 2, 0, 4, -1, 3, 2, 4, 0, 2, -1, 0, 2, 4, 3, 2,
  0, 2, 4, 2, -1, 4, 3, -1, 2, 4, 2, 0, -1, 2, 4, 3,
  2, 0, -1, 2, 4, 2, 3, 4, -1, 2, 0, 4, 3, 2, -1, 0,
  4, 3, 2, -1, 0, 2, 4, -1, 3, 2, 4, 0, -1, 2, 3, 4,
  2, -1, 0, 2, 4, 3, 2, -1, 4, 2, 0, -1, 2, 4, 3, 2,
  0, 4, 2, -1, 3, 2, 4, 0, 2, -1, 4, 3, 2, 0, -1, 2,
  4, 2, 3, 4, -1, 2, 0, 4, 3, 2, -1, 0, 2, 4, 2, 0,
]

const LEN: readonly number[] = [
  1, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1,
  1, 2, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 2,
  1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1,
  2, 1, 1, 1, 2, 1, 1, 2, 1, 2, 1, 2, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 2, 1, 1, 1, 2,
  2, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2,
  1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 1, 1,
  1, 2, 1, 2, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 2, 2,
]

/** 仅在与 MAIN 同一格为休止时填充，-1 不奏 */
const COUNTER: readonly Deg[] = [
  -1, -1, -1, -1, 0, -1, -1, -1, -1, 4, -1, -1, -1, -1, 2, -1,
  -1, -1, -1, -1, 2, -1, -1, -1, -1, -1, 3, -1, -1, -1, -1, -1,
  -1, -1, -1, -1, 2, -1, 4, 2, -1, -1, -1, -1, 4, -1, -1, -1,
  -1, 3, -1, -1, -1, -1, -1, -1, 2, -1, -1, -1, -1, -1, 2, -1,
  -1, -1, -1, 2, -1, -1, -1, -1, -1, -1, -1, -1, 0, -1, 4, -1,
  -1, -1, -1, -1, -1, -1, -1, -1, -1, 3, -1, -1, -1, -1, -1, -1,
  -1, -1, -1, 2, -1, -1, -1, -1, -1, 4, -1, -1, -1, -1, 2, -1,
  -1, -1, -1, -1, 2, -1, -1, -1, -1, -1, 3, -1, -1, -1, -1, -1,
]

const BASE_DUR = 0.11
const L = MAIN.length
/** 一整段旋律占用的拍数（与 MAIN 格子数一致时需与 sum(LEN) 对齐） */
const LOOP_TICKS = LEN.reduce((a, b) => a + b, 0)

export function startCheerfulFolkSynthLoop(ctx: AudioContext, volume = 0.14): () => void {
  const master = ctx.createGain()
  master.gain.value = volume
  master.connect(ctx.destination)

  const bassBus = ctx.createGain()
  bassBus.gain.value = 0.95
  bassBus.connect(master)
  const harmBus = ctx.createGain()
  harmBus.gain.value = 0.72
  harmBus.connect(master)
  const melBus = ctx.createGain()
  melBus.gain.value = 1.0
  melBus.connect(master)
  const counterBus = ctx.createGain()
  counterBus.gain.value = 0.42
  counterBus.connect(master)
  const percBus = ctx.createGain()
  percBus.gain.value = 1.05
  percBus.connect(master)

    let tick = 0
    let melIndex = 0
    /** 当前 MAIN 格子还剩几拍（连音未结束时不读下一格） */
    let cellTicksLeft = 0
    const STEP_MS = 148

    const iv = window.setInterval(() => {
      if (ctx.state === 'suspended') return
      const t = ctx.currentTime
      const s = tick % LOOP_TICKS
      tick++

      const bar = Math.floor(((tick - 1) % LOOP_TICKS) / (LOOP_TICKS / 8))
      const root = [0, 0, 3, 0, 2, 0, 3, 0][bar % 8]

      if (s % 4 === 0) {
        playTone(ctx, bassBus, t, PENT[root] * 0.5, 'triangle', 0.42, 0.19)
      }

      if (s % 8 === 0) {
        playFifth(ctx, harmBus, t, root, 0.35, 0.1)
      }

      if (s % 2 === 0) {
        playPerc(ctx, percBus, t, s % 8 === 0)
      }

      if (cellTicksLeft > 0) {
        cellTicksLeft--
        if (cellTicksLeft === 0) {
          melIndex++
        }
        return
      }

      const idx = melIndex % L
      const p = MAIN[idx]
      const noteLen = Math.min(Math.max(LEN[idx] ?? 1, 1), 4)
      cellTicksLeft = noteLen - 1

      if (p >= 0) {
        const pi = p as 0 | 1 | 2 | 3 | 4
        const dur = BASE_DUR + 0.065 * (noteLen - 1)
        const peak = 0.11 + (idx % 7) * 0.007
        const f = PENT_HI[pi]
        playTone(ctx, melBus, t, f, 'triangle', dur, peak)
        const det = ctx.createOscillator()
        const dg = ctx.createGain()
        det.type = 'sine'
        det.frequency.value = f * 1.003
        dg.gain.setValueAtTime(0.0001, t)
        dg.gain.linearRampToValueAtTime(peak * 0.42, t + 0.015)
        dg.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.85)
        det.connect(dg)
        dg.connect(melBus)
        det.start(t)
        det.stop(t + dur + 0.02)
      } else {
        const c = COUNTER[idx]
        if (c >= 0) {
          const ci = c as 0 | 1 | 2 | 3 | 4
          playTone(ctx, counterBus, t, PENT[ci] * 1.12, 'sine', 0.16, 0.085)
        }
      }

      if (cellTicksLeft === 0) {
        melIndex++
      }
    }, STEP_MS)

  return () => {
    clearInterval(iv)
    try {
      bassBus.disconnect()
      harmBus.disconnect()
      melBus.disconnect()
      counterBus.disconnect()
      percBus.disconnect()
      master.disconnect()
    } catch {
      /* noop */
    }
  }
}
