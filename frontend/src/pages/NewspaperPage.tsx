/**
 * Рыболовная газета — стиль РР3.
 */
import { useEffect, useState } from 'react'
import api from '../api/client'

interface FishRecord { id: number; species_name: string; player_nickname: string; weight: number; length: number }
interface TopPlayer { nickname: string; rank: number; experience: number; karma: number }
interface NewspaperData {
  weekly_champions: FishRecord[]; top_players: TopPlayer[]; top_records: FishRecord[]
  stats: { total_fish: number; total_weight: number; unique_species: number }
}

export default function NewspaperPage() {
  const [data, setData] = useState<NewspaperData | null>(null)

  useEffect(() => { api.get('/newspaper/').then((res) => setData(res.data)) }, [])

  if (!data) return <div className="p-8 text-center text-wood-500 text-sm">Загрузка...</div>

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="gold-text text-2xl text-center mb-1">Рыболовная газета</h1>
      <p className="text-wood-600 text-center text-xs mb-4">Последние новости из мира рыбалки</p>

      {/* Статистика */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { value: data.stats.total_fish, label: 'Рыб поймано' },
          { value: `${data.stats.total_weight.toFixed(1)} кг`, label: 'Общий вес' },
          { value: data.stats.unique_species, label: 'Видов' },
        ].map((s) => (
          <div key={s.label} className="card text-center py-3">
            <p className="text-xl text-water-300 font-serif">{s.value}</p>
            <p className="text-[10px] text-wood-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Рекордсмены недели */}
        <div className="card">
          <h2 className="font-serif text-sm text-gold mb-2">Рекордсмены недели</h2>
          {data.weekly_champions.length > 0 ? (
            <div className="space-y-1">
              {data.weekly_champions.map((r) => (
                <div key={r.id} className="flex justify-between text-xs border-b border-wood-800/30 pb-1">
                  <span className="text-wood-300">{r.species_name}</span>
                  <span className="text-water-300">{r.weight.toFixed(2)}кг — {r.player_nickname}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-wood-600 text-xs">Пока нет рекордов</p>
          )}
        </div>

        {/* Топ рыбаков */}
        <div className="card">
          <h2 className="font-serif text-sm text-gold mb-2">Топ-10 рыбаков</h2>
          <div className="space-y-1">
            {data.top_players.map((p, i) => (
              <div key={p.nickname} className="flex justify-between text-xs border-b border-wood-800/30 pb-1">
                <span>
                  <span className="text-wood-600 mr-1">{i + 1}.</span>
                  <span className="text-water-300">{p.nickname}</span>
                </span>
                <span className="text-wood-500">Разряд {p.rank}</span>
              </div>
            ))}
            {data.top_players.length === 0 && <p className="text-wood-600 text-xs">Нет данных</p>}
          </div>
        </div>
      </div>

      {/* Абсолютные рекорды */}
      <div className="card mt-4">
        <h2 className="font-serif text-sm text-gold mb-2">Абсолютные рекорды</h2>
        <table className="game-table">
          <thead><tr><th>#</th><th>Рыба</th><th>Вес</th><th>Рыболов</th></tr></thead>
          <tbody>
            {data.top_records.map((r, i) => (
              <tr key={r.id}>
                <td className="text-wood-500">{i + 1}</td>
                <td className="text-wood-200 font-serif">{r.species_name}</td>
                <td>{r.weight.toFixed(2)} кг</td>
                <td className="text-water-300">{r.player_nickname}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
