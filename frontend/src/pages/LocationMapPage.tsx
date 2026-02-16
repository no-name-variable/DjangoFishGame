/**
 * Карта локаций текущей базы в стиле РР3.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLocations, enterLocation } from '../api/player'
import { usePlayerStore } from '../store/playerStore'
import GameImage from '../components/ui/GameImage'
import { getFallbackUrl } from '../utils/getAssetUrl'

interface Location {
  id: number
  name: string
  description: string
  image_day: string | null
  min_rank: number
  requires_ticket: boolean
}

export default function LocationMapPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const player = usePlayerStore((s) => s.player)
  const updatePlayer = usePlayerStore((s) => s.updatePlayer)
  const navigate = useNavigate()

  useEffect(() => {
    if (!player?.current_base) {
      setLoading(false)
      return
    }
    getLocations(player.current_base)
      .then((data) => setLocations(data.results || data))
      .catch(() => setError('Не удалось загрузить локации'))
      .finally(() => setLoading(false))
  }, [player?.current_base])

  const handleEnter = async (loc: Location) => {
    try {
      const data = await enterLocation(loc.id)
      updatePlayer({
        current_location: loc.id,
        current_location_name: loc.name,
        current_location_image: data.image_day || null,
      })
      navigate('/fishing')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Ошибка'
      setError(msg)
    }
  }

  if (loading) return <div className="p-8 text-center text-wood-500 text-sm">Загрузка...</div>

  if (!player?.current_base) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center">
        <p className="text-wood-500 mb-4">Вы не находитесь на базе.</p>
        <button onClick={() => navigate('/')} className="btn btn-primary">На главную</button>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="gold-text text-xl">Выбор локации</h1>
        <button onClick={() => navigate('/')} className="btn btn-secondary text-xs">
          Назад на базу
        </button>
      </div>

      {error && (
        <div className="wood-panel px-3 py-2 mb-3 text-sm text-red-400">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {locations.map((loc) => {
          const canEnter = player && player.rank >= loc.min_rank
          return (
            <div
              key={loc.id}
              className={`card transition-all overflow-hidden ${canEnter ? 'hover:border-gold/40 cursor-pointer' : 'opacity-60'}`}
              onClick={() => canEnter && handleEnter(loc)}
            >
              <GameImage
                src={loc.image_day || getFallbackUrl('location')}
                fallback={getFallbackUrl('location')}
                alt={loc.name}
                className="w-full h-28 object-cover rounded mb-2 -mt-1"
              />
              <div className="flex items-start justify-between mb-2">
                <h2 className="font-serif text-sm text-wood-200">{loc.name}</h2>
                {!canEnter && (
                  <span className="badge badge-red text-[10px]">Разряд {loc.min_rank}</span>
                )}
              </div>
              <p className="text-xs text-wood-500 mb-3 line-clamp-2">{loc.description}</p>
              <div className="flex items-center justify-between">
                <div className="text-[10px] text-wood-600">
                  Мин. разряд: {loc.min_rank}
                  {loc.requires_ticket && ' | Путёвка'}
                </div>
                {canEnter && (
                  <span className="text-gold text-xs font-serif">Войти &rarr;</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
