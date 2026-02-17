/**
 * Магазин снастей в стиле РР3.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getShopCategory, buyItem } from '../api/shop'
import { getProfile } from '../api/auth'
import { usePlayerStore } from '../store/playerStore'
import GameImage from '../components/ui/GameImage'
import { getFallbackUrl } from '../utils/getAssetUrl'

const categories = [
  { key: 'rods', label: 'Удилища', icon: '\u{1FA83}' },
  { key: 'reels', label: 'Катушки', icon: '\u{2699}' },
  { key: 'lines', label: 'Лески', icon: '\u{1F9F5}' },
  { key: 'hooks', label: 'Крючки', icon: '\u{1FA9D}' },
  { key: 'floats', label: 'Поплавки', icon: '\u{1F534}' },
  { key: 'lures', label: 'Приманки', icon: '\u{1FAB1}' },
  { key: 'baits', label: 'Наживки', icon: '\u{1FAB1}' },
  { key: 'food', label: 'Еда', icon: '\u{1F35E}' },
]

const itemTypeMap: Record<string, string> = {
  rods: 'rod', reels: 'reel', lines: 'line', hooks: 'hook',
  floats: 'float', lures: 'lure', baits: 'bait', food: 'food',
}

interface ShopItem {
  id: number
  name: string
  price: string
  image?: string | null
  specs?: { label: string; value: string }[]
  [key: string]: unknown
}

export default function ShopPage() {
  const [category, setCategory] = useState('rods')
  const [items, setItems] = useState<ShopItem[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const setPlayer = usePlayerStore((s) => s.setPlayer)
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    getShopCategory(category)
      .then((data) => setItems(data.results || data))
      .finally(() => setLoading(false))
  }, [category])

  const handleBuy = async (item: ShopItem) => {
    try {
      const result = await buyItem(itemTypeMap[category], item.id)
      setMessage(`Куплено: ${item.name}. Осталось ${result.money_left} серебра.`)
      const profile = await getProfile()
      setPlayer(profile)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Ошибка покупки'
      setMessage(msg)
    }
  }

  return (
    <div className="flex h-full">
      {/* Категории слева */}
      <aside className="w-44 bg-forest-900/50 border-r border-wood-800/40 p-2 flex flex-col">
        <button onClick={() => navigate('/')} className="btn btn-secondary w-full mb-3 text-xs">
          Назад на базу
        </button>
        <div className="space-y-0.5">
          {categories.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded transition-all text-sm font-serif ${
                category === c.key
                  ? 'bg-wood-800/80 text-gold border border-gold/30'
                  : 'text-wood-400 hover:bg-forest-800/60 hover:text-wood-200 border border-transparent'
              }`}
            >
              <span>{c.icon}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Товары */}
      <main className="flex-1 p-4 overflow-y-auto">
        <h1 className="gold-text text-xl mb-3">Магазин</h1>
        {message && (
          <div className="wood-panel px-3 py-2 mb-3 text-sm text-gold">{message}</div>
        )}
        {loading ? (
          <p className="text-wood-500 text-sm">Загрузка...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((item) => (
              <div key={item.id} className="card hover:border-wood-500/60 transition-colors">
                <div className="flex gap-3 mb-2">
                  <GameImage
                    src={item.image || getFallbackUrl('tackle')}
                    fallback={getFallbackUrl('tackle')}
                    alt={item.name}
                    className="w-16 h-16 object-contain rounded bg-forest-900/50 p-1 flex-shrink-0"
                  />
                  <h3 className="font-serif text-wood-200 text-sm self-center">{item.name}</h3>
                </div>
                <div className="text-xs text-wood-500 mb-3 space-y-0.5">
                  {item.specs?.map((s) => (
                    <div key={s.label}>
                      <span className="text-wood-600">{s.label}:</span>{' '}
                      <span className="text-wood-400">{s.value}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-wood-800/40">
                  <span className="text-yellow-400 font-bold text-sm">
                    {Number(item.price).toFixed(0)}$
                  </span>
                  <button onClick={() => handleBuy(item)} className="btn btn-primary text-xs py-1">
                    Купить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
