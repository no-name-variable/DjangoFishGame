/**
 * Хук фонового эмбиента с поддержкой времени суток.
 *
 * - loops (fon*) играют непрерывно на пониженной громкости
 * - clips (природные звуки) играют периодически со случайными паузами
 * - при смене timeOfDay старые звуки останавливаются, запускаются новые
 */
import { useEffect, useRef } from 'react'
import { useSoundStore } from './useSoundStore'
import { AMBIENCE_MAP } from '../config/soundConfig'

const LOOP_VOLUME_MULT = 0.3
const CLIP_VOLUME_MULT = 0.2
const CLIP_MIN_DELAY = 8000
const CLIP_MAX_DELAY = 20000

function randomDelay(): number {
  return CLIP_MIN_DELAY + Math.random() * (CLIP_MAX_DELAY - CLIP_MIN_DELAY)
}

export function useAmbience(active: boolean, timeOfDay?: string) {
  const loopsRef = useRef<HTMLAudioElement[]>([])
  const clipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clipAudioRef = useRef<HTMLAudioElement | null>(null)
  const cleanedUpRef = useRef(false)

  useEffect(() => {
    // Очистка предыдущих звуков
    const cleanup = () => {
      cleanedUpRef.current = true
      loopsRef.current.forEach((a) => { a.pause(); a.currentTime = 0 })
      loopsRef.current = []
      if (clipTimerRef.current) {
        clearTimeout(clipTimerRef.current)
        clipTimerRef.current = null
      }
      if (clipAudioRef.current) {
        clipAudioRef.current.pause()
        clipAudioRef.current.currentTime = 0
        clipAudioRef.current = null
      }
    }

    if (!active || !timeOfDay) {
      cleanup()
      return
    }

    const phase = timeOfDay
    const set = AMBIENCE_MAP[phase]
    if (!set) {
      cleanup()
      return
    }

    cleanedUpRef.current = false
    const store = useSoundStore.getState()

    // Запуск лупов
    const loops = set.loops.map((src) => {
      const a = new Audio(src)
      a.loop = true
      a.volume = store.volume * LOOP_VOLUME_MULT
      return a
    })
    loopsRef.current = loops

    if (store.enabled) {
      loops.forEach((a) => a.play().catch(() => {}))
    }

    // Запуск периодических клипов
    const scheduleClip = () => {
      if (cleanedUpRef.current) return
      clipTimerRef.current = setTimeout(() => {
        if (cleanedUpRef.current) return
        const { enabled, volume } = useSoundStore.getState()
        if (!enabled || set.clips.length === 0) {
          scheduleClip()
          return
        }
        const src = set.clips[Math.floor(Math.random() * set.clips.length)]!
        const clip = new Audio(src)
        clip.volume = volume * CLIP_VOLUME_MULT
        clipAudioRef.current = clip
        clip.play().catch(() => {})
        clip.addEventListener('ended', () => {
          clipAudioRef.current = null
          scheduleClip()
        }, { once: true })
      }, randomDelay())
    }
    scheduleClip()

    // Подписка на изменения громкости/вкл-выкл
    const unsub = useSoundStore.subscribe((s) => {
      loopsRef.current.forEach((a) => {
        a.volume = s.volume * LOOP_VOLUME_MULT
        if (s.enabled) {
          if (a.paused) a.play().catch(() => {})
        } else {
          a.pause()
        }
      })
      if (clipAudioRef.current) {
        clipAudioRef.current.volume = s.volume * CLIP_VOLUME_MULT
        if (!s.enabled) clipAudioRef.current.pause()
      }
    })

    return () => {
      unsub()
      cleanup()
    }
  }, [active, timeOfDay])
}
