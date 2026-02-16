/**
 * Профиль игрока с достижениями и журналом — стиль РР3.
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
  const [journal, setJournal] = useState<JournalEntry[]>([])
  const [tab, setTab] = useState<'profile' | 'achievements' | 'journal'>('profile')

  useEffect(() => {
    getPlayerAchievements().then((res) => setAchievements(res.data.results || res.data))
    getPlayerJournal().then((res) => setJournal(res.data.results || res.data))
  }, [])

  if (!player) return null

  const tabs = [
    { key: 'profile' as const, label: 'Данные' },
    { key: 'achievements' as const, label: 'Достижения' },
    { key: 'journal' as const, label: 'Журнал' },
  ]

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="gold-text text-xl mb-4">Профиль</h1>

      <div className="flex gap-1 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`game-tab ${tab === t.key ? 'game-tab-active' : 'game-tab-inactive'}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="card">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Никнейм', value: player.nickname, cls: 'gold-text text-lg' },
              { label: 'Разряд', value: `${player.rank} — ${player.rank_title}`, cls: 'text-wood-200 font-serif' },
              { label: 'Опыт', value: `${player.experience} / ${player.experience_to_next_rank}`, cls: 'text-water-300' },
              { label: 'Деньги', value: `${player.money}$`, cls: 'text-yellow-400' },
              { label: 'Карма', value: String(player.karma), cls: player.karma >= 0 ? 'text-green-400' : 'text-red-400' },
              { label: 'Сытость', value: `${player.hunger}%`, cls: 'text-orange-400' },
            ].map((item) => (
              <div key={item.label}>
                <span className="text-wood-500 text-xs">{item.label}</span>
                <p className={item.cls}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'achievements' && (
        <div className="space-y-2">
          {achievements.map((pa) => (
            <div key={pa.id} className="card flex items-center gap-3 py-3">
              <span className="text-2xl">{pa.achievement.icon}</span>
              <div className="flex-1">
                <h3 className="text-wood-200 font-serif text-sm">{pa.achievement.name}</h3>
                <p className="text-xs text-wood-500">{pa.achievement.description}</p>
              </div>
              <span className="text-[10px] text-wood-600">
                {new Date(pa.unlocked_at).toLocaleDateString('ru')}
              </span>
            </div>
          ))}
          {achievements.length === 0 && (
            <p className="text-wood-500 text-sm text-center py-6">Пока нет достижений</p>
          )}
        </div>
      )}

      {tab === 'journal' && (
        <div className="card overflow-x-auto">
          <table className="game-table">
            <thead>
              <tr>
                <th>Рыба</th><th>Вес</th><th>Длина</th><th>Локация</th><th>Дата</th>
              </tr>
            </thead>
            <tbody>
              {journal.map((j) => (
                <tr key={j.id}>
                  <td className="text-wood-200 font-serif">{j.species_name}</td>
                  <td>{j.weight.toFixed(2)} кг</td>
                  <td>{j.length.toFixed(1)} см</td>
                  <td className="text-wood-500">{j.location_name || '\u2014'}</td>
                  <td className="text-wood-600 text-xs">{new Date(j.caught_at).toLocaleDateString('ru')}</td>
                </tr>
              ))}
              {journal.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-wood-500">Журнал пуст</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
