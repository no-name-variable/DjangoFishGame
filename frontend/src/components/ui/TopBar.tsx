/**
 * Верхняя панель HUD — улучшенная с иконками, игровым временем и кнопкой expand.
 * Вся бизнес-логика сохранена; улучшена презентация.
 */
import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProfile } from '../../api/auth'
import { usePlayerStore } from '../../store/playerStore'
import { useFishingStore } from '../../store/fishingStore'
import { useSoundStore } from '../../hooks/useSoundStore'

const TOD_ICON: Record<string, string> = {
  dawn: '🌅', morning: '🌤️', day: '☀️', evening: '🌇', night: '🌙', midnight: '🌑',
}

/** Маленький горизонтальный прогресс-бар */
function MiniBar({ value, color, width = 52, className }: { value: number; color: string; width?: number; className?: string }) {
  return (
    <div className={className} style={{
      width, height: '5px', borderRadius: '3px',
      background: 'rgba(13,31,13,0.8)',
      border: '1px solid rgba(74,49,24,0.4)',
      overflow: 'hidden', flexShrink: 0,
    }}>
      <div style={{
        width: `${Math.min(100, value)}%`, height: '100%',
        borderRadius: '3px', background: color, transition: 'width 0.4s ease',
      }} />
    </div>
  )
}

/** Иконка + контент в ряд */
function Stat({ icon, title, children, className }: { icon: string; title?: string; children: ReactNode; className?: string }) {
  return (
    <div title={title} className={className} style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
      <span style={{ fontSize: '0.82rem', lineHeight: 1 }}>{icon}</span>
      {children}
    </div>
  )
}

export default function TopBar() {
  const player       = usePlayerStore((s) => s.player)
  const setPlayer    = usePlayerStore((s) => s.setPlayer)
  const logout       = usePlayerStore((s) => s.logout)
  const navigate     = useNavigate()
  const gameTime     = useFishingStore((s) => s.gameTime)
  const soundEnabled = useSoundStore((s) => s.enabled)
  const toggleSound  = useSoundStore((s) => s.toggle)
  const volume       = useSoundStore((s) => s.volume)
  const setVolume    = useSoundStore((s) => s.setVolume)

  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    getProfile().then(setPlayer).catch(() => {})
  }, [setPlayer])

  if (!player) return null

  const expPercent  = Math.min(100, Math.round((player.experience / player.experience_to_next_rank) * 100))
  const hungerColor = player.hunger > 50 ? '#22c55e' : player.hunger > 20 ? '#eab308' : '#ef4444'
  const karmaColor  = player.karma >= 0 ? '#4ade80' : '#f87171'
  const todIcon     = gameTime?.time_of_day ? (TOD_ICON[gameTime.time_of_day] ?? '🌤️') : null
  const timeStr     = gameTime ? `${String(gameTime.hour).padStart(2, '0')}:00` : null

  const iconBtn: CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '4px', borderRadius: '4px',
    minWidth: '28px', minHeight: '28px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'color 0.2s',
  }

  return (
    <header className="wood-panel" style={{ borderRadius: '12px 12px 0 0', padding: 0 }}>

      {/* ── Основная строка ──────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 sm:gap-3 px-2.5 sm:px-3 py-1.5">

        {/* ── Левая часть: никнейм + разряд + XP ── */}
        <div className="flex items-center gap-2 min-w-0 shrink">
          {/* Аватар-инициал */}
          <div className="shrink-0" style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #2e7d2e, #1a5a1a)',
            border: '1px solid rgba(212,168,74,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', color: '#d4a84a', fontWeight: 'bold',
          }}>
            {player.nickname.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0">
            {/* Ник + ранг */}
            <div className="flex items-center gap-1.5">
              <span className="gold-text text-sm font-bold whitespace-nowrap truncate max-w-[80px] sm:max-w-none">
                {player.nickname}
              </span>
              <span className="hidden sm:inline-block shrink-0" style={{
                background: 'rgba(46,125,46,0.3)', border: '1px solid rgba(46,125,46,0.45)',
                borderRadius: '4px', padding: '0 4px',
                fontSize: '0.58rem', color: '#7bc67b', whiteSpace: 'nowrap',
              }}>
                {player.rank} · {player.rank_title}
              </span>
            </div>
            {/* XP */}
            <div className="flex items-center gap-1.5 mt-0.5">
              <MiniBar value={expPercent} color="#d4a84a" width={48} />
              <span className="text-[0.6rem] text-wood-300 whitespace-nowrap">
                {expPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* ── Центр: локация + время (скрыто на мобильных) ── */}
        <div className="hidden md:flex items-center gap-1.5 text-[0.68rem] text-wood-300 overflow-hidden shrink min-w-0">
          {player.current_base_name && (
            <span className="whitespace-nowrap overflow-hidden text-ellipsis">
              🏕️ {player.current_base_name}
            </span>
          )}
          {player.current_location_name && (
            <>
              <span style={{ opacity: 0.35 }}>/</span>
              <span className="whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: '#7898b8' }}>
                {player.current_location_name}
              </span>
            </>
          )}
          {todIcon && timeStr && (
            <>
              <span style={{ opacity: 0.35 }}>·</span>
              <span className="whitespace-nowrap" style={{ color: '#7898b8' }}>{todIcon} {timeStr}</span>
            </>
          )}
        </div>

        {/* ── Правая часть: ресурсы + кнопки ── */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Деньги */}
          <Stat icon="💰" title={`Серебро: ${player.money}`}>
            <span className="text-xs font-semibold whitespace-nowrap" style={{ color: '#eab308' }}>
              {Number(player.money).toFixed(0)}
            </span>
          </Stat>

          {/* Карма — скрыта на маленьких экранах */}
          <Stat icon="⚖️" title={`Карма: ${player.karma}`} className="hidden sm:flex">
            <span className="text-xs font-medium" style={{ color: karmaColor }}>
              {player.karma >= 0 ? '+' : ''}{player.karma}
            </span>
          </Stat>

          {/* Сытость */}
          <Stat icon="🍖" title={`Сытость: ${player.hunger}%`}>
            <MiniBar value={player.hunger} color={hungerColor} width={32} />
          </Stat>

          {/* Звук */}
          <button
            onClick={toggleSound}
            style={{ ...iconBtn, fontSize: '0.85rem', color: soundEnabled ? '#a8894e' : '#6b5030' }}
            title={soundEnabled ? 'Выключить звук' : 'Включить звук'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>

          {/* Громкость — скрыта на мобильных */}
          {soundEnabled && (
            <input
              type="range" min="0" max="1" step="0.1" value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="accent-gold hidden sm:block"
              style={{ width: '40px', height: '4px', cursor: 'pointer' }}
              title={`Громкость: ${Math.round(volume * 100)}%`}
            />
          )}

          {/* Выход */}
          <button
            onClick={() => { logout(); navigate('/login') }}
            style={{ ...iconBtn, fontSize: '0.75rem', color: '#6b5030' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#6b5030' }}
            title="Выход"
          >
            ✖
          </button>

          {/* Collapse toggle */}
          <button
            onClick={() => setExpanded(v => !v)}
            style={{ ...iconBtn, fontSize: '0.7rem', color: '#6b5030' }}
            title={expanded ? 'Свернуть' : 'Подробнее'}
          >
            <span style={{
              display: 'block',
              transform: expanded ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
            }}>▾</span>
          </button>
        </div>
      </div>

      {/* ── Раскрытая дополнительная инфо ────────────────────────── */}
      {expanded && (
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-[0.7rem] px-3 py-1.5"
          style={{ borderTop: '1px solid rgba(74,49,24,0.35)' }}>

          {/* Локация + время — показываем только на мобильных (на десктопе уже видно) */}
          {(player.current_base_name || (todIcon && timeStr)) && (
            <div className="flex md:hidden items-center gap-1.5 text-wood-300">
              {player.current_base_name && <span>🏕️ {player.current_base_name}</span>}
              {player.current_location_name && <span style={{ color: '#7898b8' }}>/ {player.current_location_name}</span>}
              {todIcon && timeStr && <span style={{ color: '#7898b8' }}>{todIcon} {timeStr}</span>}
            </div>
          )}

          {/* Карма — на мобильных (на десктопе видна в основной строке) */}
          <div className="flex sm:hidden items-center gap-1">
            <span>⚖️</span>
            <span style={{ color: karmaColor }}>{player.karma >= 0 ? '+' : ''}{player.karma} кармы</span>
          </div>

          {/* Разряд — на мобильных */}
          <div className="flex sm:hidden items-center gap-1">
            <span>⭐</span>
            <span style={{ color: '#7bc67b' }}>{player.rank} · {player.rank_title}</span>
          </div>

          {/* XP детально */}
          <div className="flex items-center gap-1.5">
            <span style={{ color: '#8b6d3f' }}>✨ Опыт:</span>
            <span style={{ color: '#d4a84a' }}>{player.experience}</span>
            <span style={{ color: '#6b5030' }}>/</span>
            <span style={{ color: '#8b6d3f' }}>{player.experience_to_next_rank}</span>
          </div>

          {/* Золото */}
          {player.gold > 0 && (
            <div className="flex items-center gap-1">
              <span>🥇</span>
              <span style={{ color: '#d4a84a' }}>{player.gold}</span>
            </div>
          )}

          {/* Сытость детально */}
          <div className="flex items-center gap-1.5">
            <span style={{ color: '#8b6d3f' }}>🍖 Сытость:</span>
            <MiniBar value={player.hunger} color={hungerColor} width={56} />
            <span style={{ color: hungerColor }}>{player.hunger}%</span>
          </div>

          {/* Игровой день */}
          {gameTime && (
            <div className="flex items-center gap-1" style={{ color: '#7898b8' }}>
              <span>📅</span>
              <span>День {gameTime.day}</span>
            </div>
          )}

          {/* Громкость — на мобильных (если звук включён) */}
          {soundEnabled && (
            <div className="flex sm:hidden items-center gap-1.5">
              <span className="text-wood-300">🔊</span>
              <input
                type="range" min="0" max="1" step="0.1" value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="accent-gold"
                style={{ width: '50px', height: '4px', cursor: 'pointer' }}
              />
            </div>
          )}
        </div>
      )}
    </header>
  )
}
