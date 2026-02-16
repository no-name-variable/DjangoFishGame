/**
 * Страница команды — стиль РР3.
 */
import { useEffect, useState } from 'react'
import { createTeam, getMyTeam, getTeams, joinTeam, leaveTeam } from '../api/teams'

interface TeamMember { id: number; nickname: string; rank: number; role: string; joined_at: string }
interface Team { id: number; name: string; description: string; leader_nickname: string; member_count: number; max_members: number; members?: TeamMember[] }

export default function TeamPage() {
  const [myTeam, setMyTeam] = useState<Team | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

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

  const roleLabel = (r: string) => r === 'leader' ? 'Лидер' : r === 'officer' ? 'Офицер' : 'Участник'

  if (loading) return <div className="p-8 text-center text-wood-500 text-sm">Загрузка...</div>

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="gold-text text-xl mb-4">Команда</h1>
      {msg && <div className="wood-panel px-3 py-2 mb-3 text-sm text-red-400">{msg}</div>}

      {myTeam ? (
        <div className="card">
          <h2 className="gold-text text-lg">{myTeam.name}</h2>
          {myTeam.description && <p className="text-wood-500 text-xs mt-1">{myTeam.description}</p>}
          <p className="text-[10px] text-wood-600 mt-1">{myTeam.member_count}/{myTeam.max_members} участников</p>

          {myTeam.members && (
            <div className="mt-3">
              <h3 className="text-wood-400 text-xs font-serif mb-1">Состав</h3>
              <div className="space-y-0.5">
                {myTeam.members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-xs py-1 border-b border-wood-800/30">
                    <span className="text-water-300">{m.nickname}</span>
                    <div className="flex gap-2 text-wood-500">
                      <span>Разряд {m.rank}</span>
                      <span className="text-wood-600">{roleLabel(m.role)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button className="btn btn-danger text-xs mt-3" onClick={handleLeave}>Покинуть</button>
        </div>
      ) : (
        <>
          <button className="btn btn-action mb-3" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? 'Отмена' : 'Создать команду'}
          </button>

          {showCreate && (
            <div className="card mb-4 space-y-2">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Название" className="game-input" maxLength={100} />
              <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Описание" className="game-input h-16 resize-none" />
              <button className="btn btn-primary" onClick={handleCreate}>Создать</button>
            </div>
          )}

          <h2 className="font-serif text-sm text-wood-400 mb-2">Доступные команды</h2>
          <div className="space-y-2">
            {teams.map((t) => (
              <div key={t.id} className="card flex justify-between items-center">
                <div>
                  <h3 className="text-wood-200 font-serif text-sm">{t.name}</h3>
                  <p className="text-[10px] text-wood-600">{t.leader_nickname} | {t.member_count}/{t.max_members}</p>
                </div>
                <button className="btn btn-action text-xs" onClick={() => handleJoin(t.id)}>Вступить</button>
              </div>
            ))}
            {teams.length === 0 && <p className="text-wood-500 text-sm text-center py-6">Нет команд</p>}
          </div>
        </>
      )}
    </div>
  )
}
