/**
 * Верхняя панель HUD — деревянная полоса с информацией игрока.
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProfile } from '../../api/auth'
import { usePlayerStore } from '../../store/playerStore'
import { useSoundStore } from '../../hooks/useSoundStore'

export default function TopBar() {
  const player = usePlayerStore((s) => s.player)
  const setPlayer = usePlayerStore((s) => s.setPlayer)
  const logout = usePlayerStore((s) => s.logout)
  const navigate = useNavigate()
  const soundEnabled = useSoundStore((s) => s.enabled)
  const toggleSound = useSoundStore((s) => s.toggle)
  const volume = useSoundStore((s) => s.volume)
  const setVolume = useSoundStore((s) => s.setVolume)

  useEffect(() => {
    getProfile().then(setPlayer).catch(() => {})
  }, [setPlayer])

  if (!player) return null

  const expPercent = Math.round(
    (player.experience / player.experience_to_next_rank) * 100,
  )

  const hungerColor =
    player.hunger > 50 ? 'bg-green-500' : player.hunger > 20 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <header className="wood-panel rounded-none rounded-t-lg px-3 py-1.5">
      <div className="flex items-center justify-between">
        {/* Левая часть: никнейм + разряд + опыт */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="gold-text text-base font-bold">{player.nickname}</span>
            <span className="text-wood-400 text-xs">
              [{player.rank}] {player.rank_title}
            </span>
          </div>
          <div className="flex items-center gap-1.5" title={`Опыт: ${player.experience}/${player.experience_to_next_rank}`}>
            <div className="w-20 bg-forest-900/80 rounded-full h-1.5 border border-wood-700/40">
              <div
                className="bg-gold h-full rounded-full transition-all"
                style={{ width: `${expPercent}%` }}
              />
            </div>
            <span className="text-wood-500 text-[10px]">{expPercent}%</span>
          </div>
        </div>

        {/* Центр: локация + время */}
        <div className="flex items-center gap-2 text-xs">
          {player.current_base_name && (
            <span className="text-wood-300">{player.current_base_name}</span>
          )}
          {player.current_location_name && (
            <>
              <span className="text-wood-600">/</span>
              <span className="text-water-300">{player.current_location_name}</span>
            </>
          )}
        </div>

        {/* Правая часть: ресурсы */}
        <div className="flex items-center gap-3 text-xs">
          {/* Деньги */}
          <div className="flex items-center gap-1" title="Серебро">
            <span className="text-yellow-500">$</span>
            <span className="text-yellow-400 font-medium">
              {Number(player.money).toFixed(0)}
            </span>
          </div>

          {/* Карма */}
          <div className="flex items-center gap-1" title="Карма">
            <span className={player.karma >= 0 ? 'text-green-400' : 'text-red-400'}>
              {player.karma >= 0 ? '+' : ''}{player.karma}
            </span>
          </div>

          {/* Сытость */}
          <div className="flex items-center gap-1" title={`Сытость: ${player.hunger}%`}>
            <div className="w-10 bg-forest-900/80 rounded-full h-1.5 border border-wood-700/40">
              <div
                className={`h-full rounded-full transition-all ${hungerColor}`}
                style={{ width: `${player.hunger}%` }}
              />
            </div>
          </div>

          {/* Звук */}
          <button
            onClick={toggleSound}
            className="text-wood-500 hover:text-wood-300 transition-colors"
            title={soundEnabled ? 'Выключить звук' : 'Включить звук'}
          >
            {soundEnabled ? '\u{1F50A}' : '\u{1F507}'}
          </button>
          {soundEnabled && (
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-12 h-1 accent-gold"
              title={`Громкость: ${Math.round(volume * 100)}%`}
            />
          )}

          {/* Выход */}
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="text-wood-500 hover:text-red-400 transition-colors ml-1"
            title="Выход"
          >
            \u{2716}
          </button>
        </div>
      </div>
    </header>
  )
}
