/**
 * Профиль игрока — улучшенный UI с XP-баром, иконками статов и достижениями.
 */
import { useEffect, useState } from 'react'
import { getPlayerAchievements, getPlayerJournal } from '../api/records'
import { usePlayerStore } from '../store/playerStore'

interface PlayerAchievement {
  id: number
  achievement: { id: number; name: string; description: string; category: string; icon: string }
  unlocked_at: string
}

interface JournalEntry {
  id: number
  species_name: string
  weight: number
  length: number
  location_name: string | null
  caught_at: string
}

export default function ProfilePage() {
  const player = usePlayerStore((s) => s.player)
  const [achievements, setAchievements] = useState<PlayerAchievement[]>([])
  const [journal, setJournal]           = useState<JournalEntry[]>([])
  const [tab, setTab] = useState<'profile' | 'achievements' | 'journal'>('profile')

  useEffect(() => {
    getPlayerAchievements().then((res) => setAchievements(res.data.results || res.data))
    getPlayerJournal().then((res) => setJournal(res.data.results || res.data))
  }, [])

  if (!player) return null

  const expPct = Math.min(100, Math.round((player.experience / player.experience_to_next_rank) * 100))
  const hungerColor = player.hunger > 50 ? '#22c55e' : player.hunger > 20 ? '#eab308' : '#ef4444'

  const statRows = [
    { icon: '⭐', label: 'Разряд',   value: `${player.rank} — ${player.rank_title}`,     color: '#d4a84a' },
    { icon: '💰', label: 'Деньги',   value: `${Number(player.money).toFixed(0)}$`,        color: '#eab308' },
    { icon: '⚖️', label: 'Карма',   value: String(player.karma),
      color: player.karma >= 0 ? '#4ade80' : '#f87171' },
    { icon: '🍖', label: 'Сытость',  value: `${player.hunger}%`,                          color: hungerColor },
    { icon: '🥇', label: 'Золото',   value: String(player.gold),                          color: '#fbbf24' },
  ]

  const tabs = [
    { key: 'profile'      as const, label: '👤 Данные'      },
    { key: 'achievements' as const, label: `🏅 Достижения (${achievements.length})` },
    { key: 'journal'      as const, label: `📖 Журнал (${journal.length})`           },
  ]

  return (
    <div className="p-4 max-w-3xl mx-auto">
      {/* Шапка профиля */}
      <div className="flex items-center gap-3 sm:gap-4 mb-4 p-3 sm:p-4 rounded-xl"
        style={{ background: 'rgba(42,26,13,0.6)', border: '1px solid rgba(92,61,30,0.5)' }}>
        {/* Аватар */}
        <div style={{
          width: '52px', height: '52px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #2e7d2e, #1a5a1a)',
          border: '2px solid rgba(212,168,74,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.4rem', color: '#d4a84a', fontWeight: 'bold', flexShrink: 0,
          boxShadow: '0 0 14px rgba(212,168,74,0.2)',
        }}>
          {player.nickname.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="gold-text" style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '2px' }}>
            {player.nickname}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#8b6d3f', marginBottom: '6px' }}>
            ⭐ {player.rank} разряд · {player.rank_title}
          </div>
          {/* XP бар */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'rgba(13,31,13,0.8)',
              border: '1px solid rgba(74,49,24,0.4)', overflow: 'hidden' }}>
              <div style={{ width: `${expPct}%`, height: '100%', borderRadius: '3px',
                background: '#d4a84a', transition: 'width 0.5s ease' }} />
            </div>
            <span style={{ fontSize: '0.65rem', color: '#8b6d3f', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {player.experience} / {player.experience_to_next_rank} ({expPct}%)
            </span>
          </div>
        </div>
      </div>

      {/* Табы */}
      <div className="flex flex-wrap gap-1 mb-4">
        {tabs.map((t) => (
          <button key={t.key}
            className={`game-tab ${tab === t.key ? 'game-tab-active' : 'game-tab-inactive'}`}
            onClick={() => setTab(t.key)}
            style={{ fontSize: '0.78rem' }}
          >{t.label}</button>
        ))}
      </div>

      {/* Данные профиля */}
      {tab === 'profile' && (
        <div className="card">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {statRows.map((item) => (
              <div key={item.label} style={{
                padding: '10px', borderRadius: '8px',
                background: 'rgba(13,31,13,0.4)', border: '1px solid rgba(74,49,24,0.3)',
              }}>
                <div style={{ fontSize: '0.65rem', color: '#5c3d1e', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{item.icon}</span> {item.label}
                </div>
                <div style={{ color: item.color, fontFamily: 'Georgia, serif', fontSize: '1rem', fontWeight: 'bold' }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Достижения */}
      {tab === 'achievements' && (
        <div className="space-y-2">
          {achievements.map((pa) => (
            <div key={pa.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '10px', flexShrink: 0,
                background: 'rgba(46,125,46,0.2)', border: '1px solid rgba(74,222,128,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
              }}>
                {pa.achievement.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', color: '#d4c5a9', marginBottom: '2px' }}>
                  {pa.achievement.name}
                </h3>
                <p style={{ fontSize: '0.72rem', color: '#6b5030' }}>{pa.achievement.description}</p>
              </div>
              <div style={{ fontSize: '0.65rem', color: '#5c3d1e', flexShrink: 0, textAlign: 'right' }}>
                📅 {new Date(pa.unlocked_at).toLocaleDateString('ru')}
              </div>
            </div>
          ))}
          {achievements.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#5c3d1e' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🏅</div>
              <p style={{ fontSize: '0.85rem' }}>Достижений пока нет. Рыбачьте!</p>
            </div>
          )}
        </div>
      )}

      {/* Журнал */}
      {tab === 'journal' && (
        <div className="card overflow-x-auto">
          <table className="game-table">
            <thead>
              <tr>
                <th>🐟 Рыба</th><th>⚖️ Вес</th><th>📏 Длина</th><th>📍 Локация</th><th>📅 Дата</th>
              </tr>
            </thead>
            <tbody>
              {journal.map((j) => (
                <tr key={j.id}>
                  <td style={{ fontFamily: 'Georgia, serif', color: '#d4c5a9' }}>{j.species_name}</td>
                  <td><span className="gold-text">{j.weight.toFixed(2)} кг</span></td>
                  <td style={{ color: '#a8894e' }}>{j.length.toFixed(1)} см</td>
                  <td style={{ color: '#5c3d1e' }}>{j.location_name ?? '—'}</td>
                  <td style={{ color: '#5c3d1e', fontSize: '0.72rem' }}>
                    {new Date(j.caught_at).toLocaleDateString('ru')}
                  </td>
                </tr>
              ))}
              {journal.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#5c3d1e' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>🎣</div>
                    Журнал пуст — начните ловить!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
