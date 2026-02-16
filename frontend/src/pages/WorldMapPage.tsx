/**
 * Карта мира — визуальная карта баз, стиль РР3.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getBases, travelToBase } from '../api/world'
import { getProfile } from '../api/auth'
import { usePlayerStore } from '../store/playerStore'

interface Base {
  id: number; name: string; description: string; world_map_x: number; world_map_y: number
  min_rank: number; min_karma: number; travel_cost: string; requires_vehicle: boolean; locations_count: number
}

export default function WorldMapPage() {
  const [bases, setBases] = useState<Base[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Base | null>(null)
  const [msg, setMsg] = useState('')
  const player = usePlayerStore((s) => s.player)
  const setPlayer = usePlayerStore((s) => s.setPlayer)
  const navigate = useNavigate()

  useEffect(() => {
    getBases().then((res) => setBases(res.data.results || res.data)).finally(() => setLoading(false))
  }, [])

  const handleTravel = async (base: Base) => {
    try { await travelToBase(base.id); const p = await getProfile(); setPlayer(p); navigate('/') }
    catch (e: unknown) { setMsg((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Ошибка') }
  }

  const isCurrentBase = (b: Base) => player?.current_base === b.id
  const canTravel = (b: Base) => {
    if (!player) return false
    return player.rank >= b.min_rank && player.karma >= b.min_karma && Number(player.money) >= Number(b.travel_cost)
  }

  if (loading) return <div className="p-8 text-center text-wood-500 text-sm">Загрузка...</div>

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="gold-text text-xl mb-4">Карта мира</h1>
      {msg && <div className="wood-panel px-3 py-2 mb-3 text-sm text-red-400">{msg}</div>}

      {/* Визуальная карта */}
      <div className="card mb-4 relative" style={{ height: '350px', overflow: 'hidden' }}>
        <div className="absolute inset-0 rounded"
          style={{ background: 'radial-gradient(ellipse at 50% 50%, #1a3a1a, #0d1f0d)' }}>
          {bases.map((b) => (
            <button
              key={b.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all group ${
                isCurrentBase(b) ? 'scale-110' : canTravel(b) ? 'hover:scale-105' : 'opacity-40'
              }`}
              style={{ left: `${b.world_map_x}%`, top: `${b.world_map_y}%` }}
              onClick={() => setSelected(b)}
            >
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full border ${
                  isCurrentBase(b)
                    ? 'bg-gold border-gold shadow-[0_0_8px_rgba(212,168,74,0.5)]'
                    : canTravel(b)
                      ? 'bg-water-400 border-water-300 group-hover:bg-gold group-hover:border-gold'
                      : 'bg-wood-700 border-wood-600'
                }`} />
                <span className={`text-[10px] mt-0.5 whitespace-nowrap font-serif ${
                  isCurrentBase(b) ? 'text-gold' : 'text-wood-400 group-hover:text-wood-200'
                }`}>{b.name}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Инфо */}
      {selected && (
        <div className="card mb-4">
          <h2 className="gold-text text-lg">{selected.name}</h2>
          {selected.description && <p className="text-wood-500 text-xs mt-1">{selected.description}</p>}
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-wood-600">
            <span>Локаций: {selected.locations_count}</span>
            <span>Разряд: {selected.min_rank}+</span>
            {selected.min_karma > 0 && <span>Карма: {selected.min_karma}+</span>}
            <span>Стоимость: {selected.travel_cost}$</span>
            {selected.requires_vehicle && <span className="text-yellow-500">Нужен транспорт</span>}
          </div>
          <div className="mt-3 flex gap-2">
            {isCurrentBase(selected) ? (
              <span className="text-gold text-xs font-serif">Вы здесь</span>
            ) : (
              <button
                className={`btn text-xs ${canTravel(selected) ? 'btn-primary' : 'bg-forest-800 text-wood-600 border-wood-700/30 cursor-not-allowed'}`}
                onClick={() => canTravel(selected) && handleTravel(selected)}
                disabled={!canTravel(selected)}
              >Переехать ({selected.travel_cost}$)</button>
            )}
            <button className="btn btn-secondary text-xs" onClick={() => setSelected(null)}>Закрыть</button>
          </div>
        </div>
      )}

      {/* Список */}
      <div className="space-y-2">
        {bases.map((b) => (
          <div
            key={b.id}
            className={`card flex justify-between items-center cursor-pointer hover:border-wood-500/60 transition-colors ${
              isCurrentBase(b) ? 'border-gold/40' : ''
            }`}
            onClick={() => setSelected(b)}
          >
            <div>
              <h3 className="text-wood-200 font-serif text-sm">
                {b.name} {isCurrentBase(b) && <span className="text-gold text-xs">(текущая)</span>}
              </h3>
              <p className="text-[10px] text-wood-600">
                Разряд {b.min_rank}+ | {b.locations_count} лок. | {b.travel_cost}$
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
