/**
 * Квесты — улучшенный UI с прогресс-барами и чёткими наградами.
 */
import { useEffect, useState } from 'react'
import { acceptQuest, claimQuestReward, getAvailableQuests, getPlayerQuests } from '../api/quests'
import { useSound } from '../hooks/useSound'

interface Quest {
  id: number; name: string; description: string; quest_type: string
  target_species_name: string | null; target_count: number; target_weight: number
  target_location_name: string | null; reward_money: string; reward_experience: number
  reward_karma: number; reward_apparatus_part_name: string | null; min_rank: number
}
interface PlayerQuest {
  id: number; quest: Quest; progress: number; progress_weight: number
  status: 'active' | 'completed' | 'claimed'; started_at: string; completed_at: string | null
}

const QUEST_TYPE_ICON: Record<string, string> = {
  catch_fish: '🎣', catch_weight: '⚖️', catch_species: '🐟',
}

export default function QuestsPage() {
  const [available, setAvailable] = useState<Quest[]>([])
  const [myQuests, setMyQuests]   = useState<PlayerQuest[]>([])
  const [tab, setTab]             = useState<'my' | 'available'>('my')
  const [loading, setLoading]     = useState(true)
  const [claiming, setClaiming]   = useState<number | null>(null)
  const { play } = useSound()

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
  const handleClaim  = async (id: number) => {
    setClaiming(id)
    try { await claimQuestReward(id); play('quest_complete'); load() }
    finally { setClaiming(null) }
  }

  const progressValue = (pq: PlayerQuest) => {
    if (pq.quest.quest_type === 'catch_weight') {
      return Math.min(1, pq.progress_weight / pq.quest.target_weight)
    }
    return Math.min(1, pq.progress / pq.quest.target_count)
  }
  const progressText = (pq: PlayerQuest) => {
    if (pq.quest.quest_type === 'catch_weight')
      return `${pq.progress_weight.toFixed(2)} / ${pq.quest.target_weight} кг`
    return `${pq.progress} / ${pq.quest.target_count}`
  }

  const statusConfig = {
    active:    { label: 'Активный',  cls: 'badge badge-blue' },
    completed: { label: 'Выполнен', cls: 'badge badge-green' },
    claimed:   { label: 'Получен',  cls: 'badge badge-yellow' },
  }

  if (loading) return (
    <div className="p-10 text-center text-wood-500 text-sm">
      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📜</div>
      Загрузка квестов...
    </div>
  )

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="gold-text text-xl mb-4">📜 Квесты</h1>

      {/* Табы */}
      <div className="flex gap-1 mb-4">
        <button className={`game-tab ${tab === 'my' ? 'game-tab-active' : 'game-tab-inactive'}`}
          onClick={() => setTab('my')}>
          Мои ({myQuests.length})
        </button>
        <button className={`game-tab ${tab === 'available' ? 'game-tab-active' : 'game-tab-inactive'}`}
          onClick={() => setTab('available')}>
          Доступные ({available.length})
        </button>
      </div>

      {/* Мои квесты */}
      {tab === 'my' && (
        <div className="space-y-2">
          {myQuests.map((pq) => {
            const pct = progressValue(pq) * 100
            const done = pq.status === 'completed' || pq.status === 'claimed'
            const sc = statusConfig[pq.status] ?? statusConfig.active
            return (
              <div key={pq.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  {/* Иконка типа */}
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
                    background: pq.quest.reward_apparatus_part_name ? 'rgba(92,61,30,0.35)' : 'rgba(13,31,13,0.6)',
                    border: `1px solid ${pq.quest.reward_apparatus_part_name ? 'rgba(234,179,8,0.3)' : 'rgba(74,49,24,0.4)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
                  }}>
                    {pq.quest.reward_apparatus_part_name ? '🔧' : (QUEST_TYPE_ICON[pq.quest.quest_type] ?? '📜')}
                  </div>

                  {/* Контент */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', color: '#d4c5a9', marginBottom: '2px' }}>
                      {pq.quest.name}
                      {pq.quest.reward_apparatus_part_name && (
                        <span style={{
                          marginLeft: '8px', fontSize: '0.6rem', color: '#facc15',
                          background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.3)',
                          borderRadius: '4px', padding: '1px 6px', verticalAlign: 'middle',
                        }}>
                          Самогонный аппарат
                        </span>
                      )}
                    </h3>
                    <p style={{ fontSize: '0.72rem', color: '#6b5030', marginBottom: '6px' }}>
                      {pq.quest.description}
                    </p>

                    {/* Прогресс */}
                    <div style={{ marginBottom: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px',
                        fontSize: '0.68rem', color: '#7898b8' }}>
                        <span>Прогресс: {progressText(pq)}</span>
                        <span>{Math.round(pct)}%</span>
                      </div>
                      <div style={{ height: '5px', borderRadius: '3px', background: 'rgba(13,31,13,0.8)',
                        border: '1px solid rgba(74,49,24,0.4)', overflow: 'hidden' }}>
                        <div style={{
                          width: `${pct}%`, height: '100%', borderRadius: '3px',
                          background: done ? '#22c55e' : '#3a6088',
                          transition: 'width 0.4s ease',
                        }} />
                      </div>
                    </div>

                    {/* Локация */}
                    {pq.quest.target_location_name && (
                      <p style={{ fontSize: '0.65rem', color: '#5c3d1e' }}>
                        📍 {pq.quest.target_location_name}
                      </p>
                    )}

                    {/* Награды */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '4px', fontSize: '0.68rem', color: '#5c3d1e' }}>
                      <span>💰 {pq.quest.reward_money}$</span>
                      <span>✨ {pq.quest.reward_experience} опыта</span>
                      {pq.quest.reward_karma > 0 && <span>⚖️ +{pq.quest.reward_karma}</span>}
                      {pq.quest.reward_apparatus_part_name && (
                        <span style={{ color: '#facc15' }}>🔧 {pq.quest.reward_apparatus_part_name}</span>
                      )}
                    </div>
                  </div>

                  {/* Статус + кнопка */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                    <span className={sc.cls}>{sc.label}</span>
                    {pq.status === 'completed' && (
                      <button
                        className="btn btn-primary text-xs"
                        style={{ minHeight: '32px' }}
                        onClick={() => handleClaim(pq.id)}
                        disabled={claiming === pq.id}
                      >
                        {claiming === pq.id ? '⏳' : '🎁 Забрать'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          {myQuests.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#5c3d1e' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📜</div>
              <p style={{ fontSize: '0.85rem' }}>Нет активных квестов. Возьмите задание!</p>
            </div>
          )}
        </div>
      )}

      {/* Доступные квесты */}
      {tab === 'available' && (
        <div className="space-y-2">
          {available.map((q) => (
            <div key={q.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
                background: q.reward_apparatus_part_name ? 'rgba(92,61,30,0.35)' : 'rgba(13,31,13,0.6)',
                border: `1px solid ${q.reward_apparatus_part_name ? 'rgba(234,179,8,0.3)' : 'rgba(74,49,24,0.4)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
              }}>
                {q.reward_apparatus_part_name ? '🔧' : (QUEST_TYPE_ICON[q.quest_type] ?? '📜')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', color: '#d4c5a9', marginBottom: '2px' }}>
                  {q.name}
                  {q.reward_apparatus_part_name && (
                    <span style={{
                      marginLeft: '8px', fontSize: '0.6rem', color: '#facc15',
                      background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.3)',
                      borderRadius: '4px', padding: '1px 6px', verticalAlign: 'middle',
                    }}>
                      Самогонный аппарат
                    </span>
                  )}
                </h3>
                <p style={{ fontSize: '0.72rem', color: '#6b5030', marginBottom: '6px' }}>
                  {q.description}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '0.68rem', color: '#5c3d1e' }}>
                  <span>💰 {q.reward_money}$</span>
                  <span>✨ {q.reward_experience} опыта</span>
                  {q.reward_karma > 0 && <span>⚖️ +{q.reward_karma}</span>}
                  {q.reward_apparatus_part_name && (
                    <span style={{ color: '#facc15' }}>🔧 {q.reward_apparatus_part_name}</span>
                  )}
                  {q.min_rank > 0 && <span>⭐ Разряд {q.min_rank}+</span>}
                </div>
              </div>
              <button className="btn btn-action text-xs" style={{ minHeight: '36px', flexShrink: 0 }}
                onClick={() => handleAccept(q.id)}>
                Взять
              </button>
            </div>
          ))}
          {available.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#5c3d1e' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✅</div>
              <p style={{ fontSize: '0.85rem' }}>Вы взяли все доступные квесты!</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
