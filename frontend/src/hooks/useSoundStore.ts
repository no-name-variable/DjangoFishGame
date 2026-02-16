/**
 * Zustand-стор настроек звука.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SoundSettings {
  enabled: boolean
  volume: number
  setEnabled: (v: boolean) => void
  setVolume: (v: number) => void
  toggle: () => void
}

export const useSoundStore = create<SoundSettings>()(
  persist(
    (set) => ({
      enabled: true,
      volume: 0.5,
      setEnabled: (enabled) => set({ enabled }),
      setVolume: (volume) => set({ volume }),
      toggle: () => set((s) => ({ enabled: !s.enabled })),
    }),
    { name: 'rf3-sound-settings' },
  ),
)
