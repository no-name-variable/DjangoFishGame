/**
 * Список игроков на локации с polling.
 */
import { useCallback, useEffect, useState } from 'react'
import { getLocationPlayers, type LocationPlayer } from '../../api/world'

interface Props {
  locationId: number
  onCountChange?: (count: number) => void
  className?: string
}

export default function PlayerList({ locationId, onCountChange, className }: Props) {
  const [players, setPlayers] = useState<LocationPlayer[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    try {
      const { data } = await getLocationPlayers(locationId)
      setPlayers(data)
      onCountChange?.(data.length)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [locationId, onCountChange])

  useEffect(() => {
    fetch()
    const interval = setInterval(fetch, 30_000)
    return () => clearInterval(interval)
  }, [fetch])

  return (
    <div className={`card flex flex-col ${className || 'h-64'}`}>
      <h3 className="font-serif text-sm text-wood-200 mb-2">Игроки на локации</h3>

      <div className="flex-1 overflow-y-auto space-y-1 text-sm">
        {loading && <span className="text-wood-500 text-xs">Загрузка...</span>}
        {!loading && players.length === 0 && (
          <span className="text-wood-500 text-xs">Никого нет</span>
        )}
        {players.map((p) => (
          <div key={p.id} className="flex items-center justify-between">
            <span className="text-water-300 font-medium">{p.nickname}</span>
            <span className="text-wood-500 text-xs">{p.rank_title}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
