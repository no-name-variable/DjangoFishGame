/**
 * Турниры — улучшенный UI с чёткими карточками и результатами.
 */
import { useEffect, useState } from 'react'
import { getTournaments, joinTournament, getTournamentResults } from '../api/tournaments'
import CreateTournamentForm from '../components/tournaments/CreateTournamentForm'

interface Tournament {
  id: number; name: string; description: string; tournament_type: string; scoring: string
  target_species_name: string | null; target_location_name: string | null
  start_time: string; end_time: string; entry_fee: string; prize_money: string
  prize_experience: number; min_rank: number; max_participants: number
  participants_count: number; is_finished: boolean
}
interface TournamentEntry {
  id: number; player_nickname: string; score: number; fish_count: number; rank_position: number
}

const SCORING_LABEL: Record<string, string> = {
  weight: '⚖️ По весу', count: '🔢 По количеству', specific_fish: '🐟 По виду',
}
const MEDAL = ['🥇', '🥈', '🥉']

export default function TournamentsPage() {
  const [tournaments, setTournaments]   = useState<Tournament[]>([])
  const [results, setResults]           = useState<TournamentEntry[] | null>(null)
  const [selectedId, setSelectedId]     = useState<number | null>(null)
  const [loading, setLoading]           = useState(true)
  const [msg, setMsg]                   = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [joining, setJoining]           = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    getTournaments()
      .then((res) => setTournaments(res.data.results || res.data))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const handleJoin = async (id: number) => {
    setJoining(id)
    try { await joinTournament(id); load() }
    catch (e: unknown) { setMsg((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Ошибка') }
    finally { setJoining(null) }
  }
  const showResults = async (id: number) => {
    const res = await getTournamentResults(id)
    setResults(res.data.results || res.data)
    setSelectedId(id)
  }

  if (loading) return (
    <div className="p-10 text-center text-wood-500 text-sm">
      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⚔️</div>
      Загрузка турниров...
    </div>
  )

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Заголовок */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h1 className="gold-text text-xl">⚔️ Турниры</h1>
        {!showCreateForm && (
          <button onClick={() => setShowCreateForm(true)} className="btn btn-primary text-xs">
            ➕ Создать
          </button>
        )}
      </div>

      {msg && (
        <div className="wood-panel px-3 py-2 mb-3 text-sm" style={{ color: '#f87171', display: 'flex', gap: '6px' }}>
          ⚠️ {msg}
          <button style={{ marginLeft: 'auto', color: '#5c3d1e' }} onClick={() => setMsg('')}>✖</button>
        </div>
      )}

      {/* Форма создания */}
      {showCreateForm && (
        <div className="mb-4">
          <CreateTournamentForm
            onSuccess={() => { setShowCreateForm(false); setMsg('✅ Турнир создан!'); load() }}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      {/* Карточки турниров */}
      <div className="space-y-3">
        {tournaments.map((t) => {
          const end = new Date(t.end_time)
          const now = new Date()
          const hoursLeft = Math.max(0, Math.round((end.getTime() - now.getTime()) / 3600000))
          const isFull = t.participants_count >= t.max_participants
          return (
            <div key={t.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Название + статус */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', color: '#d4c5a9' }}>{t.name}</h3>
                    {t.is_finished && (
                      <span className="badge badge-yellow">Завершён</span>
                    )}
                    {isFull && !t.is_finished && (
                      <span className="badge badge-red">Нет мест</span>
                    )}
                  </div>

                  {t.description && (
                    <p style={{ fontSize: '0.72rem', color: '#6b5030', marginBottom: '6px' }}>{t.description}</p>
                  )}

                  {/* Метаданные */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.7rem', color: '#5c3d1e' }}>
                    <span>{SCORING_LABEL[t.scoring] ?? t.scoring}</span>
                    <span>💰 Взнос: {t.entry_fee}$</span>
                    <span>🏆 Приз: {t.prize_money}$</span>
                    <span>⭐ Разряд {t.min_rank}+</span>
                    <span>👥 {t.participants_count}/{t.max_participants}</span>
                    {!t.is_finished && <span>⏰ {hoursLeft} ч. осталось</span>}
                    {t.target_location_name && <span>📍 {t.target_location_name}</span>}
                    {t.target_species_name && <span>🐟 {t.target_species_name}</span>}
                  </div>
                </div>

                {/* Кнопки */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                  {!t.is_finished && !isFull && (
                    <button className="btn btn-action text-xs" style={{ minHeight: '34px' }}
                      onClick={() => handleJoin(t.id)} disabled={joining === t.id}>
                      {joining === t.id ? '⏳' : 'Участвовать'}
                    </button>
                  )}
                  <button className="btn btn-secondary text-xs" style={{ minHeight: '34px' }}
                    onClick={() => showResults(t.id)}>
                    {selectedId === t.id ? '📊 Скрыть' : '📊 Результаты'}
                  </button>
                </div>
              </div>

              {/* Результаты (раскрываемые) */}
              {results && selectedId === t.id && (
                <div style={{ marginTop: '12px', borderTop: '1px solid rgba(74,49,24,0.35)', paddingTop: '10px' }}>
                  <h4 style={{ fontSize: '0.8rem', color: '#d4a84a', fontFamily: 'Georgia, serif', marginBottom: '8px' }}>
                    📊 Результаты турнира
                  </h4>
                  <table className="game-table">
                    <thead>
                      <tr><th style={{ width: '40px' }}>#</th><th>Игрок</th><th>Очки</th><th>Рыб</th></tr>
                    </thead>
                    <tbody>
                      {results.map((e) => (
                        <tr key={e.id}>
                          <td>{MEDAL[e.rank_position - 1] ?? e.rank_position}</td>
                          <td style={{ color: '#7898b8' }}>{e.player_nickname}</td>
                          <td className="gold-text">{e.score.toFixed(2)}</td>
                          <td style={{ color: '#a8894e' }}>{e.fish_count}</td>
                        </tr>
                      ))}
                      {results.length === 0 && (
                        <tr><td colSpan={4} style={{ textAlign: 'center', padding: '16px', color: '#5c3d1e' }}>
                          Нет участников
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                  <button className="btn btn-secondary text-xs mt-2" onClick={() => { setResults(null); setSelectedId(null) }}>
                    Закрыть
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {tournaments.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#5c3d1e' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⚔️</div>
            <p style={{ fontSize: '0.85rem' }}>Нет активных турниров. Создайте первый!</p>
          </div>
        )}
      </div>
    </div>
  )
}
