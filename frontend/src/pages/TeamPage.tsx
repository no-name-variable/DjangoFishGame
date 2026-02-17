/**
 * Команда — улучшенный UI с ролевыми бейджами и составом.
 */
import { useEffect, useState } from 'react'
import { createTeam, getMyTeam, getTeams, joinTeam, leaveTeam } from '../api/teams'

interface TeamMember { id: number; nickname: string; rank: number; role: string; joined_at: string }
interface Team { id: number; name: string; description: string; leader_nickname: string; member_count: number; max_members: number; members?: TeamMember[] }

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  leader: { label: 'Лидер',    color: '#d4a84a', icon: '👑' },
  officer:{ label: 'Офицер',   color: '#7898b8', icon: '⚔️' },
  member: { label: 'Участник', color: '#8b6d3f', icon: '🎣' },
}

export default function TeamPage() {
  const [myTeam, setMyTeam]     = useState<Team | null>(null)
  const [teams, setTeams]       = useState<Team[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName]   = useState('')
  const [newDesc, setNewDesc]   = useState('')
  const [loading, setLoading]   = useState(true)
  const [msg, setMsg]           = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([getMyTeam(), getTeams()])
      .then(([myRes, allRes]) => {
        setMyTeam(myRes.data.team === null ? null : myRes.data)
        setTeams(allRes.data.results || allRes.data)
      })
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    try { await createTeam(newName.trim(), newDesc.trim()); setShowCreate(false); setNewName(''); setNewDesc(''); load() }
    catch (e: unknown) { setMsg((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Ошибка') }
  }
  const handleJoin = async (id: number) => {
    try { await joinTeam(id); load() }
    catch (e: unknown) { setMsg((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Ошибка') }
  }
  const handleLeave = async () => { await leaveTeam(); load() }

  if (loading) return (
    <div className="p-10 text-center text-wood-500 text-sm">
      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>👫</div>
      Загрузка...
    </div>
  )

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="gold-text text-xl mb-4">👫 Команда</h1>

      {msg && (
        <div className="wood-panel px-3 py-2 mb-3 text-sm" style={{ color: '#f87171', display: 'flex', gap: '6px' }}>
          ⚠️ {msg}
          <button style={{ marginLeft: 'auto', color: '#5c3d1e' }} onClick={() => setMsg('')}>✖</button>
        </div>
      )}

      {/* Я в команде */}
      {myTeam ? (
        <div className="card">
          {/* Шапка команды */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <h2 className="gold-text text-lg">{myTeam.name}</h2>
              {myTeam.description && (
                <p style={{ fontSize: '0.75rem', color: '#6b5030', marginTop: '2px' }}>{myTeam.description}</p>
              )}
              <p style={{ fontSize: '0.65rem', color: '#5c3d1e', marginTop: '4px' }}>
                👑 {myTeam.leader_nickname} · 👥 {myTeam.member_count}/{myTeam.max_members} участников
              </p>
            </div>
            <button className="btn btn-danger text-xs" style={{ minHeight: '34px' }} onClick={handleLeave}>
              Покинуть
            </button>
          </div>

          {/* Разделитель */}
          <div style={{ height: '1px', background: 'rgba(74,49,24,0.4)', marginBottom: '12px' }} />

          {/* Список участников */}
          {myTeam.members && myTeam.members.length > 0 && (
            <>
              <h3 style={{ fontSize: '0.75rem', color: '#8b6d3f', fontFamily: 'Georgia, serif', marginBottom: '8px' }}>
                Состав команды
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {myTeam.members.map((m) => {
                  const rc = ROLE_CONFIG[m.role] ?? ROLE_CONFIG.member
                  return (
                    <div key={m.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '7px 10px', borderRadius: '8px',
                      background: 'rgba(13,31,13,0.4)', border: '1px solid rgba(74,49,24,0.25)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.9rem' }}>{rc.icon}</span>
                        <span style={{ color: '#7898b8', fontSize: '0.85rem', fontFamily: 'Georgia, serif' }}>
                          {m.nickname}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.68rem' }}>
                        <span style={{ color: '#5c3d1e' }}>⭐ {m.rank}</span>
                        <span style={{
                          color: rc.color, background: `${rc.color}18`,
                          border: `1px solid ${rc.color}35`,
                          padding: '1px 6px', borderRadius: '5px',
                        }}>
                          {rc.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Кнопка создания */}
          <button className="btn btn-action mb-3" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? 'Отмена' : '➕ Создать команду'}
          </button>

          {/* Форма создания */}
          {showCreate && (
            <div className="card mb-4" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ fontFamily: 'Georgia, serif', color: '#d4c5a9', fontSize: '0.9rem' }}>Новая команда</h3>
              <input
                value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="Название команды" className="game-input" maxLength={100}
              />
              <textarea
                value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Описание (необязательно)"
                className="game-input" style={{ height: '64px', resize: 'none' }}
              />
              <button className="btn btn-primary" onClick={handleCreate}>Создать</button>
            </div>
          )}

          {/* Список всех команд */}
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '0.85rem', color: '#8b6d3f', marginBottom: '10px' }}>
            Доступные команды
          </h2>
          <div className="space-y-2">
            {teams.map((t) => (
              <div key={t.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', color: '#d4c5a9', marginBottom: '2px' }}>
                    {t.name}
                  </h3>
                  {t.description && (
                    <p style={{ fontSize: '0.68rem', color: '#6b5030', marginBottom: '2px',
                      overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {t.description}
                    </p>
                  )}
                  <p style={{ fontSize: '0.65rem', color: '#5c3d1e' }}>
                    👑 {t.leader_nickname} · 👥 {t.member_count}/{t.max_members}
                  </p>
                </div>
                <button className="btn btn-action text-xs" style={{ minHeight: '36px', flexShrink: 0 }}
                  onClick={() => handleJoin(t.id)}>
                  Вступить
                </button>
              </div>
            ))}
            {teams.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#5c3d1e' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>👫</div>
                <p style={{ fontSize: '0.85rem' }}>Команд пока нет. Создайте первую!</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
