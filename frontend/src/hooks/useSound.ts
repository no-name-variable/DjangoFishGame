/**
 * Хук воспроизведения звуковых эффектов.
 *
 * Использование:
 *   const { play } = useSound()
 *   play('cast')   // воспроизвести splash.mp3
 *   play('bite')   // воспроизвести bite.mp3
 */
import { useCallback, useRef } from 'react'
import { useSoundStore } from './useSoundStore'

const SOUND_MAP: Record<string, string> = {
  cast: '/sounds/splash.mp3',
  reel: '/sounds/reel.mp3',
  bell: '/sounds/bell.mp3',
  bite: '/sounds/bite.mp3',
  catch: '/sounds/catch.mp3',
  break: '/sounds/break.mp3',
  buy: '/sounds/buy.mp3',
  click: '/sounds/click.mp3',
}

const audioCache: Record<string, HTMLAudioElement> = {}

function getAudio(key: string): HTMLAudioElement | null {
  const src = SOUND_MAP[key]
  if (!src) return null
  if (!audioCache[key]) {
    audioCache[key] = new Audio(src)
  }
  return audioCache[key]
}

export function useSound() {
  const enabledRef = useRef(useSoundStore.getState().enabled)
  const volumeRef = useRef(useSoundStore.getState().volume)

  // Подписка на актуальные значения без ререндера
  useSoundStore.subscribe((s) => {
    enabledRef.current = s.enabled
    volumeRef.current = s.volume
  })

  const play = useCallback((key: string) => {
    if (!enabledRef.current) return
    const audio = getAudio(key)
    if (!audio) return
    audio.volume = volumeRef.current
    audio.currentTime = 0
    audio.play().catch(() => {})
  }, [])

  return { play }
}
