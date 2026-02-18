/**
 * Рыболовная газета — улучшенный UI в стиле газеты с блоками новостей.
 */
import { useEffect, useState } from 'react'
import api from '../api/client'

interface FishRecord { id: number; species_name: string; player_nickname: string; weight: number; length: number }
interface TopPlayer  { nickname: string; rank: number; experience: number; karma: number }
interface NewspaperData {
  weekly_champions: FishRecord[]; top_players: TopPlayer[]; top_records: FishRecord[]
  stats: { total_fish: number; total_weight: number; unique_species: number }
}

const MEDAL = ['🥇', '🥈', '🥉']

export default function NewspaperPage() {
  const [data, setData] = useState<NewspaperData | null>(null)

  useEffect(() => { api.get('/newspaper/').then((res) => setData(res.data)) }, [])

  if (!data) return (
    <div className="p-10 text-center text-wood-500 text-sm">
      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📰</div>
      Загрузка газеты...
    </div>
  )

  const today = new Date().toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Газетная шапка */}
      <div style={{
        textAlign: 'center', marginBottom: '18px',
        padding: '14px', borderRadius: '12px',
        background: 'rgba(42,26,13,0.5)', border: '1px solid rgba(92,61,30,0.45)',
        borderBottom: '2px solid rgba(212,168,74,0.3)',
      }}>
        <h1 className="gold-text" style={{ fontSize: 'clamp(1.3rem, 5vw, 1.8rem)', letterSpacing: '0.05em' }}>
          📰 Рыболовная газета
        </h1>
        <p style={{ fontSize: '0.7rem', color: '#5c3d1e', marginTop: '4px' }}>
          {today} · Новости мира рыбалки
        </p>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
        {[
          { value: data.stats.total_fish.toLocaleString('ru'), label: 'Рыб поймано', icon: '🐟' },
          { value: `${data.stats.total_weight.toFixed(1)} кг`,  label: 'Общий вес',   icon: '⚖️' },
          { value: String(data.stats.unique_species),            label: 'Видов рыб',   icon: '🌊' },
        ].map((s) => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: '12px 8px' }}>
            <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>{s.icon}</div>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '1.1rem', color: '#7898b8', fontWeight: 'bold', marginBottom: '2px' }}>
              {s.value}
            </p>
            <p style={{ fontSize: '0.65rem', color: '#5c3d1e' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Основные блоки */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        {/* Рекордсмены недели */}
        <div className="card">
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', color: '#d4a84a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🏆 Рекордсмены недели
          </h2>
          {data.weekly_champions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {data.weekly_champions.map((r, i) => (
                <div key={r.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '5px 8px', borderRadius: '6px',
                  background: i < 3 ? 'rgba(212,168,74,0.06)' : 'transparent',
                  borderBottom: '1px solid rgba(74,49,24,0.2)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                    <span style={{ fontSize: '0.85rem', flexShrink: 0 }}>{MEDAL[i] ?? `${i + 1}.`}</span>
                    <span style={{ fontSize: '0.78rem', color: '#d4c5a9', fontFamily: 'Georgia, serif',
                      overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {r.species_name}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#7898b8', flexShrink: 0, textAlign: 'right', paddingLeft: '8px' }}>
                    <span className="gold-text">{r.weight.toFixed(2)}кг</span>
                    <span style={{ color: '#5c3d1e', marginLeft: '4px' }}>— {r.player_nickname}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '0.78rem', color: '#5c3d1e', textAlign: 'center', padding: '16px 0' }}>
              Рекордов на этой неделе пока нет
            </p>
          )}
        </div>

        {/* Топ рыбаков */}
        <div className="card">
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', color: '#d4a84a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🎣 Топ-10 рыбаков
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {data.top_players.map((p, i) => (
              <div key={p.nickname} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '5px 8px', borderRadius: '6px',
                background: i < 3 ? 'rgba(212,168,74,0.06)' : 'transparent',
                borderBottom: '1px solid rgba(74,49,24,0.2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.82rem' }}>{MEDAL[i] ?? `${i + 1}.`}</span>
                  <span style={{ fontSize: '0.8rem', color: '#7898b8', fontFamily: 'Georgia, serif' }}>
                    {p.nickname}
                  </span>
                </div>
                <span style={{ fontSize: '0.65rem', color: '#5c3d1e' }}>⭐ {p.rank}</span>
              </div>
            ))}
            {data.top_players.length === 0 && (
              <p style={{ fontSize: '0.78rem', color: '#5c3d1e', textAlign: 'center', padding: '16px 0' }}>Нет данных</p>
            )}
          </div>
        </div>
      </div>

      {/* Абсолютные рекорды */}
      <div className="card overflow-x-auto">
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', color: '#d4a84a', marginBottom: '10px' }}>
          📜 Абсолютные рекорды всех времён
        </h2>
        <table className="game-table">
          <thead>
            <tr><th style={{ width: '40px' }}>#</th><th>Рыба</th><th>Вес</th><th>Длина</th><th>Рыболов</th></tr>
          </thead>
          <tbody>
            {data.top_records.map((r, i) => (
              <tr key={r.id} style={i < 3 ? { background: 'rgba(212,168,74,0.04)' } : {}}>
                <td>{MEDAL[i] ?? i + 1}</td>
                <td style={{ fontFamily: 'Georgia, serif', color: '#d4c5a9' }}>{r.species_name}</td>
                <td><span className="gold-text">{r.weight.toFixed(2)} кг</span></td>
                <td style={{ color: '#a8894e' }}>{r.length.toFixed(1)} см</td>
                <td style={{ color: '#7898b8' }}>{r.player_nickname}</td>
              </tr>
            ))}
            {data.top_records.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#5c3d1e' }}>
                Рекордов пока нет
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
