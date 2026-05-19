import { ref, onMounted, onBeforeUnmount } from 'vue'
import { startCheerfulFolkSynthLoop } from '@/audio/cheerful-folk-synth'

const MUTE_KEY = 'guandan-bgm-muted'

export function useBGM() {
  const bgmMuted = ref(typeof localStorage !== 'undefined' && localStorage.getItem(MUTE_KEY) === '1')
  /** 是否使用本地/远程 mp3（否则为合成占位） */
  const usingFile = ref(false)
  const audioEl = ref<HTMLAudioElement | null>(null)
  const useFallbackSynth = ref(false)

  let synthStop: (() => void) | null = null
  let audioCtx: AudioContext | null = null

  function stopSynth() {
    if (synthStop) {
      synthStop()
      synthStop = null
    }
    if (audioCtx) {
      audioCtx.close().catch(() => {})
      audioCtx = null
    }
  }

  function ensureSynthPlaying() {
    if (synthStop) return
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    audioCtx = new Ctx()
    void audioCtx.resume()
    synthStop = startCheerfulFolkSynthLoop(audioCtx, 0.1)
  }

  function playCurrent() {
    if (bgmMuted.value) return
    if (audioEl.value) {
      stopSynth()
      audioEl.value.play().catch(() => {})
      return
    }
    if (useFallbackSynth.value) {
      ensureSynthPlaying()
    }
  }

  function pauseAll() {
    audioEl.value?.pause()
    stopSynth()
  }

  function toggleBgm() {
    bgmMuted.value = !bgmMuted.value
    localStorage.setItem(MUTE_KEY, bgmMuted.value ? '1' : '0')
    if (bgmMuted.value) {
      pauseAll()
    } else {
      playCurrent()
    }
  }

  onMounted(() => {
    const url =
      (import.meta.env.VITE_BGM_URL as string | undefined)?.trim() || '/audio/bgm.mp3'
    const a = new Audio(url)
    a.loop = true
    a.volume = 0.32
    a.preload = 'auto'

    audioEl.value = a

    a.addEventListener(
      'canplaythrough',
      () => {
        usingFile.value = true
        useFallbackSynth.value = false
        if (!bgmMuted.value) {
          a.play().catch(() => {})
        }
      },
      { once: true },
    )
    a.addEventListener('error', () => {
      usingFile.value = false
      useFallbackSynth.value = true
      audioEl.value = null
    })
    a.load()
  })

  function unlockOnFirstInteraction() {
    const go = () => {
      void (async () => {
        if (bgmMuted.value) return
        if (audioEl.value && !useFallbackSynth.value) {
          try {
            await audioEl.value.play()
          } catch {
            audioEl.value.play().catch(() => {})
          }
          return
        }
        if (useFallbackSynth.value) {
          ensureSynthPlaying()
          await audioCtx?.resume()
        }
      })()
      document.removeEventListener('click', go)
      document.removeEventListener('keydown', go)
      document.removeEventListener('touchstart', go)
    }
    document.addEventListener('click', go, { once: true })
    document.addEventListener('keydown', go, { once: true })
    document.addEventListener('touchstart', go, { once: true })
  }

  onBeforeUnmount(() => {
    pauseAll()
  })

  return {
    bgmMuted,
    usingFile,
    toggleBgm,
    unlockOnFirstInteraction,
  }
}
