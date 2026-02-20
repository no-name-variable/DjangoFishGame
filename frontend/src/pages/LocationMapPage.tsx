/**
 * Карта локаций текущей базы — улучшенный UI с крупными карточками и чёткими требованиями.
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
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [entering, setEntering]   = useState<number | null>(null)
  const player       = usePlayerStore((s) => s.player)
  const updatePlayer = usePlayerStore((s) => s.updatePlayer)
  const navigate     = useNavigate()

  useEffect(() => {
    if (!player?.current_base) { setLoading(false); return }
    getLocations(player.current_base)
      .then((data) => setLocations(data.results || data))
      .catch(() => setError('Не удалось загрузить локации'))
      .finally(() => setLoading(false))
  }, [player?.current_base])

  const handleEnter = async (loc: Location) => {
    setEntering(loc.id)
    setError('')
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
    } finally {
      setEntering(null)
    }
  }

  if (loading) return (
    <div className="p-10 text-center text-wood-500 text-sm">
      <div style={{ fontSize: '2rem', marginBottom: '8px', animation: 'fishSwim 2s ease-in-out infinite', display: 'inline-block' }}>🎣</div>
      <div>Загрузка локаций...</div>
    </div>
  )

  if (!player?.current_base) return (
    <div className="p-6 max-w-4xl mx-auto text-center">
      <p className="text-wood-500 mb-4">⚠️ Вы не находитесь на базе.</p>
      <button onClick={() => navigate('/')} className="btn btn-primary">На главную</button>
    </div>
  )

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Шапка */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h1 className="gold-text text-xl">🗺️ Выбор локации</h1>
          <p style={{ fontSize: '0.7rem', color: '#8b6d3f', marginTop: '2px' }}>
            {player.current_base_name} · Разряд игрока: {player.rank}
          </p>
        </div>
        <button onClick={() => navigate('/')} className="btn btn-secondary text-xs">
          ← База
        </button>
      </div>

      {error && (
        <div className="wood-panel px-3 py-2 mb-3 text-sm" style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ⚠️ {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {locations.map((loc) => {
          const canEnter  = player && player.rank >= loc.min_rank
          const isLoading = entering === loc.id
          return (
            <div
              key={loc.id}
              onClick={() => canEnter && !isLoading && handleEnter(loc)}
              style={{
                borderRadius: '12px',
                overflow: 'hidden',
                border: canEnter
                  ? '1px solid rgba(92,61,30,0.6)'
                  : '1px solid rgba(92,61,30,0.3)',
                background: 'rgba(42,26,13,0.7)',
                backdropFilter: 'blur(8px)',
                opacity: canEnter ? 1 : 0.55,
                cursor: canEnter ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
              }}
              onMouseEnter={e => {
                if (canEnter) Object.assign(e.currentTarget.style, {
                  transform: 'translateY(-3px)',
                  borderColor: 'rgba(212,168,74,0.45)',
                  boxShadow: '0 8px 22px rgba(0,0,0,0.45)',
                })
              }}
              onMouseLeave={e => {
                if (canEnter) Object.assign(e.currentTarget.style, {
                  transform: 'translateY(0)',
                  borderColor: 'rgba(92,61,30,0.6)',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                })
              }}
            >
              {/* Изображение */}
              <div style={{ position: 'relative', height: '120px', overflow: 'hidden' }}>
                <GameImage
                  src={loc.image_day || getFallbackUrl('location')}
                  fallback={getFallbackUrl('location')}
                  alt={loc.name}
                  className="w-full h-full object-cover"
                />
                {/* Градиент снизу */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',
                  background: 'linear-gradient(to top, rgba(13,18,13,0.9), transparent)',
                }} />
                {/* Бейдж требований */}
                {!canEnter && (
                  <div style={{
                    position: 'absolute', top: '8px', right: '8px',
                    background: 'rgba(127,29,29,0.85)',
                    border: '1px solid rgba(239,68,68,0.4)',
                    borderRadius: '6px', padding: '2px 8px',
                    fontSize: '0.65rem', color: '#fca5a5',
                  }}>
                    🔒 Разряд {loc.min_rank}+
                  </div>
                )}
                {loc.requires_ticket && (
                  <div style={{
                    position: 'absolute', top: '8px', left: '8px',
                    background: 'rgba(146,64,14,0.85)',
                    border: '1px solid rgba(251,146,60,0.4)',
                    borderRadius: '6px', padding: '2px 8px',
                    fontSize: '0.65rem', color: '#fed7aa',
                  }}>
                    🎫 Путёвка
                  </div>
                )}
              </div>

              {/* Контент */}
              <div style={{ padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', color: '#d4c5a9' }}>
                    {loc.name}
                  </h2>
                  {canEnter && (
                    <span className="gold-text" style={{ fontSize: '0.75rem' }}>
                      {isLoading ? '⏳' : 'Войти →'}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.72rem', color: '#8b6d3f', lineHeight: 1.4,
                  overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                  {loc.description}
                </p>
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px',
                  fontSize: '0.65rem', color: '#a8894e' }}>
                  <span>⭐ Мин. разряд: {loc.min_rank}</span>
                  {loc.requires_ticket && <span>🎫 Нужна путёвка</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {locations.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: '#a8894e' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🌊</div>
          <p style={{ fontSize: '0.85rem' }}>На этой базе нет доступных локаций</p>
        </div>
      )}
    </div>
  )
}
