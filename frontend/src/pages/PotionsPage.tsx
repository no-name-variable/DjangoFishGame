/**
 * Страница зелий — крафт из морских звёзд, стиль РР3.
 */
import { useEffect, useState } from 'react'
import { craftPotion, getActivePotions, getMyStars, getPotions } from '../api/potions'

interface Star { color: string; name: string; quantity: number }
interface Potion { id: number; name: string; description: string; effect_type: string; effect_value: number; karma_cost: number; duration_hours: number; required_stars: Record<string, number>; is_one_time: boolean; can_craft: boolean }
interface ActivePotion { id: number; potion_name: string; effect_type: string; effect_value: number; expires_at_day: number; expires_at_hour: number; is_active: boolean }

const STAR_COLORS: Record<string, string> = { red: 'text-red-400', orange: 'text-orange-400', yellow: 'text-yellow-400', green: 'text-green-400', blue: 'text-blue-400', purple: 'text-purple-400' }
const STAR_NAMES: Record<string, string> = { red: 'Красн.', orange: 'Оранж.', yellow: 'Жёлт.', green: 'Зелён.', blue: 'Синяя', purple: 'Фиол.' }

export default function PotionsPage() {
  const [stars, setStars] = useState<Star[]>([])
  const [potions, setPotions] = useState<Potion[]>([])
  const [active, setActive] = useState<ActivePotion[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([getMyStars(), getPotions(), getActivePotions()])
      .then(([sRes, pRes, aRes]) => { setStars(sRes.data); setPotions(pRes.data); setActive(aRes.data) })
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const handleCraft = async (id: number) => {
    try { const res = await craftPotion(id); setMessage(res.data.message); load() }
    catch (e: unknown) { setMessage((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Ошибка') }
  }

  if (loading) return <div className="p-8 text-center text-wood-500 text-sm">Загрузка...</div>

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="gold-text text-xl mb-4">Зелья</h1>
      {message && <div className="wood-panel px-3 py-2 mb-3 text-sm text-gold">{message}</div>}

      {/* Морские звёзды */}
      <div className="card mb-4">
        <h2 className="font-serif text-sm text-gold mb-2">Морские звёзды</h2>
        {stars.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {stars.map((s) => (
              <div key={s.color} className="flex items-center gap-1">
                <span className={`text-base ${STAR_COLORS[s.color] || ''}`}>{'\u2605'}</span>
                <span className="text-wood-400 text-xs">{s.name}:</span>
                <span className="text-water-300 text-xs font-medium">{s.quantity}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-wood-600 text-xs">Звёзды выпадают при ловле рыбы.</p>
        )}
      </div>

      {/* Активные */}
      {active.length > 0 && (
        <div className="card mb-4">
          <h2 className="font-serif text-sm text-gold mb-2">Активные эффекты</h2>
          <div className="space-y-1">
            {active.map((a) => (
              <div key={a.id} className="flex justify-between text-xs border-b border-wood-800/30 pb-1">
                <span className="text-water-300">{a.potion_name}</span>
                <span className="text-wood-500">до дня {a.expires_at_day}, {a.expires_at_hour}:00</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Рецепты */}
      <h2 className="font-serif text-sm text-wood-400 mb-2">Рецепты</h2>
      <div className="space-y-2">
        {potions.map((p) => (
          <div key={p.id} className="card">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-serif text-sm text-wood-200">{p.name}</h3>
                <p className="text-xs text-wood-500 mt-0.5">{p.description}</p>
                <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-wood-600">
                  <span>Карма: -{p.karma_cost}</span>
                  {p.duration_hours > 0 && <span>{p.duration_hours}ч</span>}
                  {p.is_one_time && <span className="text-yellow-500">Одноразовое</span>}
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
                  {Object.entries(p.required_stars).map(([color, qty]) => (
                    <span key={color} className={STAR_COLORS[color] || 'text-wood-400'}>
                      {'\u2605'}{STAR_NAMES[color] || color}: {qty as number}
                    </span>
                  ))}
                </div>
              </div>
              <button
                className={`btn text-xs ml-3 ${p.can_craft ? 'btn-primary' : 'bg-forest-800 text-wood-600 border-wood-700/30 cursor-not-allowed'}`}
                onClick={() => p.can_craft && handleCraft(p.id)}
                disabled={!p.can_craft}
              >Скрафтить</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
