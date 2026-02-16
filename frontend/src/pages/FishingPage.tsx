/**
 * Основной экран рыбалки — мульти-удочки, клик-заброс.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as fishingApi from '../api/fishing'
import { leaveLocation, updateRodSettings } from '../api/player'
import { getProfile } from '../api/auth'
import { useFishingStore } from '../store/fishingStore'
import { usePlayerStore } from '../store/playerStore'
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
  const setSessions = useFishingStore((s) => s.setSessions)
  const setActiveSession = useFishingStore((s) => s.setActiveSession)
  const setCaught = useFishingStore((s) => s.setCaught)
  const removeSession = useFishingStore((s) => s.removeSession)
  const setGameTime = useFishingStore((s) => s.setGameTime)
  const reset = useFishingStore((s) => s.reset)

  const [rods, setRods] = useState<FullRod[]>([])
  const [selectedRodId, setSelectedRodId] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const waterRef = useRef<HTMLDivElement>(null)
  const { play } = useSound()
  const prevBiteIdsRef = useRef<Set<number>>(new Set())

  useAmbience(!!player?.current_location)

  // Загрузка удочек из слотов игрока - только когда меняются ID удочек
  useEffect(() => {
    if (player) {
      // Берём только удочки из слотов (максимум 3)
      const slotRods = [
        player.rod_slot_1,
        player.rod_slot_2,
        player.rod_slot_3,
      ].filter((rod) => rod !== null && rod.is_ready) as FullRod[]

      // Обновляем только если ID удочек изменились (избегаем мигания)
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

  // Инициализация: игровое время и начальный статус
  useEffect(() => {
    fishingApi.getGameTime().then(setGameTime).catch(() => {})

    // Начальный статус
    fishingApi.getStatus()
      .then((data) => {
        setSessions(data.sessions, data.fights)
        if (data.game_time) setGameTime(data.game_time)
      })
      .catch(() => {})

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [setGameTime, setSessions])

  // Polling
  const startPolling = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    pollingRef.current = setInterval(async () => {
      try {
        const data = await fishingApi.getStatus()
        setSessions(data.sessions, data.fights)
        if (data.game_time) setGameTime(data.game_time)

        // Звук поклёвки для новых bite-сессий
        const newBiteIds = new Set(
          data.sessions.filter((s) => s.state === 'bite').map((s) => s.id),
        )
        for (const id of newBiteIds) {
          if (!prevBiteIdsRef.current.has(id)) {
            play('bite')
            setMessage('ПОКЛЁВКА! Подсекай!')
            // Автовыбор сессии с поклёвкой
            const store = useFishingStore.getState()
            if (!store.hasFighting()) {
              setActiveSession(id)
            }
          }
        }
        prevBiteIdsRef.current = newBiteIds
      } catch {
        // ignore
      }
    }, 1500)
  }, [setSessions, setActiveSession, play])

  // Запускаем polling при наличии сессий
  useEffect(() => {
    const sessionList = Object.values(sessions)
    if (sessionList.length > 0) {
      startPolling()
    } else {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [Object.keys(sessions).length > 0, startPolling])

  // Клик по воде = заброс
  const handleWaterClick = useCallback(async (normX: number, normY: number) => {
    if (!selectedRodId) {
      setMessage('Выберите снасть')
      return
    }
    // Проверка что удочка не заброшена
    const sessionList = Object.values(sessions)
    if (sessionList.some((s) => s.rodId === selectedRodId)) {
      setMessage('Эта удочка уже заброшена')
      return
    }
    if (sessionList.length >= 3) {
      setMessage('Максимум 3 удочки одновременно')
      return
    }

    try {
      const result = await fishingApi.cast(selectedRodId, normX, normY)
      play('cast')
      setMessage('Заброс! Ожидаем поклёвку...')

      // Запускаем анимацию заброса
      const waterEl = waterRef.current?.querySelector('div') as HTMLDivElement & {
        __addCastAnim?: (sid: number, x: number, y: number) => void
      } | null
      waterEl?.__addCastAnim?.(result.session_id, normX, normY)

      // Обновляем статус
      const data = await fishingApi.getStatus()
      setSessions(data.sessions, data.fights)
      if (data.game_time) setGameTime(data.game_time)
      setActiveSession(result.session_id)
      startPolling()

      // Автовыбор следующей незаброшенной удочки
      const castRodIds = new Set(data.sessions.map((s) => s.rod_id))
      const nextRod = rods.find((r) => !castRodIds.has(r.id))
      if (nextRod) setSelectedRodId(nextRod.id)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Ошибка заброса'
      setMessage(msg)
    }
  }, [selectedRodId, sessions, rods, setSessions, setActiveSession, startPolling, play])

  // Клик по поплавку = выбор сессии
  const handleFloatClick = useCallback((sessionId: number) => {
    setActiveSession(sessionId)
  }, [setActiveSession])

  const handleStrike = useCallback(async () => {
    if (!activeSessionId) return
    try {
      const result = await fishingApi.strike(activeSessionId)
      setMessage(`На крючке: ${result.fish}! Вываживай!`)
      const data = await fishingApi.getStatus()
      setSessions(data.sessions, data.fights)
      if (data.game_time) setGameTime(data.game_time)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Рыба сошла'
      setMessage(msg)
      const data = await fishingApi.getStatus()
      setSessions(data.sessions, data.fights)
      if (data.game_time) setGameTime(data.game_time)
    }
  }, [activeSessionId, setSessions])

  const handleFightAction = useCallback(async (action: 'reel' | 'pull') => {
    if (!activeSessionId) return
    try {
      const result = action === 'reel'
        ? await fishingApi.reelIn(activeSessionId)
        : await fishingApi.pullRod(activeSessionId)

      if (result.result === 'caught') {
        play('catch')
        setCaught({
          sessionId: activeSessionId,
          fish: result.fish,
          speciesImage: result.species_image || null,
          weight: result.weight,
          length: result.length,
          rarity: result.rarity,
        })
        setMessage('Рыба поймана!')
      } else if (result.result === 'fighting') {
        play('reel')
      } else {
        play('break')
        setMessage(result.result === 'line_break' ? 'Обрыв лески!' : 'Удилище сломалось!')
      }

      const data = await fishingApi.getStatus()
      setSessions(data.sessions, data.fights)
      if (data.game_time) setGameTime(data.game_time)
    } catch {
      setMessage('Ошибка')
    }
  }, [activeSessionId, setSessions, setCaught, setGameTime, play])

  const handleKeep = useCallback(async () => {
    if (!activeSessionId) return
    try {
      const result = await fishingApi.keepFish(activeSessionId)
      setMessage(`${result.species_name} ${result.weight.toFixed(2)}кг в садке! +${result.experience_reward} опыта`)
      setCaught(null)
      removeSession(activeSessionId)
      const profile = await getProfile()
      setPlayer(profile)
    } catch {
      setMessage('Ошибка')
    }
  }, [activeSessionId, setCaught, removeSession, setPlayer])

  const handleRelease = useCallback(async () => {
    if (!activeSessionId) return
    try {
      const result = await fishingApi.releaseFish(activeSessionId)
      setMessage(`Отпущена! +${result.karma_bonus} кармы`)
      setCaught(null)
      removeSession(activeSessionId)
      const profile = await getProfile()
      setPlayer(profile)
    } catch {
      setMessage('Ошибка')
    }
  }, [activeSessionId, setCaught, removeSession, setPlayer])

  const handleRetrieve = useCallback(async (sessionId: number) => {
    try {
      await fishingApi.retrieveRod(sessionId)
      removeSession(sessionId)
      setMessage('Удочка вытащена')
      // Обновляем статус с сервера для синхронизации
      fishingApi.getStatus()
        .then((data) => {
          setSessions(data.sessions, data.fights)
          if (data.game_time) setGameTime(data.game_time)
        })
        .catch(() => {})
    } catch {
      setMessage('Ошибка')
    }
  }, [removeSession, setSessions, setGameTime])

  const handleStartRetrieve = useCallback(async (sessionId: number) => {
    try {
      await fishingApi.updateRetrieve(sessionId, true)
    } catch {
      // ignore
    }
  }, [])

  const handleStopRetrieve = useCallback(async (sessionId: number) => {
    try {
      await fishingApi.updateRetrieve(sessionId, false)
    } catch {
      // ignore
    }
  }, [])

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
    if (pollingRef.current) clearInterval(pollingRef.current)
    // Вытаскиваем все удочки
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
    const handleKeyDown = async (e: KeyboardEvent) => {
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
        // Проводка спиннинга - клавиша R (русская К)
        if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') {
          if (!activeSession.isRetrieving) {
            await fishingApi.updateRetrieve(activeSession.id, true).catch(() => {})
          }
        }
      }
    }

    const handleKeyUp = async (e: KeyboardEvent) => {
      if (!activeSession) return
      // Остановка проводки при отпускании R
      if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') {
        if (activeSession.state === 'waiting' && activeSession.rodClass === 'spinning' && activeSession.isRetrieving) {
          await fishingApi.updateRetrieve(activeSession.id, false).catch(() => {})
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [activeSessionId, sessions, handleFightAction, handleStrike])

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
      <div className="bg-forest-900/80 px-3 py-1 flex items-center justify-between text-xs border-b border-wood-800/40">
        <span className="text-wood-400 font-serif">{player?.current_location_name}</span>
        {gt && (
          <span className="text-water-400">
            {timeLabels[gt.time_of_day] || gt.time_of_day} — {gt.hour}:00
          </span>
        )}
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
              <p className="wood-panel px-6 py-3 text-wood-400">
                Нет готовых снастей. Соберите удочку в рюкзаке.
              </p>
            </div>
          )}

          {/* Оверлей: подсказка заброса */}
          {sessionList.length === 0 && rods.length > 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="wood-panel px-6 py-3 text-wood-400 animate-pulse">
                Кликните по воде для заброса
              </p>
            </div>
          )}

          {/* Оверлей: поклёвка на активной удочке */}
          {activeSession?.state === 'bite' && (
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
              <div className="text-red-400 text-4xl font-bold font-serif animate-bounce"
                style={{ textShadow: '0 0 20px rgba(255,0,0,0.5), 0 2px 4px rgba(0,0,0,0.8)' }}>
                ПОКЛЁВКА!
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
