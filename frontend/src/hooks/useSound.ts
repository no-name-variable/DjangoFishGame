/**
 * Хук воспроизведения звуковых эффектов.
 *
 * Поддерживает массив вариантов (случайный выбор) и пул аудио-элементов
 * для одновременного воспроизведения нескольких экземпляров одного звука.
 *
 * Использование:
 *   const { play } = useSound()
 *   play('cast')   // случайный splash1-7.mp3
 *   play('bite')   // popl.mp3
 */
import { useCallback, useRef } from 'react'
import { useSoundStore } from './useSoundStore'
import { SOUND_MAP } from '../config/soundConfig'

const POOL_SIZE = 3

/** Пул аудио-элементов для каждого src — позволяет играть один звук одновременно */
const audioPool: Record<string, HTMLAudioElement[]> = {}
const poolIndex: Record<string, number> = {}

function getFromPool(src: string): HTMLAudioElement {
  if (!audioPool[src]) {
    audioPool[src] = Array.from({ length: POOL_SIZE }, () => new Audio(src))
    poolIndex[src] = 0
  }
  const idx = poolIndex[src]! % POOL_SIZE
  poolIndex[src] = idx + 1
  return audioPool[src]![idx]!
}

/** Выбирает случайный элемент, если значение — массив */
function resolveSrc(value: string | string[]): string {
  if (Array.isArray(value)) {
    return value[Math.floor(Math.random() * value.length)]!
  }
  return value
}

export function useSound() {
  const enabledRef = useRef(useSoundStore.getState().enabled)
  const volumeRef = useRef(useSoundStore.getState().volume)

  useSoundStore.subscribe((s) => {
    enabledRef.current = s.enabled
    volumeRef.current = s.volume
  })

  const play = useCallback((key: string) => {
    if (!enabledRef.current) return
    const mapping = SOUND_MAP[key]
    if (!mapping) return
    const src = resolveSrc(mapping)
    const audio = getFromPool(src)
    audio.volume = volumeRef.current
    audio.currentTime = 0
    audio.play().catch(() => {})
  }, [])

  return { play }
}
