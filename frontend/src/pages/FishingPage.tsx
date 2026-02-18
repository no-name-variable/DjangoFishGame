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
import InventoryModal from '../components/inventory/InventoryModal'
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
  const [keepError, setKeepError] = useState<string | null>(null)
  const [gearOpen, setGearOpen] = useState(false)
  const waterRef = useRef<HTMLDivElement>(null)
  const lastCastRodClassRef = useRef<string | null>(null)
  const { play } = useSound()

  useAmbience(!!player?.current_location)

  // WebSocket — колбэки для событий
  const { send, connected } = useFishingSocket({
    onNibble: () => {
      play('nibble')
    },
    onBite: () => {
      play('bite')
    },
    onCastOk: () => {
      play('cast')
      setMessage('🎣 Заброс! Ожидаем поклёвку...')
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
      setKeepError(null)
      setCaught(null)
      getProfile().then(setPlayer).catch(() => {})
    },
    onReleaseResult: (data) => {
      setMessage(`Отпущена! +${data.karma_bonus} кармы`)
      setKeepError(null)
      setCaught(null)
      getProfile().then(setPlayer).catch(() => {})
    },
    onError: (msg) => {
      // Если модалка пойманной рыбы открыта — показать ошибку в ней
      if (useFishingStore.getState().caughtInfo) {
        setKeepError(msg)
      } else {
        setMessage(msg)
      }
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
    const existingSession = sessionList.find((s) => s.rodId === selectedRodId)
    if (existingSession) {
      setMessage('Эта удочка уже заброшена')
      return
    }
    if (sessionList.length >= 3) {
      setMessage('Максимум 3 удочки одновременно')
      return
    }

    // Запоминаем класс удочки для правильного сообщения в onCastOk
    lastCastRodClassRef.current = rods.find((r) => r.id === selectedRodId)?.rod_class ?? null
    send('cast', { rod_id: selectedRodId, point_x: normX, point_y: normY })
  }, [selectedRodId, sessions, rods, send])

  // Клик по поплавку = выбор сессии
  const handleFloatClick = useCallback((sessionId: number) => {
    setActiveSession(sessionId)
  }, [setActiveSession])

  const handleStrike = useCallback(() => {
    const sessionList = Object.values(sessions)

    // Ищем цель: сначала выбранная удочка, потом любая с поклёвкой
    let target = selectedRodId
      ? sessionList.find((s) => s.rodId === selectedRodId) || null
      : null

    // Если на выбранной нет bite/nibble — ищем среди всех
    if (!target || (target.state !== 'bite' && target.state !== 'nibble')) {
      const biting = sessionList.find((s) => s.state === 'bite')
      const nibbling = sessionList.find((s) => s.state === 'nibble')
      if (biting) {
        target = biting
      } else if (nibbling) {
        target = nibbling
      }
    }

    if (!target) {
      setMessage('Нет заброшенных удочек')
      return
    }

    if (target.state === 'bite') {
      setActiveSession(target.id)
      setSelectedRodId(target.rodId)
      send('strike', { session_id: target.id })
      return
    }

    if (target.state === 'nibble') {
      setActiveSession(target.id)
      setSelectedRodId(target.rodId)
      setMessage('Подёргивает... Ждите поклёвку!')
      return
    }

    setMessage('Поклёвки нет — ждите')
  }, [selectedRodId, sessions, send, setMessage, setActiveSession])

  const handleFightAction = useCallback((action: 'reel' | 'pull') => {
    if (!activeSessionId) return
    const wsAction = action === 'reel' ? 'reel_in' : 'pull'
    send(wsAction, { session_id: activeSessionId })
    if (action === 'reel') play('reel')
  }, [activeSessionId, send, play])

  const handleKeep = useCallback(() => {
    const sid = caughtInfo?.sessionId
      ?? activeSessionId
      ?? Object.values(sessions).find((s) => s.state === 'caught')?.id
    if (!sid) return
    send('keep', { session_id: sid })
  }, [caughtInfo?.sessionId, activeSessionId, sessions, send])

  const handleRelease = useCallback(() => {
    const sid = caughtInfo?.sessionId
      ?? activeSessionId
      ?? Object.values(sessions).find((s) => s.state === 'caught')?.id
    if (!sid) return
    send('release', { session_id: sid })
  }, [caughtInfo?.sessionId, activeSessionId, sessions, send])

  const handleRetrieve = useCallback((sessionId: number) => {
    send('retrieve', { session_id: sessionId })
    removeSession(sessionId)
    setMessage('Удочка вытащена')
  }, [send, removeSession, sessions])

  const handleUpdateSettings = useCallback(async (
    rodId: number, settings: { depth_setting?: number },
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
      if (s.state === 'waiting' || s.state === 'idle' || s.state === 'nibble') {
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
    const handleKeyDown = (e: KeyboardEvent) => {
      const sessionList = Object.values(sessions)
      const activeSession = activeSessionId ? sessions[activeSessionId] : null

      // Горячие клавиши 1/2/3 — переключение удочек
      if (e.key === '1' || e.key === '2' || e.key === '3') {
        const slotNum = Number(e.key)
        const targetSession = sessionList.find((s) => s.slot === slotNum)
        if (targetSession) {
          setActiveSession(targetSession.id)
          setSelectedRodId(targetSession.rodId)
        } else {
          const rodByIndex = rods[slotNum - 1]
          if (rodByIndex) setSelectedRodId(rodByIndex.id)
        }
        return
      }

      if (activeSession?.state === 'fighting') {
        if (e.key === 'g' || e.key === 'G' || e.key === 'п' || e.key === 'П') {
          handleFightAction('reel')
        } else if (e.key === 'h' || e.key === 'H' || e.key === 'р' || e.key === 'Р') {
          handleFightAction('pull')
        }
      } else if (e.key === ' ' || e.key === 'Enter') {
        // Space/Enter — подсечка (handleStrike сам найдёт bite/nibble)
        handleStrike()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeSessionId, sessions, handleFightAction, handleStrike, send, selectedRodId, rods, setActiveSession, setSelectedRodId])

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

  // Авто-выбор: если выбранная удочка уже заброшена — переключить на следующую
  const selectedRodCast = !!selectedRodId && castRodIds.has(selectedRodId)
  useEffect(() => {
    if (selectedRodCast && availableRods.length > 0) {
      setSelectedRodId(availableRods[0].id)
    }
  }, [selectedRodCast, availableRods.length])

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
          <button
            onClick={() => setGearOpen(true)}
            title="Управление снастями"
            style={{
              background: 'rgba(92,61,30,0.25)', border: '1px solid rgba(92,61,30,0.4)',
              borderRadius: '6px', color: '#a8894e', fontSize: '0.8rem',
              padding: '2px 8px', cursor: 'pointer', lineHeight: 1.4,
            }}
          >
            🎒
          </button>
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
            onKeep={handleKeep}
            onRelease={handleRelease}
            onRetrieve={handleRetrieve}
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
          error={keepError}
          onKeep={handleKeep}
          onRelease={handleRelease}
        />
      )}

      {gearOpen && (
        <InventoryModal
          sessions={sessionList}
          onUpdateSettings={handleUpdateSettings}
          onChangeTackle={handleChangeTackle}
          onClose={() => setGearOpen(false)}
        />
      )}
    </div>
  )
}
