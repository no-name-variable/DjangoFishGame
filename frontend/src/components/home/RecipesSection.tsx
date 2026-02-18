/**
 * Секция "Рецепты" — карточки с ингредиентами и кнопкой варки.
 */
import { useState } from 'react'
import { startBrewing } from '../../api/home'

interface Recipe {
  id: number
  name: string
  description: string
  effect_type: string
  effect_value: number
  duration_hours: number
  crafting_time_hours: number
  required_ingredients: Record<string, number>
  can_brew: boolean
}

interface Props {
  recipes: Recipe[]
  isApparatusComplete: boolean
  onUpdate: () => void
  onMessage: (msg: string) => void
}

const EFFECT_LABELS: Record<string, string> = {
  bite_boost: 'Поклёвка',
  experience_boost: 'Опыт',
  hunger_restore: 'Сытость',
  luck: 'Удача',
}

const EFFECT_ICONS: Record<string, string> = {
  bite_boost: '\uD83C\uDF1F',
  experience_boost: '\uD83D\uDCDA',
  hunger_restore: '\uD83C\uDF56',
  luck: '\uD83C\uDF40',
}

const INGREDIENT_NAMES: Record<string, string> = {
  sugar: 'Сахар',
  yeast: 'Дрожжи',
  wheat: 'Пшеница',
  corn: 'Кукуруза',
  apples: 'Яблоки',
  water: 'Вода',
}

export default function RecipesSection({ recipes, isApparatusComplete, onUpdate, onMessage }: Props) {
  const [brewing, setBrewing] = useState<number | null>(null)

  const handleBrew = async (id: number) => {
    setBrewing(id)
    try {
      const res = await startBrewing(id)
      onMessage(res.data.message)
      onUpdate()
    } catch (e: unknown) {
      const err = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Ошибка'
      onMessage(err)
    } finally {
      setBrewing(null)
    }
  }

  return (
    <div className="mb-4">
      <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', color: '#d4a84a', marginBottom: '10px' }}>
        Рецепты самогона
      </h2>

      {!isApparatusComplete && (
        <div className="card mb-3" style={{
          padding: '10px', textAlign: 'center',
          borderColor: 'rgba(234,179,8,0.3)', fontSize: '0.75rem', color: '#8b6d3f',
        }}>
          Соберите аппарат, чтобы начать варить самогон
        </div>
      )}

      <div className="space-y-2">
        {recipes.map((r) => (
          <div key={r.id} className="card" style={{
            opacity: r.can_brew ? 1 : 0.7,
            borderColor: r.can_brew ? 'rgba(74,222,128,0.2)' : 'rgba(92,61,30,0.5)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                background: r.can_brew ? 'rgba(22,101,52,0.25)' : 'rgba(13,31,13,0.5)',
                border: `1px solid ${r.can_brew ? 'rgba(74,222,128,0.2)' : 'rgba(74,49,24,0.3)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem',
              }}>
                {EFFECT_ICONS[r.effect_type] || '\uD83C\uDF76'}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', color: '#d4c5a9', marginBottom: '2px' }}>
                  {r.name}
                </h3>
                <p style={{ fontSize: '0.72rem', color: '#6b5030', marginBottom: '6px' }}>{r.description}</p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '4px' }}>
                  {Object.entries(r.required_ingredients).map(([slug, qty]) => (
                    <span key={slug} style={{
                      fontSize: '0.65rem', padding: '1px 6px', borderRadius: '5px',
                      background: 'rgba(92,61,30,0.2)', border: '1px solid rgba(92,61,30,0.3)',
                      color: '#8b6d3f',
                    }}>
                      {INGREDIENT_NAMES[slug] || slug} x{qty}
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '10px', fontSize: '0.65rem', color: '#5c3d1e' }}>
                  <span>{EFFECT_LABELS[r.effect_type] || r.effect_type}: +{Math.round(r.effect_value * 100)}%</span>
                  {r.duration_hours > 0 && <span>\u23F1 {r.duration_hours} ч.</span>}
                  <span>\u231B Варка: {r.crafting_time_hours} ч.</span>
                </div>
              </div>

              <button
                className={`btn text-xs ${r.can_brew ? 'btn-primary' : 'bg-forest-800 text-wood-600 border-wood-700/30 cursor-not-allowed'}`}
                onClick={() => r.can_brew && handleBrew(r.id)}
                disabled={!r.can_brew || brewing === r.id}
                style={{ minHeight: '36px', flexShrink: 0 }}
              >
                {brewing === r.id ? '\u23F3' : r.can_brew ? 'Поставить' : '\uD83D\uDD12'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
