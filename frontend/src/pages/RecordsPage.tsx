/**
 * Таблица рекордов — стиль РР3.
 */
import { useEffect, useState } from 'react'
import { getRecords } from '../api/records'
import GameImage from '../components/ui/GameImage'
import { getFallbackUrl } from '../utils/getAssetUrl'

interface FishRecord {
  id: number; species_name: string; species_image: string | null; player_nickname: string
  weight: number; length: number; location_name: string | null; caught_at: string
}

export default function RecordsPage() {
  const [records, setRecords] = useState<FishRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRecords()
      .then((res) => setRecords(res.data.results || res.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-wood-500 text-sm">Загрузка...</div>

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="gold-text text-xl mb-4">Таблица рекордов</h1>
      <div className="card overflow-x-auto">
        <table className="game-table">
          <thead>
            <tr>
              <th>#</th><th>Рыба</th><th>Вес</th><th>Длина</th><th>Рыболов</th><th>Локация</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r, i) => (
              <tr key={r.id}>
                <td className="text-wood-500">{i + 1}</td>
                <td className="text-wood-200 font-serif">
                  <div className="flex items-center gap-2">
                    <GameImage
                      src={r.species_image || getFallbackUrl('fish')}
                      fallback={getFallbackUrl('fish')}
                      alt={r.species_name}
                      className="w-6 h-5 object-contain"
                    />
                    {r.species_name}
                  </div>
                </td>
                <td>{r.weight.toFixed(2)} кг</td>
                <td>{r.length.toFixed(1)} см</td>
                <td className="text-water-300">{r.player_nickname}</td>
                <td className="text-wood-500">{r.location_name || '\u2014'}</td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr><td colSpan={6} className="py-6 text-center text-wood-500">Пока нет рекордов</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
