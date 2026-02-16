/**
 * Страница квестов — стиль РР3.
 */
import { useEffect, useState } from 'react'
import { acceptQuest, claimQuestReward, getAvailableQuests, getPlayerQuests } from '../api/quests'

interface Quest {
  id: number; name: string; description: string; quest_type: string
  target_species_name: string | null; target_count: number; target_weight: number
  target_location_name: string | null; reward_money: string; reward_experience: number
  reward_karma: number; min_rank: number
}
interface PlayerQuest {
  id: number; quest: Quest; progress: number; progress_weight: number
  status: 'active' | 'completed' | 'claimed'; started_at: string; completed_at: string | null
}

export default function QuestsPage() {
  const [available, setAvailable] = useState<Quest[]>([])
  const [myQuests, setMyQuests] = useState<PlayerQuest[]>([])
  const [tab, setTab] = useState<'my' | 'available'>('my')
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    Promise.all([getAvailableQuests(), getPlayerQuests()])
      .then(([avRes, myRes]) => {
        setAvailable(avRes.data.results || avRes.data)
        setMyQuests(myRes.data.results || myRes.data)
      })
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const handleAccept = async (id: number) => { await acceptQuest(id); load() }
  const handleClaim = async (id: number) => { await claimQuestReward(id); load() }

  const progressText = (pq: PlayerQuest) => {
    if (pq.quest.quest_type === 'catch_weight') return `${pq.progress_weight.toFixed(2)} / ${pq.quest.target_weight} кг`
    return `${pq.progress} / ${pq.quest.target_count}`
  }

  const statusBadge = (s: string) => {
    if (s === 'active') return <span className="badge badge-blue">Активный</span>
    if (s === 'completed') return <span className="badge badge-green">Выполнен</span>
    return <span className="badge badge-yellow">Получен</span>
  }

  if (loading) return <div className="p-8 text-center text-wood-500 text-sm">Загрузка...</div>

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="gold-text text-xl mb-4">Квесты</h1>

      <div className="flex gap-1 mb-4">
        <button
          className={`game-tab ${tab === 'my' ? 'game-tab-active' : 'game-tab-inactive'}`}
          onClick={() => setTab('my')}
        >Мои ({myQuests.length})</button>
        <button
          className={`game-tab ${tab === 'available' ? 'game-tab-active' : 'game-tab-inactive'}`}
          onClick={() => setTab('available')}
        >Доступные ({available.length})</button>
      </div>

      {tab === 'my' && (
        <div className="space-y-2">
          {myQuests.map((pq) => (
            <div key={pq.id} className="card">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-serif text-sm text-wood-200">{pq.quest.name}</h3>
                  <p className="text-xs text-wood-500 mt-0.5">{pq.quest.description}</p>
                  <div className="mt-1.5 text-xs">
                    <span className="text-water-300">Прогресс: {progressText(pq)}</span>
                    {pq.quest.target_location_name && (
                      <span className="text-wood-500 ml-2">{pq.quest.target_location_name}</span>
                    )}
                  </div>
                </div>
                <div className="text-right ml-3">
                  {statusBadge(pq.status)}
                  {pq.status === 'completed' && (
                    <button className="btn btn-primary text-xs mt-1.5 block" onClick={() => handleClaim(pq.id)}>
                      Награда
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-1.5 text-[10px] text-wood-600">
                {pq.quest.reward_money}$ | {pq.quest.reward_experience} опыта
                {pq.quest.reward_karma > 0 && ` | +${pq.quest.reward_karma} кармы`}
              </div>
            </div>
          ))}
          {myQuests.length === 0 && <p className="text-wood-500 text-sm text-center py-6">Нет активных квестов</p>}
        </div>
      )}

      {tab === 'available' && (
        <div className="space-y-2">
          {available.map((q) => (
            <div key={q.id} className="card flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-serif text-sm text-wood-200">{q.name}</h3>
                <p className="text-xs text-wood-500 mt-0.5">{q.description}</p>
                <div className="mt-1 text-[10px] text-wood-600">
                  {q.reward_money}$ | {q.reward_experience} опыта
                  {q.reward_karma > 0 && ` | +${q.reward_karma} кармы`}
                </div>
              </div>
              <button className="btn btn-action text-xs ml-3" onClick={() => handleAccept(q.id)}>
                Взять
              </button>
            </div>
          ))}
          {available.length === 0 && <p className="text-wood-500 text-sm text-center py-6">Нет доступных квестов</p>}
        </div>
      )}
    </div>
  )
}
