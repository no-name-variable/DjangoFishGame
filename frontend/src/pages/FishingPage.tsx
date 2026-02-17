/**
 * Основной экран рыбалки — мульти-удочки, клик-заброс.
 * Использует WebSocket вместо REST polling.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as fishingApi from '../api/fishing'
import { leaveLocation, updateRodSettings } from '../api/player'
import { getProfile } from '../api/auth'
import { useFishingStore } from '../store/fishingStore'
import { usePlayerStore } from '../store/playerStore'
import { useFishingSocket } from '../hooks/useFishingSocket'
import WaterScene from '../components/fishing/WaterScene'
import CaughtFishModal from '../components/fishing/CaughtFishModal'
import TacklePanel, { type FullRod } from '../components/fishing/TacklePanel'
import { useSound } from '../hooks/useSound'
import { useAmbience } from '../hooks/useAmbience'
import { getLocationImageUrl, normalizeMediaUrl } from '../utils/getAssetUrl'

export default function FishingPage() {
  const navigate = useNavigate()
  const player = usePlayerStore((s) => s.player)
  const setPlayer = usePlayerStore((s) => s.setPlayer)
  const updatePlayer = usePlayerStore((s) => s.updatePlayer)

  const sessions = useFishingStore((s) => s.sessions)
  const fights = useFishingStore((s) => s.fights)
  const activeSessionId = useFishingStore((s) => s.activeSessionId)
  const caughtInfo = useFishingStore((s) => s.caughtInfo)
  const setActiveSession = useFishingStore((s) => s.setActiveSession)
  const setCaught = useFishingStore((s) => s.setCaught)
  const removeSession = useFishingStore((s) => s.removeSession)
  const reset = useFishingStore((s) => s.reset)

  const [rods, setRods] = useState<FullRod[]>([])
  const [selectedRodId, setSelectedRodId] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const waterRef = useRef<HTMLDivElement>(null)
  const { play } = useSound()

  useAmbience(!!player?.current_location)

  // WebSocket — колбэки для событий
  const { send, connected } = useFishingSocket({
    onBite: (sessionId) => {
      play('bite')
      setMessage('ПОКЛЁВКА! Подсекай!')
      const store = useFishingStore.getState()
      if (!store.hasFighting()) {
        setActiveSession(sessionId)
      }
    },
    onCastOk: (sessionId) => {
      play('cast')
      setMessage('Заброс! Ожидаем поклёвку...')
      setActiveSession(sessionId)
    },
    onStrikeOk: (data) => {
      setMessage(`На крючке: ${data.fish}! Вываживай!`)
    },
    onCaught: (data) => {
      play('catch')
      setCaught({
        sessionId: data.session_id,
        fish: data.fish,
        speciesImage: data.species_image || null,
        weight: data.weight,
        length: data.length,
        rarity: data.rarity,
      })
      setMessage('Рыба поймана!')
    },
    onBreak: (result) => {
      play('break')
      setMessage(result === 'line_break' ? 'Обрыв лески!' : 'Удилище сломалось!')
    },
    onKeepResult: (data) => {
      const d = data as Record<string, unknown>
      setMessage(`${d.species_name} ${Number(d.weight).toFixed(2)}кг в садке! +${d.experience_reward} опыта`)
      setCaught(null)
      getProfile().then(setPlayer).catch(() => {})
    },
    onReleaseResult: (data) => {
      setMessage(`Отпущена! +${data.karma_bonus} кармы`)
      setCaught(null)
      getProfile().then(setPlayer).catch(() => {})
    },
    onError: (msg) => {
      setMessage(msg)
    },
  })

  // Загрузка удочек из слотов игрока
  useEffect(() => {
    if (player) {
      const slotRods = [
        player.rod_slot_1,
        player.rod_slot_2,
        player.rod_slot_3,
      ].filter((rod) => rod !== null && rod.is_ready) as FullRod[]

      setRods((prev) => {
        const prevIds = prev.map((r) => r.id).sort().join(',')
        const newIds = slotRods.map((r) => r.id).sort().join(',')
        return prevIds === newIds ? prev : slotRods
      })

      if (slotRods.length > 0 && !selectedRodId) {
        setSelectedRodId(slotRods[0].id)
      }
    }
  }, [player?.rod_slot_1?.id, player?.rod_slot_2?.id, player?.rod_slot_3?.id, selectedRodId])

  // Клик по воде = заброс
  const handleWaterClick = useCallback((normX: number, normY: number) => {
    if (!selectedRodId) {
      setMessage('Выберите снасть')
      return
    }
    const sessionList = Object.values(sessions)
    if (sessionList.some((s) => s.rodId === selectedRodId)) {
      setMessage('Эта удочка уже заброшена')
      return
    }
    if (sessionList.length >= 3) {
      setMessage('Максимум 3 удочки одновременно')
      return
    }

    send('cast', { rod_id: selectedRodId, point_x: normX, point_y: normY })

    // Автовыбор следующей незаброшенной удочки
    const castRodIds = new Set(sessionList.map((s) => s.rodId))
    castRodIds.add(selectedRodId)
    const nextRod = rods.find((r) => !castRodIds.has(r.id))
    if (nextRod) setSelectedRodId(nextRod.id)
  }, [selectedRodId, sessions, rods, send])

  // Клик по поплавку = выбор сессии
  const handleFloatClick = useCallback((sessionId: number) => {
    setActiveSession(sessionId)
  }, [setActiveSession])

  const handleStrike = useCallback(() => {
    if (!activeSessionId) return
    send('strike', { session_id: activeSessionId })
  }, [activeSessionId, send])

  const handleFightAction = useCallback((action: 'reel' | 'pull') => {
    if (!activeSessionId) return
    const wsAction = action === 'reel' ? 'reel_in' : 'pull'
    send(wsAction, { session_id: activeSessionId })
    if (action === 'reel') play('reel')
  }, [activeSessionId, send, play])

  const handleKeep = useCallback(() => {
    const sid = caughtInfo?.sessionId
    if (!sid) return
    send('keep', { session_id: sid })
  }, [caughtInfo?.sessionId, send])

  const handleRelease = useCallback(() => {
    const sid = caughtInfo?.sessionId
    if (!sid) return
    send('release', { session_id: sid })
  }, [caughtInfo?.sessionId, send])

  const handleRetrieve = useCallback((sessionId: number) => {
    send('retrieve', { session_id: sessionId })
    removeSession(sessionId)
    setMessage('Удочка вытащена')
  }, [send, removeSession])

  const handleStartRetrieve = useCallback((sessionId: number) => {
    send('update_retrieve', { session_id: sessionId, is_retrieving: true })
  }, [send])

  const handleStopRetrieve = useCallback((sessionId: number) => {
    send('update_retrieve', { session_id: sessionId, is_retrieving: false })
  }, [send])

  const handleUpdateSettings = useCallback(async (
    rodId: number, settings: { depth_setting?: number; retrieve_speed?: number },
  ) => {
    try {
      const updated = await updateRodSettings(rodId, settings)
      setRods((prev) => prev.map((r) => (r.id === rodId ? updated : r)))
    } catch {
      setMessage('Ошибка обновления настроек')
    }
  }, [])

  const handleChangeTackle = useCallback((_rodId: number, updatedRod: FullRod) => {
    setRods((prev) => prev.map((r) => (r.id === updatedRod.id ? updatedRod : r)))
  }, [])

  const handleLeave = useCallback(async () => {
    // Вытаскиваем все удочки через REST (WS может быть уже не нужен)
    const sessionList = Object.values(sessions)
    for (const s of sessionList) {
      if (s.state === 'waiting' || s.state === 'idle') {
        await fishingApi.retrieveRod(s.id).catch(() => {})
      }
    }
    reset()
    if (player?.current_location) {
      await leaveLocation(player.current_location).catch(() => {})
      updatePlayer({ current_location: null, current_location_name: null })
    }
    navigate('/')
  }, [sessions, reset, player, updatePlayer, navigate])

  // Горячие клавиши
  useEffect(() => {
    const activeSession = activeSessionId ? sessions[activeSessionId] : null
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeSession) return

      if (activeSession.state === 'fighting') {
        if (e.key === 'g' || e.key === 'G' || e.key === 'п' || e.key === 'П') {
          handleFightAction('reel')
        } else if (e.key === 'h' || e.key === 'H' || e.key === 'р' || e.key === 'Р') {
          handleFightAction('pull')
        }
      } else if (activeSession.state === 'bite') {
        if (e.key === ' ' || e.key === 'Enter') {
          handleStrike()
        }
      } else if (activeSession.state === 'waiting' && activeSession.rodClass === 'spinning') {
        if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') {
          if (!activeSession.isRetrieving) {
            send('update_retrieve', { session_id: activeSession.id, is_retrieving: true })
          }
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!activeSession) return
      if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') {
        if (activeSession.state === 'waiting' && activeSession.rodClass === 'spinning' && activeSession.isRetrieving) {
          send('update_retrieve', { session_id: activeSession.id, is_retrieving: false })
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [activeSessionId, sessions, handleFightAction, handleStrike, send])

  const gt = useFishingStore((s) => s.gameTime)
  const timeLabels: Record<string, string> = {
    morning: 'Утро', day: 'День', evening: 'Вечер', night: 'Ночь',
  }

  const locationImage = player?.current_location_image
    ? normalizeMediaUrl(player.current_location_image)
    : player?.current_location
      ? getLocationImageUrl(player.current_location)
      : null

  const sessionList = Object.values(sessions)
  const activeSession = activeSessionId ? sessions[activeSessionId] : null
  const activeFight = activeSessionId ? fights[activeSessionId] : null

  // Удочки, которые ещё не заброшены
  const castRodIds = new Set(sessionList.map((s) => s.rodId))
  const availableRods = rods.filter((r) => !castRodIds.has(r.id))

  // Формируем Set из сессий которые в режиме проводки
  const retrievingSessions = new Set(
    sessionList.filter((s) => s.isRetrieving).map((s) => s.id),
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Инфо-панель */}
      <div style={{
        background: 'rgba(7,18,7,0.85)', backdropFilter: 'blur(4px)',
        padding: '5px 12px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', borderBottom: '1px solid rgba(92,61,30,0.3)',
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: 'Georgia, serif', fontSize: '0.78rem', color: '#a8894e' }}>
          📍 {player?.current_location_name || 'Локация'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {gt && (
            <span style={{ fontSize: '0.72rem', color: '#7898b8' }}>
              {gt.time_of_day === 'morning' ? '🌅' : gt.time_of_day === 'day' ? '☀️' : gt.time_of_day === 'evening' ? '🌆' : '🌙'}
              {' '}{timeLabels[gt.time_of_day] || gt.time_of_day} {gt.hour}:00 · День {gt.day}
            </span>
          )}
          <span
            title={connected ? 'Подключено' : 'Нет соединения'}
            style={{
              width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
              background: connected ? '#4ade80' : '#f87171',
              boxShadow: connected ? '0 0 6px rgba(74,222,128,0.5)' : '0 0 6px rgba(248,113,113,0.5)',
            }}
          />
        </div>
      </div>

      {/* Основная область: водоём + правая панель */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Водоём */}
        <div ref={waterRef} className="flex-[2] lg:flex-1 min-h-0 min-w-0 relative overflow-hidden">
          <WaterScene
            key={locationImage || 'default'}
            sessions={sessionList}
            fights={fights}
            activeSessionId={activeSessionId}
            timeOfDay={gt?.time_of_day || 'day'}
            locationImageUrl={locationImage}
            retrievingSessions={retrievingSessions}
            onWaterClick={handleWaterClick}
            onFloatClick={handleFloatClick}
          />

          {/* Оверлей: нет снастей */}
          {sessionList.length === 0 && rods.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div style={{
                background: 'rgba(7,18,7,0.82)', backdropFilter: 'blur(6px)',
                border: '1px solid rgba(92,61,30,0.4)', borderRadius: '12px',
                padding: '14px 24px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.6rem', marginBottom: '6px' }}>🎣</div>
                <p style={{ fontFamily: 'Georgia, serif', fontSize: '0.82rem', color: '#8b6d3f' }}>
                  Нет готовых снастей
                </p>
                <p style={{ fontSize: '0.68rem', color: '#5c3d1e', marginTop: '3px' }}>
                  Соберите удочку в рюкзаке
                </p>
              </div>
            </div>
          )}

          {/* Оверлей: подсказка заброса */}
          {sessionList.length === 0 && rods.length > 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div style={{
                background: 'rgba(7,18,7,0.75)', backdropFilter: 'blur(4px)',
                border: '1px solid rgba(120,152,184,0.3)', borderRadius: '12px',
                padding: '12px 22px', textAlign: 'center',
                animation: 'pulse 2s ease-in-out infinite',
              }}>
                <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>🎯</div>
                <p style={{ fontFamily: 'Georgia, serif', fontSize: '0.85rem', color: '#7898b8' }}>
                  Кликните по воде для заброса
                </p>
              </div>
            </div>
          )}

          {/* Оверлей: поклёвка на активной удочке */}
          {activeSession?.state === 'bite' && (
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
              <div style={{
                fontFamily: 'Georgia, serif', fontSize: '2.2rem', fontWeight: 'bold',
                color: '#fca5a5', animation: 'bounce 0.5s infinite',
                textShadow: '0 0 24px rgba(255,0,0,0.7), 0 0 48px rgba(255,0,0,0.3), 0 2px 6px rgba(0,0,0,0.9)',
                letterSpacing: '0.08em',
              }}>
                ⚡ ПОКЛЁВКА!
              </div>
            </div>
          )}
        </div>

        {/* Правая панель */}
        <div className="flex-1 lg:flex-none w-full lg:w-80 xl:w-96 min-h-0 overflow-hidden">
          <TacklePanel
            rods={rods}
            availableRods={availableRods}
            selectedRodId={selectedRodId}
            onSelectRod={setSelectedRodId}
            sessions={sessionList}
            fights={fights}
            activeSessionId={activeSessionId}
            activeSession={activeSession}
            activeFight={activeFight}
            onSessionClick={setActiveSession}
            onStrike={handleStrike}
            onReelIn={() => handleFightAction('reel')}
            onPull={() => handleFightAction('pull')}
            onRetrieve={handleRetrieve}
            onStartRetrieve={handleStartRetrieve}
            onStopRetrieve={handleStopRetrieve}
            onLeave={handleLeave}
            onUpdateSettings={handleUpdateSettings}
            onChangeTackle={handleChangeTackle}
            onMessage={setMessage}
            message={message}
            chatChannelId={player?.current_location || null}
          />
        </div>
      </div>

      {/* Модальное окно пойманной рыбы */}
      {caughtInfo && (
        <CaughtFishModal
          fish={caughtInfo.fish}
          speciesImage={caughtInfo.speciesImage}
          weight={caughtInfo.weight}
          length={caughtInfo.length}
          rarity={caughtInfo.rarity}
          onKeep={handleKeep}
          onRelease={handleRelease}
        />
      )}
    </div>
  )
}
