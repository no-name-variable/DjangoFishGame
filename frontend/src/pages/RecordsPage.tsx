/**
 * Таблица рекордов — улучшенный UI с медалями и рыбными иконками.
 */
import { useEffect, useState } from 'react'
import { getRecords } from '../api/records'
import GameImage from '../components/ui/GameImage'
import { getFallbackUrl } from '../utils/getAssetUrl'

interface FishRecord {
  id: number; species_name: string; species_image: string | null; player_nickname: string
  weight: number; length: number; location_name: string | null; caught_at: string
}

const MEDAL = ['🥇', '🥈', '🥉']

export default function RecordsPage() {
  const [records, setRecords] = useState<FishRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRecords()
      .then((res) => setRecords(res.data.results || res.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="p-10 text-center text-wood-500 text-sm">
      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🏆</div>
      Загрузка рекордов...
    </div>
  )

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="gold-text text-xl mb-4">🏆 Таблица рекордов</h1>

      {/* Топ-3 на мобилке — крупные карточки */}
      {records.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '20px' }}>
          {records.slice(0, 3).map((r, i) => (
            <div key={r.id} className="card" style={{
              textAlign: 'center',
              border: i === 0 ? '1px solid rgba(212,168,74,0.5)' : i === 1 ? '1px solid rgba(192,192,192,0.4)' : '1px solid rgba(176,100,40,0.4)',
            }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '4px' }}>{MEDAL[i]}</div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
                <div style={{ width: '40px', height: '32px', background: 'rgba(13,31,13,0.5)', borderRadius: '6px',
                  border: '1px solid rgba(74,49,24,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GameImage
                    src={r.species_image || getFallbackUrl('fish')}
                    fallback={getFallbackUrl('fish')}
                    alt={r.species_name}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '0.8rem', color: '#d4c5a9', marginBottom: '2px' }}>
                {r.species_name}
              </div>
              <div className="gold-text" style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '2px' }}>
                {r.weight.toFixed(2)} кг
              </div>
              <div style={{ fontSize: '0.65rem', color: '#7898b8' }}>{r.player_nickname}</div>
              {r.location_name && (
                <div style={{ fontSize: '0.6rem', color: '#5c3d1e', marginTop: '2px' }}>📍 {r.location_name}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Полная таблица */}
      <div className="card overflow-x-auto">
        <table className="game-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>#</th>
              <th>Рыба</th>
              <th>Вес</th>
              <th>Длина</th>
              <th>Рыболов</th>
              <th>Локация</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r, i) => (
              <tr key={r.id} style={i < 3 ? { background: 'rgba(212,168,74,0.04)' } : {}}>
                <td>
                  <span style={{ fontSize: '0.85rem' }}>{MEDAL[i] ?? i + 1}</span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '22px', background: 'rgba(13,31,13,0.5)', borderRadius: '4px',
                      border: '1px solid rgba(74,49,24,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0 }}>
                      <GameImage
                        src={r.species_image || getFallbackUrl('fish')}
                        fallback={getFallbackUrl('fish')}
                        alt={r.species_name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span style={{ fontFamily: 'Georgia, serif', color: '#d4c5a9' }}>{r.species_name}</span>
                  </div>
                </td>
                <td><span className="gold-text" style={{ fontSize: '0.85rem' }}>{r.weight.toFixed(2)} кг</span></td>
                <td style={{ color: '#a8894e' }}>{r.length.toFixed(1)} см</td>
                <td style={{ color: '#7898b8' }}>{r.player_nickname}</td>
                <td style={{ color: '#5c3d1e', fontSize: '0.75rem' }}>{r.location_name ?? '—'}</td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#5c3d1e' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>🎣</div>
                  Рекорды ещё не установлены
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
