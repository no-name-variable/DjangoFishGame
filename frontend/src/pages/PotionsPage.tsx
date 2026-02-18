/**
 * Зелья — улучшенный UI со звёздами, рецептами и активными эффектами.
 */
import { useEffect, useState } from 'react'
import { craftPotion, getActivePotions, getMyStars, getPotions } from '../api/potions'
import { useSound } from '../hooks/useSound'

interface Star         { color: string; name: string; quantity: number }
interface Potion       { id: number; name: string; description: string; effect_type: string; effect_value: number; karma_cost: number; duration_hours: number; required_stars: Record<string, number>; is_one_time: boolean; can_craft: boolean }
interface ActivePotion { id: number; potion_name: string; effect_type: string; effect_value: number; expires_at_day: number; expires_at_hour: number; is_active: boolean }

const STAR_CFG: Record<string, { color: string; emoji: string }> = {
  red:    { color: '#f87171', emoji: '❤️' },
  orange: { color: '#fb923c', emoji: '🧡' },
  yellow: { color: '#facc15', emoji: '💛' },
  green:  { color: '#4ade80', emoji: '💚' },
  blue:   { color: '#60a5fa', emoji: '💙' },
  purple: { color: '#c084fc', emoji: '💜' },
}
const EFFECT_ICON: Record<string, string> = {
  luck: '🍀', invisibility: '👻', treasure: '💎', rarity: '✨', rank_boost: '⭐', trophy: '🏆',
}

export default function PotionsPage() {
  const [stars, setStars]     = useState<Star[]>([])
  const [potions, setPotions] = useState<Potion[]>([])
  const [active, setActive]   = useState<ActivePotion[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [crafting, setCrafting] = useState<number | null>(null)
  const { play } = useSound()

  const load = () => {
    setLoading(true)
    Promise.all([getMyStars(), getPotions(), getActivePotions()])
      .then(([sRes, pRes, aRes]) => { setStars(sRes.data); setPotions(pRes.data); setActive(aRes.data) })
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const handleCraft = async (id: number) => {
    setCrafting(id)
    try { const res = await craftPotion(id); play('craft'); setMessage(`✅ ${res.data.message}`); load() }
    catch (e: unknown) { setMessage(`⚠️ ${(e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Ошибка'}`) }
    finally { setCrafting(null) }
  }

  if (loading) return (
    <div className="p-10 text-center text-wood-500 text-sm">
      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🧪</div>
      Загрузка...
    </div>
  )

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="gold-text text-xl mb-4">🧪 Зелья</h1>

      {message && (
        <div className="wood-panel px-3 py-2 mb-3 text-sm" style={{
          color: message.startsWith('✅') ? '#4ade80' : '#f87171',
          display: 'flex', gap: '6px', alignItems: 'center',
        }}>
          {message}
          <button style={{ marginLeft: 'auto', color: '#5c3d1e' }} onClick={() => setMessage('')}>✖</button>
        </div>
      )}

      {/* Морские звёзды */}
      <div className="card mb-4">
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', color: '#d4a84a', marginBottom: '10px' }}>
          ⭐ Морские звёзды
        </h2>
        {stars.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {stars.map((s) => {
              const cfg = STAR_CFG[s.color] ?? { color: '#8b6d3f', emoji: '⭐' }
              return (
                <div key={s.color} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', borderRadius: '8px',
                  background: `${cfg.color}12`, border: `1px solid ${cfg.color}30`,
                }}>
                  <span style={{ fontSize: '1.1rem' }}>{cfg.emoji}</span>
                  <span style={{ fontSize: '0.78rem', color: cfg.color, fontWeight: 'bold' }}>{s.quantity}</span>
                  <span style={{ fontSize: '0.7rem', color: '#8b6d3f' }}>{s.name}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <p style={{ fontSize: '0.78rem', color: '#5c3d1e' }}>
            🌊 Звёзды выпадают случайно при ловле рыбы. Рыбачьте больше!
          </p>
        )}
      </div>

      {/* Активные эффекты */}
      {active.length > 0 && (
        <div className="card mb-4" style={{ borderColor: 'rgba(74,222,128,0.2)' }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', color: '#4ade80', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ✨ Активные эффекты
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {active.map((a) => (
              <div key={a.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '7px 10px', borderRadius: '7px',
                background: 'rgba(22,101,52,0.2)', border: '1px solid rgba(74,222,128,0.15)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1rem' }}>{EFFECT_ICON[a.effect_type] ?? '✨'}</span>
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: '0.85rem', color: '#d4c5a9' }}>
                    {a.potion_name}
                  </span>
                </div>
                <span style={{ fontSize: '0.65rem', color: '#5c3d1e' }}>
                  до дня {a.expires_at_day}, {a.expires_at_hour}:00
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Рецепты */}
      <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '0.85rem', color: '#8b6d3f', marginBottom: '10px' }}>
        📜 Рецепты зелий
      </h2>
      <div className="space-y-2">
        {potions.map((p) => (
          <div key={p.id} className="card" style={{
            opacity: p.can_craft ? 1 : 0.7,
            borderColor: p.can_craft ? 'rgba(74,222,128,0.2)' : 'rgba(92,61,30,0.5)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              {/* Иконка */}
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                background: p.can_craft ? 'rgba(22,101,52,0.25)' : 'rgba(13,31,13,0.5)',
                border: `1px solid ${p.can_craft ? 'rgba(74,222,128,0.2)' : 'rgba(74,49,24,0.3)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem',
              }}>
                {EFFECT_ICON[p.effect_type] ?? '🧪'}
              </div>

              {/* Контент */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', color: '#d4c5a9', marginBottom: '2px' }}>
                  {p.name}
                  {p.is_one_time && (
                    <span style={{ marginLeft: '6px', fontSize: '0.6rem', color: '#facc15',
                      background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.3)',
                      borderRadius: '4px', padding: '0 5px' }}>
                      Одноразовое
                    </span>
                  )}
                </h3>
                <p style={{ fontSize: '0.72rem', color: '#6b5030', marginBottom: '6px' }}>{p.description}</p>

                {/* Требования (звёзды) */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '4px' }}>
                  {Object.entries(p.required_stars).map(([color, qty]) => {
                    const cfg = STAR_CFG[color] ?? { color: '#8b6d3f', emoji: '⭐' }
                    const myQty = stars.find((s) => s.color === color)?.quantity ?? 0
                    const enough = myQty >= (qty as number)
                    return (
                      <span key={color} style={{
                        fontSize: '0.68rem',
                        color: enough ? cfg.color : '#f87171',
                        background: `${enough ? cfg.color : '#ef4444'}12`,
                        border: `1px solid ${enough ? cfg.color : '#ef4444'}30`,
                        borderRadius: '5px', padding: '1px 6px',
                      }}>
                        {cfg.emoji} {qty as number} ({myQty} ест.)
                      </span>
                    )
                  })}
                </div>

                {/* Стоимость */}
                <div style={{ display: 'flex', gap: '10px', fontSize: '0.65rem', color: '#5c3d1e' }}>
                  <span>⚖️ -{p.karma_cost} кармы</span>
                  {p.duration_hours > 0 && <span>⏱ {p.duration_hours} ч.</span>}
                </div>
              </div>

              {/* Кнопка */}
              <button
                className={`btn text-xs ${p.can_craft ? 'btn-primary' : 'bg-forest-800 text-wood-600 border-wood-700/30 cursor-not-allowed'}`}
                onClick={() => p.can_craft && handleCraft(p.id)}
                disabled={!p.can_craft || crafting === p.id}
                style={{ minHeight: '36px', flexShrink: 0 }}
              >
                {crafting === p.id ? '⏳' : p.can_craft ? '⚗️ Скрафт.' : '🔒'}
              </button>
            </div>
          </div>
        ))}

        {potions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#5c3d1e' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🧪</div>
            <p style={{ fontSize: '0.85rem' }}>Рецепты не найдены</p>
          </div>
        )}
      </div>
    </div>
  )
}
