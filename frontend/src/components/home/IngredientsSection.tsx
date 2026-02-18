/**
 * Секция "Ингредиенты" — список с ценами и кнопкой покупки.
 */
import { useState } from 'react'
import { buyIngredient } from '../../api/home'

interface Ingredient {
  id: number
  name: string
  slug: string
  price: string
  description: string
  player_quantity: number
}

interface Props {
  ingredients: Ingredient[]
  onUpdate: () => void
  onMessage: (msg: string) => void
}

export default function IngredientsSection({ ingredients, onUpdate, onMessage }: Props) {
  const [buying, setBuying] = useState<number | null>(null)

  const handleBuy = async (id: number) => {
    setBuying(id)
    try {
      const res = await buyIngredient(id, 1)
      onMessage(res.data.message)
      onUpdate()
    } catch (e: unknown) {
      const err = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Ошибка'
      onMessage(err)
    } finally {
      setBuying(null)
    }
  }

  return (
    <div className="card mb-4">
      <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', color: '#d4a84a', marginBottom: '10px' }}>
        Ингредиенты
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {ingredients.map((ing) => (
          <div
            key={ing.id}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 10px', borderRadius: '8px',
              background: 'rgba(13,31,13,0.4)',
              border: '1px solid rgba(74,49,24,0.35)',
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>{INGREDIENT_ICONS[ing.slug] || '\uD83E\uDDEA'}</span>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.8rem', color: '#d4c5a9', fontFamily: 'Georgia, serif' }}>
                {ing.name}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#5c3d1e' }}>
                {ing.price}$ &middot; {ing.player_quantity} шт.
              </div>
            </div>

            <button
              className="btn btn-primary text-xs"
              onClick={() => handleBuy(ing.id)}
              disabled={buying === ing.id}
              style={{ minHeight: '30px', padding: '4px 12px', flexShrink: 0 }}
            >
              {buying === ing.id ? '\u23F3' : 'Купить'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

const INGREDIENT_ICONS: Record<string, string> = {
  sugar: '\uD83C\uDF6C',
  yeast: '\uD83E\uDDEB',
  wheat: '\uD83C\uDF3E',
  corn: '\uD83C\uDF3D',
  apples: '\uD83C\uDF4E',
  water: '\uD83D\uDCA7',
}
