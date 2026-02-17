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
function MiniBar({ value, color, width = 52 }: { value: number; color: string; width?: number }) {
  return (
    <div style={{
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
function Stat({ icon, title, children }: { icon: string; title?: string; children: ReactNode }) {
  return (
    <div title={title} style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
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
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 10px', gap: '8px', flexWrap: 'nowrap',
      }}>

        {/* ── Левая часть: никнейм + разряд + XP ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexShrink: 1 }}>
          {/* Аватар-инициал */}
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #2e7d2e, #1a5a1a)',
            border: '1px solid rgba(212,168,74,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', color: '#d4a84a', fontWeight: 'bold', flexShrink: 0,
          }}>
            {player.nickname.charAt(0).toUpperCase()}
          </div>

          <div style={{ minWidth: 0 }}>
            {/* Ник + ранг */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'nowrap' }}>
              <span className="gold-text" style={{ fontSize: '0.85rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                {player.nickname}
              </span>
              <span style={{
                background: 'rgba(46,125,46,0.3)', border: '1px solid rgba(46,125,46,0.45)',
                borderRadius: '4px', padding: '0 4px',
                fontSize: '0.58rem', color: '#7bc67b', whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                {player.rank} · {player.rank_title}
              </span>
            </div>
            {/* XP */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
              <MiniBar value={expPercent} color="#d4a84a" width={64} />
              <span style={{ fontSize: '0.6rem', color: '#8b6d3f', whiteSpace: 'nowrap' }}>
                {expPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* ── Центр: локация + время ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          fontSize: '0.68rem', color: '#8b6d3f',
          overflow: 'hidden', flexShrink: 1, minWidth: 0,
        }}>
          {player.current_base_name && (
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              🏕️ {player.current_base_name}
            </span>
          )}
          {player.current_location_name && (
            <>
              <span style={{ opacity: 0.35 }}>/</span>
              <span style={{ color: '#7898b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {player.current_location_name}
              </span>
            </>
          )}
          {todIcon && timeStr && (
            <>
              <span style={{ opacity: 0.35 }}>·</span>
              <span style={{ color: '#7898b8', whiteSpace: 'nowrap' }}>{todIcon} {timeStr}</span>
            </>
          )}
        </div>

        {/* ── Правая часть: ресурсы + кнопки ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {/* Деньги */}
          <Stat icon="💰" title={`Серебро: ${player.money}`}>
            <span style={{ fontSize: '0.75rem', color: '#eab308', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {Number(player.money).toFixed(0)}
            </span>
          </Stat>

          {/* Карма */}
          <Stat icon="⚖️" title={`Карма: ${player.karma}`}>
            <span style={{ fontSize: '0.75rem', color: karmaColor, fontWeight: 500 }}>
              {player.karma >= 0 ? '+' : ''}{player.karma}
            </span>
          </Stat>

          {/* Сытость */}
          <Stat icon="🍖" title={`Сытость: ${player.hunger}%`}>
            <MiniBar value={player.hunger} color={hungerColor} width={40} />
          </Stat>

          {/* Звук */}
          <button
            onClick={toggleSound}
            style={{ ...iconBtn, fontSize: '0.85rem', color: soundEnabled ? '#a8894e' : '#4a3118' }}
            title={soundEnabled ? 'Выключить звук' : 'Включить звук'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>

          {soundEnabled && (
            <input
              type="range" min="0" max="1" step="0.1" value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="accent-gold"
              style={{ width: '40px', height: '4px', cursor: 'pointer' }}
              title={`Громкость: ${Math.round(volume * 100)}%`}
            />
          )}

          {/* Выход */}
          <button
            onClick={() => { logout(); navigate('/login') }}
            style={{ ...iconBtn, fontSize: '0.75rem', color: '#4a3118' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#4a3118' }}
            title="Выход"
          >
            ✖
          </button>

          {/* Collapse toggle */}
          <button
            onClick={() => setExpanded(v => !v)}
            style={{ ...iconBtn, fontSize: '0.7rem', color: '#4a3118' }}
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
        <div style={{
          padding: '5px 12px 7px',
          borderTop: '1px solid rgba(74,49,24,0.35)',
          display: 'flex', alignItems: 'center', gap: '14px',
          flexWrap: 'wrap', fontSize: '0.7rem',
        }}>
          {/* XP детально */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: '#8b6d3f' }}>✨ Опыт:</span>
            <span style={{ color: '#d4a84a' }}>{player.experience}</span>
            <span style={{ color: '#4a3118' }}>/</span>
            <span style={{ color: '#8b6d3f' }}>{player.experience_to_next_rank}</span>
          </div>

          {/* Золото */}
          {player.gold > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>🥇</span>
              <span style={{ color: '#d4a84a' }}>{player.gold}</span>
            </div>
          )}

          {/* Сытость детально */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: '#8b6d3f' }}>🍖 Сытость:</span>
            <MiniBar value={player.hunger} color={hungerColor} width={56} />
            <span style={{ color: hungerColor }}>{player.hunger}%</span>
          </div>

          {/* Игровой день */}
          {gameTime && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#7898b8' }}>
              <span>📅</span>
              <span>День {gameTime.day}</span>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
