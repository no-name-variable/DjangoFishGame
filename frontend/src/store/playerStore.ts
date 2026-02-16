/**
 * Стейт игрока — авторизация, профиль.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
