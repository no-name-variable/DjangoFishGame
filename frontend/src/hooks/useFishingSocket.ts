/**
 * React хук для WebSocket-соединения рыбалки.
 * Заменяет REST polling — сервер пушит state, клиент шлёт действия.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePlayerStore } from '../store/playerStore'
import { useFishingStore, type SessionInfo } from '../store/fishingStore'
import type { SessionData, FightData } from '../api/fishing'

interface FishingSocketCallbacks {
  onBite?: (sessionId: number) => void
  onCaught?: (data: CaughtData) => void
  onBreak?: (result: string, sessionId: number) => void
  onKeepResult?: (data: Record<string, unknown>) => void
  onReleaseResult?: (data: { karma_bonus: number; karma_total: number }) => void
  onError?: (message: string) => void
  onCastOk?: (sessionId: number, slot: number) => void
  onStrikeOk?: (data: StrikeData) => void
}

export interface CaughtData {
  session_id: number
  fish: string
  species_id: number
  species_image: string | null
  weight: number
  length: number
  rarity: string
}

export interface StrikeData {
  session_id: number
  fish: string
  species_id: number
  species_image: string | null
  tension: number
  distance: number
}

export function useFishingSocket(callbacks: FishingSocketCallbacks) {
  const token = usePlayerStore((s) => s.token)
  const setSessions = useFishingStore((s) => s.setSessions)
  const setGameTime = useFishingStore((s) => s.setGameTime)

  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  const prevBiteIdsRef = useRef<Set<number>>(new Set())
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectDelayRef = useRef(3000)
  const unmountedRef = useRef(false)

  const connect = useCallback(() => {
    if (!token || unmountedRef.current) return

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${protocol}://${window.location.host}/ws/fishing/?token=${token}`)

    ws.onopen = () => {
      setConnected(true)
      reconnectDelayRef.current = 3000
    }

    ws.onclose = () => {
      setConnected(false)
      if (!unmountedRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, 30000)
          connect()
        }, reconnectDelayRef.current)
      }
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      const cb = callbacksRef.current

      switch (data.type) {
        case 'state': {
          const sessions: SessionData[] = data.sessions || []
          const fights: Record<string, FightData> = data.fights || {}
          setSessions(sessions, fights)
          if (data.game_time) setGameTime(data.game_time)

          // Восстановление caughtInfo при reconnect (если сессия в состоянии 'caught')
          const caughtSession = sessions.find((s) => s.state === 'caught')
          if (caughtSession && !useFishingStore.getState().caughtInfo) {
            useFishingStore.getState().setCaught({
              sessionId: caughtSession.id,
              fish: caughtSession.hooked_species_name || 'Рыба',
              speciesImage: caughtSession.hooked_species_image || null,
              weight: caughtSession.hooked_weight || 0,
              length: caughtSession.hooked_length || 0,
              rarity: caughtSession.hooked_rarity || 'common',
            })
          }

          // Детекция новых поклёвок
          if (data.bites) {
            const newBiteIds = new Set<number>(data.bites)
            for (const id of newBiteIds) {
              if (!prevBiteIdsRef.current.has(id)) {
                cb.onBite?.(id)
              }
            }
            prevBiteIdsRef.current = newBiteIds
          } else {
            // Определяем поклёвки из сессий
            const biteIds = new Set(
              sessions.filter((s) => s.state === 'bite').map((s) => s.id),
            )
            for (const id of biteIds) {
              if (!prevBiteIdsRef.current.has(id)) {
                cb.onBite?.(id)
              }
            }
            prevBiteIdsRef.current = biteIds
          }
          break
        }
        case 'cast_ok':
          cb.onCastOk?.(data.session_id, data.slot)
          break
        case 'strike_ok':
          cb.onStrikeOk?.(data as StrikeData)
          break
        case 'fight_result':
          if (data.result === 'caught') {
            cb.onCaught?.(data as CaughtData)
          } else if (data.result === 'line_break' || data.result === 'rod_break') {
            cb.onBreak?.(data.result, data.session_id)
          }
          // 'fighting' — state уже обновится через следующий state message
          break
        case 'keep_result':
          cb.onKeepResult?.(data)
          break
        case 'release_result':
          cb.onReleaseResult?.(data)
          break
        case 'update_retrieve_ok': {
          // Оптимистичное обновление isRetrieving — state snapshot придёт следом
          const store = useFishingStore.getState()
          const session: SessionInfo | undefined = store.sessions[data.session_id as number]
          if (session) {
            useFishingStore.setState({
              sessions: {
                ...store.sessions,
                [data.session_id as number]: { ...session, isRetrieving: data.is_retrieving as boolean },
              },
            })
          }
          break
        }
        case 'error':
          cb.onError?.(data.message)
          break
      }
    }

    wsRef.current = ws
  }, [token, setSessions, setGameTime])

  useEffect(() => {
    unmountedRef.current = false
    connect()
    return () => {
      unmountedRef.current = true
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [connect])

  const send = useCallback((action: string, payload: Record<string, unknown> = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action, ...payload }))
    }
  }, [])

  return { send, connected }
}
