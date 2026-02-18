/**
 * Стейт игрока — авторизация, профиль.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PlayerRod {
  id: number
  rod_type: number
  rod_type_name: string
  display_name: string
  custom_name: string | null
  rod_class: 'float' | 'bottom'
  reel: number | null
  reel_name: string | null
  line: number | null
  line_name: string | null
  hook: number | null
  hook_name: string | null
  float_tackle: number | null
  float_name: string | null
  bait: number | null
  bait_name: string | null
  bait_remaining: number
  durability_current: number
  is_assembled: boolean
  is_ready: boolean
  depth_setting: number
  clip_distance: number
}

interface Player {
  id: number
  username: string
  nickname: string
  rank: number
  rank_title: string
  experience: number
  experience_to_next_rank: number
  karma: number
  money: number
  gold: number
  hunger: number
  current_base: number | null
  current_base_name: string | null
  current_location: number | null
  current_location_name: string | null
  current_location_image: string | null
  rod_slot_1: PlayerRod | null
  rod_slot_2: PlayerRod | null
  rod_slot_3: PlayerRod | null
}

interface PlayerState {
  token: string | null
  refreshToken: string | null
  player: Player | null
  setTokens: (access: string, refresh: string) => void
  setPlayer: (player: Player) => void
  updatePlayer: (partial: Partial<Player>) => void
  logout: () => void
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      player: null,

      setTokens: (access, refresh) =>
        set({ token: access, refreshToken: refresh }),

      setPlayer: (player) => set({ player }),

      updatePlayer: (partial) =>
        set((state) => ({
          player: state.player ? { ...state.player, ...partial } : null,
        })),

      logout: () => set({ token: null, refreshToken: null, player: null }),
    }),
    { name: 'rf-player' },
  ),
)
