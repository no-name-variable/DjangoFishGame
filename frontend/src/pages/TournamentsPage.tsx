/**
 * Страница турниров — стиль РР3.
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

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [results, setResults] = useState<TournamentEntry[] | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)

  const load = () => {
    setLoading(true)
    getTournaments()
      .then((res) => setTournaments(res.data.results || res.data))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const handleJoin = async (id: number) => {
    try { await joinTournament(id); load() }
    catch (e: unknown) { setMsg((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Ошибка') }
  }
  const showResults = async (id: number) => {
    const res = await getTournamentResults(id)
    setResults(res.data.results || res.data)
    setSelectedId(id)
  }

  const scoringLabel = (s: string) => s === 'weight' ? 'По весу' : s === 'count' ? 'По количеству' : 'По виду'

  if (loading) return <div className="p-8 text-center text-wood-500 text-sm">Загрузка...</div>

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="gold-text text-xl">Турниры</h1>
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn btn-primary text-xs"
          >
            ➕ Создать турнир
          </button>
        )}
      </div>

      {msg && <div className="wood-panel px-3 py-2 mb-3 text-sm text-red-400">{msg}</div>}

      {/* Форма создания турнира */}
      {showCreateForm && (
        <div className="mb-4">
          <CreateTournamentForm
            onSuccess={() => {
              setShowCreateForm(false)
              setMsg('Турнир создан! Стоимость: 100$')
              load()
            }}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      <div className="space-y-3">
        {tournaments.map((t) => (
          <div key={t.id} className="card">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-serif text-sm text-wood-200">{t.name}</h3>
                <p className="text-xs text-wood-500 mt-0.5">{t.description}</p>
                <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] text-wood-600">
                  <span>{scoringLabel(t.scoring)}</span>
                  <span>Взнос: {t.entry_fee}$</span>
                  <span>Приз: {t.prize_money}$</span>
                  <span>Разряд: {t.min_rank}+</span>
                  <span>{t.participants_count}/{t.max_participants}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1 ml-3">
                {!t.is_finished && (
                  <button className="btn btn-action text-xs" onClick={() => handleJoin(t.id)}>Участвовать</button>
                )}
                <button className="btn btn-secondary text-xs" onClick={() => showResults(t.id)}>Результаты</button>
              </div>
            </div>
          </div>
        ))}
        {tournaments.length === 0 && <p className="text-wood-500 text-sm text-center py-6">Нет активных турниров</p>}
      </div>

      {results && selectedId && (
        <div className="mt-4 card">
          <h3 className="font-serif text-sm text-wood-200 mb-2">Результаты</h3>
          <table className="game-table">
            <thead><tr><th>#</th><th>Игрок</th><th>Очки</th><th>Рыб</th></tr></thead>
            <tbody>
              {results.map((e) => (
                <tr key={e.id}>
                  <td className="text-wood-500">{e.rank_position}</td>
                  <td className="text-water-300">{e.player_nickname}</td>
                  <td>{e.score.toFixed(2)}</td>
                  <td>{e.fish_count}</td>
                </tr>
              ))}
              {results.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-wood-500">Нет участников</td></tr>}
            </tbody>
          </table>
          <button className="btn btn-secondary text-xs mt-2" onClick={() => setResults(null)}>Закрыть</button>
        </div>
      )}
    </div>
  )
}
