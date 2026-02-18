/**
 * Хук фонового эмбиента с поддержкой времени суток.
 *
 * - loops (fon*) — один случайный луп играет, после окончания пауза и следующий
 * - clips (природные звуки) — играют периодически со случайными паузами 8-20с
 * - при смене timeOfDay старые звуки останавливаются, запускаются новые
 */
import { useEffect, useRef } from 'react'
import { useSoundStore } from './useSoundStore'
import { AMBIENCE_MAP } from '../config/soundConfig'

const LOOP_VOLUME_MULT = 0.3
const CLIP_VOLUME_MULT = 0.2
const CLIP_MIN_DELAY = 8000
const CLIP_MAX_DELAY = 20000
const LOOP_GAP_MIN = 1000
const LOOP_GAP_MAX = 3000

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

export function useAmbience(active: boolean, timeOfDay?: string) {
  const loopAudioRef = useRef<HTMLAudioElement | null>(null)
  const loopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clipAudioRef = useRef<HTMLAudioElement | null>(null)
  const cleanedUpRef = useRef(false)

  useEffect(() => {
    const cleanup = () => {
      cleanedUpRef.current = true
      if (loopAudioRef.current) {
        loopAudioRef.current.pause()
        loopAudioRef.current.currentTime = 0
        loopAudioRef.current = null
      }
      if (loopTimerRef.current) {
        clearTimeout(loopTimerRef.current)
        loopTimerRef.current = null
      }
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

    const set = AMBIENCE_MAP[timeOfDay]
    if (!set) {
      cleanup()
      return
    }

    cleanedUpRef.current = false

    // Цепочка лупов: один случайный → пауза → следующий случайный
    const scheduleLoop = () => {
      if (cleanedUpRef.current || set.loops.length === 0) return
      const { enabled, volume } = useSoundStore.getState()
      if (!enabled) {
        // Если звук выключен — проверяем позже
        loopTimerRef.current = setTimeout(scheduleLoop, 2000)
        return
      }
      const src = set.loops[Math.floor(Math.random() * set.loops.length)]!
      const audio = new Audio(src)
      audio.volume = volume * LOOP_VOLUME_MULT
      loopAudioRef.current = audio
      audio.play().catch(() => {})
      audio.addEventListener('ended', () => {
        loopAudioRef.current = null
        if (cleanedUpRef.current) return
        loopTimerRef.current = setTimeout(scheduleLoop, randomInRange(LOOP_GAP_MIN, LOOP_GAP_MAX))
      }, { once: true })
    }
    scheduleLoop()

    // Периодические клипы природы
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
      }, randomInRange(CLIP_MIN_DELAY, CLIP_MAX_DELAY))
    }
    scheduleClip()

    // Подписка на изменения громкости / вкл-выкл
    const unsub = useSoundStore.subscribe((s) => {
      if (loopAudioRef.current) {
        loopAudioRef.current.volume = s.volume * LOOP_VOLUME_MULT
        if (!s.enabled) loopAudioRef.current.pause()
        else if (loopAudioRef.current.paused) loopAudioRef.current.play().catch(() => {})
      }
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
