/**
 * Карта мира — улучшенный UI с интерактивными маркерами и детальными карточками баз.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getBases, travelToBase } from '../api/world'
import { getProfile } from '../api/auth'
import { usePlayerStore } from '../store/playerStore'

interface Base {
  id: number; name: string; description: string; world_map_x: number; world_map_y: number
  min_rank: number; min_karma: number; travel_cost: string; requires_vehicle: boolean; locations_count: number
}

export default function WorldMapPage() {
  const [bases, setBases]       = useState<Base[]>([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<Base | null>(null)
  const [msg, setMsg]           = useState('')
  const [traveling, setTraveling] = useState(false)
  const player    = usePlayerStore((s) => s.player)
  const setPlayer = usePlayerStore((s) => s.setPlayer)
  const navigate  = useNavigate()

  useEffect(() => {
    getBases().then((res) => setBases(res.data.results || res.data)).finally(() => setLoading(false))
  }, [])

  const handleTravel = async (base: Base) => {
    setTraveling(true)
    try { await travelToBase(base.id); const p = await getProfile(); setPlayer(p); navigate('/') }
    catch (e: unknown) { setMsg((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Ошибка') }
    finally { setTraveling(false) }
  }

  const isCurrentBase = (b: Base) => player?.current_base === b.id
  const canTravel = (b: Base) => {
    if (!player) return false
    return player.rank >= b.min_rank && player.karma >= b.min_karma && Number(player.money) >= Number(b.travel_cost)
  }

  if (loading) return (
    <div className="p-10 text-center text-wood-500 text-sm">
      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🗺️</div>
      Загрузка карты...
    </div>
  )

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="gold-text text-xl mb-4">🗺️ Карта мира</h1>

      {msg && (
        <div className="wood-panel px-3 py-2 mb-3 text-sm" style={{ color: '#f87171', display: 'flex', gap: '6px' }}>
          ⚠️ {msg}
          <button style={{ marginLeft: 'auto', color: '#5c3d1e' }} onClick={() => setMsg('')}>✖</button>
        </div>
      )}

      {/* Визуальная карта */}
      <div className="card mb-4" style={{ height: '320px', padding: 0, overflow: 'hidden', position: 'relative' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 40% 60%, #1a3a1a 0%, #0d1f0d 50%, #0a1020 100%)',
        }}>
          {/* Декоративные линии сетки */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06 }}>
            {[20, 40, 60, 80].map((p) => (
              <g key={p}>
                <line x1={`${p}%`} y1="0" x2={`${p}%`} y2="100%" stroke="#7898b8" strokeWidth="1" />
                <line x1="0" y1={`${p}%`} x2="100%" y2={`${p}%`} stroke="#7898b8" strokeWidth="1" />
              </g>
            ))}
          </svg>

          {/* Маркеры баз */}
          {bases.map((b) => {
            const isCur  = isCurrentBase(b)
            const canGo  = canTravel(b)
            const isSel  = selected?.id === b.id
            return (
              <button
                key={b.id}
                onClick={() => setSelected(isSel ? null : b)}
                style={{
                  position: 'absolute',
                  left: `${b.world_map_x}%`, top: `${b.world_map_y}%`,
                  transform: 'translate(-50%, -50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                  opacity: canGo || isCur ? 1 : 0.4,
                  transition: 'transform 0.2s ease',
                  padding: '6px',
                  WebkitTapHighlightColor: 'transparent',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.2)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)' }}
              >
                {/* Маркер */}
                <div style={{
                  width: isCur ? '16px' : isSel ? '14px' : '11px',
                  height: isCur ? '16px' : isSel ? '14px' : '11px',
                  borderRadius: '50%',
                  background: isCur
                    ? '#d4a84a'
                    : isSel
                      ? '#7898b8'
                      : canGo ? '#3a6088' : '#5c3d1e',
                  border: `2px solid ${isCur ? '#d4a84a' : isSel ? '#7898b8' : canGo ? '#5078a0' : '#4a3118'}`,
                  boxShadow: isCur
                    ? '0 0 12px rgba(212,168,74,0.6)'
                    : isSel
                      ? '0 0 8px rgba(120,152,184,0.5)'
                      : '0 2px 6px rgba(0,0,0,0.4)',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }} />
                {/* Название */}
                <span style={{
                  fontSize: '0.58rem',
                  whiteSpace: 'nowrap',
                  color: isCur ? '#d4a84a' : isSel ? '#7898b8' : canGo ? '#a8894e' : '#5c3d1e',
                  fontFamily: 'Georgia, serif',
                  background: 'rgba(7,18,7,0.7)',
                  padding: '0 4px', borderRadius: '3px',
                  backdropFilter: 'blur(4px)',
                }}>
                  {b.name}
                </span>
              </button>
            )
          })}

          {/* Легенда */}
          <div style={{
            position: 'absolute', bottom: '8px', right: '8px',
            display: 'flex', flexDirection: 'column', gap: '4px',
            background: 'rgba(7,18,7,0.7)', borderRadius: '6px', padding: '6px 8px',
            backdropFilter: 'blur(4px)',
          }}>
            {[
              { color: '#d4a84a', label: 'Вы здесь' },
              { color: '#3a6088', label: 'Доступно' },
              { color: '#5c3d1e', label: 'Недоступно' },
            ].map((l) => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.55rem', color: '#8b6d3f' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Карточка выбранной базы */}
      {selected && (
        <div className="card mb-4">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <div>
              <h2 className="gold-text text-lg">{selected.name}</h2>
              {selected.description && (
                <p style={{ fontSize: '0.75rem', color: '#6b5030', marginTop: '2px' }}>{selected.description}</p>
              )}
            </div>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5c3d1e', fontSize: '1rem', padding: '4px' }}
              onClick={() => setSelected(null)}>✖</button>
          </div>

          {/* Мета */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px', fontSize: '0.72rem' }}>
            {[
              { icon: '🗺️', value: `${selected.locations_count} локаций` },
              { icon: '⭐', value: `Разряд ${selected.min_rank}+` },
              { icon: '⚖️', value: selected.min_karma > 0 ? `Карма ${selected.min_karma}+` : null },
              { icon: '💰', value: `Дорога: ${selected.travel_cost}$` },
              { icon: '🚗', value: selected.requires_vehicle ? 'Нужен транспорт' : null },
            ].filter((m) => m.value).map((m) => (
              <span key={m.icon} style={{
                padding: '3px 8px', borderRadius: '6px',
                background: 'rgba(13,31,13,0.5)', border: '1px solid rgba(74,49,24,0.3)',
                color: '#8b6d3f', display: 'flex', gap: '4px', alignItems: 'center',
              }}>
                {m.icon} {m.value}
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {isCurrentBase(selected) ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#d4a84a', fontSize: '0.85rem', fontFamily: 'Georgia, serif' }}>
                📍 Вы здесь
              </div>
            ) : (
              <button
                className={`btn text-xs ${canTravel(selected) ? 'btn-primary' : 'bg-forest-800 text-wood-600 border-wood-700/30 cursor-not-allowed'}`}
                onClick={() => canTravel(selected) && handleTravel(selected)}
                disabled={!canTravel(selected) || traveling}
                style={{ minHeight: '36px' }}
              >
                {traveling ? '⏳ Переезд...' : `🚗 Переехать (${selected.travel_cost}$)`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Список баз */}
      <div className="space-y-2">
        {bases.map((b) => (
          <div
            key={b.id}
            className="card"
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              cursor: 'pointer', gap: '12px',
              borderColor: isCurrentBase(b) ? 'rgba(212,168,74,0.4)' : 'rgba(92,61,30,0.5)',
              transition: 'all 0.18s ease',
            }}
            onClick={() => setSelected(selected?.id === b.id ? null : b)}
            onMouseEnter={e => { if (!isCurrentBase(b)) e.currentTarget.style.borderColor = 'rgba(92,61,30,0.8)' }}
            onMouseLeave={e => { if (!isCurrentBase(b)) e.currentTarget.style.borderColor = 'rgba(92,61,30,0.5)' }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                  background: isCurrentBase(b) ? '#d4a84a' : canTravel(b) ? '#3a6088' : '#4a3118',
                  boxShadow: isCurrentBase(b) ? '0 0 6px rgba(212,168,74,0.5)' : 'none',
                }} />
                <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', color: '#d4c5a9' }}>
                  {b.name}
                  {isCurrentBase(b) && <span className="gold-text" style={{ fontSize: '0.7rem', marginLeft: '6px' }}>(текущая)</span>}
                </h3>
              </div>
              <p style={{ fontSize: '0.65rem', color: '#5c3d1e', marginTop: '2px', marginLeft: '18px' }}>
                ⭐ {b.min_rank}+ · 🗺️ {b.locations_count} лок. · 💰 {b.travel_cost}$
              </p>
            </div>
            <span style={{ color: '#5c3d1e', fontSize: '0.8rem', flexShrink: 0 }}>›</span>
          </div>
        ))}
      </div>
    </div>
  )
}
