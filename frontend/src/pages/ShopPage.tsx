/**
 * Магазин снастей — улучшенный UI с боковой навигацией и карточками товаров.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getShopCategory, buyItem } from '../api/shop'
import { getProfile } from '../api/auth'
import { usePlayerStore } from '../store/playerStore'
import { useSound } from '../hooks/useSound'
import GameImage from '../components/ui/GameImage'
import { getFallbackUrl } from '../utils/getAssetUrl'

const categories = [
  { key: 'rods',        label: 'Удилища',      icon: '🪃' },
  { key: 'reels',       label: 'Катушки',      icon: '⚙️' },
  { key: 'lines',       label: 'Лески',        icon: '🧵' },
  { key: 'hooks',       label: 'Крючки',       icon: '🪝' },
  { key: 'floats',      label: 'Поплавки',     icon: '🔴' },
  { key: 'baits',       label: 'Наживки',      icon: '🪱' },
  { key: 'food',        label: 'Еда',          icon: '🍞' },
  { key: 'ingredients', label: 'Ингредиенты',  icon: '🧪' },
]

const itemTypeMap: Record<string, string> = {
  rods: 'rod', reels: 'reel', lines: 'line', hooks: 'hook',
  floats: 'float', baits: 'bait', food: 'food', ingredients: 'ingredient',
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
  const [items, setItems]       = useState<ShopItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [message, setMessage]   = useState('')
  const [buying, setBuying]     = useState<number | null>(null)
  const setPlayer = usePlayerStore((s) => s.setPlayer)
  const { play } = useSound()
  const navigate  = useNavigate()

  useEffect(() => { play('open_store') }, [])

  useEffect(() => {
    setLoading(true)
    getShopCategory(category)
      .then((data) => setItems(data.results || data))
      .finally(() => setLoading(false))
  }, [category])

  const handleBuy = async (item: ShopItem) => {
    setBuying(item.id)
    try {
      const result = await buyItem(itemTypeMap[category], item.id)
      play('buy')
      setMessage(`✅ Куплено: ${item.name}. Осталось ${result.money_left}$`)
      const profile = await getProfile()
      setPlayer(profile)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Ошибка покупки'
      setMessage(`⚠️ ${msg}`)
    } finally {
      setBuying(null)
    }
  }

  const activeCat = categories.find((c) => c.key === category)

  return (
    <div className="flex flex-col sm:flex-row sm:h-full sm:overflow-hidden">

      {/* ── Меню категорий: горизонтальное на мобильных, боковое на десктопе ── */}
      <aside className="shrink-0 sm:w-[160px] overflow-x-auto sm:overflow-x-hidden sm:overflow-y-auto border-b sm:border-b-0 sm:border-r"
        style={{
          background: 'rgba(7,18,7,0.6)',
          borderColor: 'rgba(74,49,24,0.4)',
          padding: '6px 8px',
        }}>
        <div className="flex sm:flex-col gap-1.5 sm:gap-0.5">
          <button onClick={() => navigate('/')} className="btn btn-secondary shrink-0 text-xs sm:w-full sm:mb-3 px-3 sm:px-2">
            ← База
          </button>
          {categories.map((c) => {
            const active = category === c.key
            return (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className="shrink-0 sm:w-full"
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  textAlign: 'left',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: active ? '1px solid rgba(212,168,74,0.35)' : '1px solid transparent',
                  background: active ? 'rgba(58,37,18,0.85)' : 'transparent',
                  color: active ? '#d4a84a' : '#8b6d3f',
                  fontSize: '0.78rem',
                  fontFamily: 'Georgia, serif',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  WebkitTapHighlightColor: 'transparent',
                  minHeight: '36px',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                  if (!active) Object.assign(e.currentTarget.style, { background: 'rgba(26,58,26,0.4)', color: '#d4c5a9' })
                }}
                onMouseLeave={e => {
                  if (!active) Object.assign(e.currentTarget.style, { background: 'transparent', color: '#8b6d3f' })
                }}
              >
                <span style={{ fontSize: '1rem' }}>{c.icon}</span>
                <span className="hidden sm:inline">{c.label}</span>
              </button>
            )
          })}
        </div>
      </aside>

      {/* ── Основной контент ─────────────────────────────────────── */}
      <main className="flex-1 p-3 sm:p-4 overflow-y-auto min-h-0">
        {/* Заголовок */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <h1 className="gold-text text-lg sm:text-xl">
            {activeCat?.icon} {activeCat?.label}
          </h1>
          {message && (
            <div style={{
              fontSize: '0.75rem', padding: '4px 12px', borderRadius: '8px',
              background: message.startsWith('✅') ? 'rgba(22,101,22,0.4)' : 'rgba(127,29,29,0.4)',
              border: `1px solid ${message.startsWith('✅') ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
              color: message.startsWith('✅') ? '#4ade80' : '#f87171',
              cursor: 'pointer',
            }} onClick={() => setMessage('')}>
              {message}
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#a8894e', fontSize: '0.85rem' }}>
            🎣 Загрузка...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((item) => (
              <div key={item.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Верх: изображение + название */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '10px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '56px', height: '56px', flexShrink: 0,
                    background: 'rgba(13,31,13,0.6)', borderRadius: '8px',
                    border: '1px solid rgba(74,49,24,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '4px',
                  }}>
                    <GameImage
                      src={item.image || getFallbackUrl('tackle')}
                      fallback={getFallbackUrl('tackle')}
                      alt={item.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontFamily: 'Georgia, serif', color: '#d4c5a9', fontSize: '0.85rem', lineHeight: 1.3 }}>
                      {item.name}
                    </h3>
                  </div>
                </div>

                {/* Характеристики */}
                {item.specs && item.specs.length > 0 && (
                  <div style={{ flex: 1, marginBottom: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {item.specs.map((s) => (
                        <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between',
                          fontSize: '0.7rem', borderBottom: '1px solid rgba(74,49,24,0.2)', paddingBottom: '2px' }}>
                          <span style={{ color: '#a8894e' }}>{s.label}</span>
                          <span style={{ color: '#a8894e' }}>{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Цена + кнопка */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  paddingTop: '10px', borderTop: '1px solid rgba(74,49,24,0.35)',
                  marginTop: 'auto',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '0.8rem' }}>💰</span>
                    <span style={{ color: '#eab308', fontWeight: 'bold', fontSize: '1rem', fontFamily: 'Georgia, serif' }}>
                      {Number(item.price).toFixed(0)}$
                    </span>
                  </div>
                  <button
                    onClick={() => handleBuy(item)}
                    disabled={buying === item.id}
                    className="btn btn-primary text-xs"
                    style={{ minHeight: '32px', minWidth: '72px' }}
                  >
                    {buying === item.id ? '⏳' : '🛒 Купить'}
                  </button>
                </div>
              </div>
            ))}

            {items.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#a8894e' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📦</div>
                <p style={{ fontSize: '0.85rem' }}>Нет товаров в этой категории</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
