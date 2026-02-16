/**
 * Хук фонового амбиента (вода + птицы).
 * Запускается при входе на локацию, останавливается при уходе.
 */
import { useEffect, useRef } from 'react'
import { useSoundStore } from './useSoundStore'

const AMBIENCE_SOURCES = ['/sounds/water.mp3', '/sounds/birds.mp3']

export function useAmbience(active: boolean) {
  const audioRefs = useRef<HTMLAudioElement[]>([])

  useEffect(() => {
    if (!active) {
      audioRefs.current.forEach((a) => {
        a.pause()
        a.currentTime = 0
      })
      audioRefs.current = []
      return
    }

    const audios = AMBIENCE_SOURCES.map((src) => {
      const a = new Audio(src)
      a.loop = true
      a.volume = useSoundStore.getState().volume * 0.3
      return a
    })
    audioRefs.current = audios

    const { enabled } = useSoundStore.getState()
    if (enabled) {
      audios.forEach((a) => a.play().catch(() => {}))
    }

    const unsub = useSoundStore.subscribe((s) => {
      audios.forEach((a) => {
        a.volume = s.volume * 0.3
        if (s.enabled) {
          if (a.paused) a.play().catch(() => {})
        } else {
          a.pause()
        }
      })
    })

    return () => {
      unsub()
      audios.forEach((a) => {
        a.pause()
        a.currentTime = 0
      })
    }
  }, [active])
}
