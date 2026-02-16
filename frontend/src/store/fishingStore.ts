/**
 * Стейт мульти-удочковой рыбалки.
 */
import { create } from 'zustand'
import type { SessionData, FightData } from '../api/fishing'

export type FishingState = 'idle' | 'waiting' | 'bite' | 'fighting' | 'caught'

export interface SessionInfo {
  id: number
  state: FishingState
  slot: number
  rodId: number
  rodName: string
  rodClass: 'float' | 'spinning' | 'bottom'
  retrieveSpeed: number
  isRetrieving: boolean
  retrieveProgress: number
  castX: number
  castY: number
  hookedSpeciesName: string | null
  hookedWeight: number | null
}

export interface FightInfo {
  sessionId: number
  tension: number
  distance: number
  rodDurability: number
}

export interface CaughtInfo {
  sessionId: number
  fish: string
  speciesImage: string | null
  weight: number
  length: number
  rarity: string
}

interface FishingStoreState {
  sessions: Record<number, SessionInfo>
  fights: Record<number, FightInfo>
  activeSessionId: number | null
  caughtInfo: CaughtInfo | null
  gameTime: { hour: number; day: number; time_of_day: string } | null

  /** Обновить все сессии атомарно (из polling) */
  setSessions: (sessions: SessionData[], fights: Record<string, FightData>) => void

  /** Выбрать активную сессию */
  setActiveSession: (id: number | null) => void

  /** Задать данные пойманной рыбы */
  setCaught: (info: CaughtInfo | null) => void

  /** Установить время */
  setGameTime: (gt: { hour: number; day: number; time_of_day: string }) => void

  /** Удалить конкретную сессию (после keep/release/retrieve) */
  removeSession: (id: number) => void

  /** Сброс всего (уход с локации) */
  reset: () => void

  /** Хелперы */
  canCast: () => boolean
  hasAnyBite: () => boolean
  hasFighting: () => boolean
  sessionCount: () => number
}

const MAX_RODS = 3

export const useFishingStore = create<FishingStoreState>((set, get) => ({
  sessions: {},
  fights: {},
  activeSessionId: null,
  caughtInfo: null,
  gameTime: null,

  setSessions: (rawSessions, rawFights) => {
    const sessions: Record<number, SessionInfo> = {}
    for (const s of rawSessions) {
      sessions[s.id] = {
        id: s.id,
        state: s.state,
        slot: s.slot,
        rodId: s.rod_id,
        rodName: s.rod_name,
        rodClass: s.rod_class,
        retrieveSpeed: s.retrieve_speed,
        isRetrieving: s.is_retrieving,
        retrieveProgress: s.retrieve_progress,
        castX: s.cast_x,
        castY: s.cast_y,
        hookedSpeciesName: s.hooked_species_name,
        hookedWeight: s.hooked_weight,
      }
    }
    const fights: Record<number, FightInfo> = {}
    for (const [sid, f] of Object.entries(rawFights)) {
      fights[Number(sid)] = {
        sessionId: Number(sid),
        tension: f.line_tension,
        distance: f.distance,
        rodDurability: f.rod_durability,
      }
    }

    const prev = get()
    let activeId = prev.activeSessionId

    // Если активная сессия больше не существует — сбросить
    if (activeId !== null && !sessions[activeId]) {
      activeId = null
    }

    // Автовыбор: если нет активной — выбрать первую
    if (activeId === null && rawSessions.length > 0) {
      activeId = rawSessions[0].id
    }

    set({ sessions, fights, activeSessionId: activeId })
  },

  setActiveSession: (id) => set({ activeSessionId: id }),

  setCaught: (info) => set({ caughtInfo: info }),

  setGameTime: (gt) => set({ gameTime: gt }),

  removeSession: (id) => {
    const { sessions, fights, activeSessionId } = get()
    const next = { ...sessions }
    delete next[id]
    const nextFights = { ...fights }
    delete nextFights[id]

    let newActive = activeSessionId
    if (activeSessionId === id) {
      const remaining = Object.values(next)
      newActive = remaining.length > 0 ? remaining[0].id : null
    }

    set({ sessions: next, fights: nextFights, activeSessionId: newActive })
  },

  reset: () => set({
    sessions: {},
    fights: {},
    activeSessionId: null,
    caughtInfo: null,
  }),

  canCast: () => Object.keys(get().sessions).length < MAX_RODS,
  hasAnyBite: () => Object.values(get().sessions).some((s) => s.state === 'bite'),
  hasFighting: () => Object.values(get().sessions).some((s) => s.state === 'fighting'),
  sessionCount: () => Object.keys(get().sessions).length,
}))
