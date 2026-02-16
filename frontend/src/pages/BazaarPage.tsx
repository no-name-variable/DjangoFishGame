/**
 * Барахолка — торговля между игроками, стиль РР3.
 */
import { useEffect, useState } from 'react'
import { buyListing, cancelListing, getListings, getMyListings } from '../api/bazaar'
import GameImage from '../components/ui/GameImage'
import { getFallbackUrl } from '../utils/getAssetUrl'

interface Listing {
  id: number; seller_nickname: string; item_name: string; item_type: string
  item_image: string | null
  quantity: number; price: string; created_at: string; is_active: boolean
}

type Tab = 'market' | 'my'

const ITEM_TYPES = [
  { value: '', label: 'Все' }, { value: 'bait', label: 'Наживки' }, { value: 'lure', label: 'Приманки' },
  { value: 'groundbait', label: 'Прикормки' }, { value: 'flavoring', label: 'Аромат.' },
  { value: 'food', label: 'Еда' }, { value: 'hook', label: 'Крючки' },
  { value: 'line', label: 'Лески' }, { value: 'reel', label: 'Катушки' }, { value: 'rodtype', label: 'Удилища' },
]

export default function BazaarPage() {
  const [tab, setTab] = useState<Tab>('market')
  const [listings, setListings] = useState<Listing[]>([])
  const [myListings, setMyListings] = useState<Listing[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  const loadMarket = () => {
    setLoading(true)
    getListings(filter || undefined)
      .then((res) => setListings(res.data.results || res.data))
      .finally(() => setLoading(false))
  }
  const loadMy = () => {
    setLoading(true)
    getMyListings()
      .then((res) => setMyListings(res.data.results || res.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { if (tab === 'market') loadMarket(); else loadMy() }, [tab, filter])

  const handleBuy = async (id: number) => {
    try { await buyListing(id); setMsg('Покупка успешна!'); loadMarket() }
    catch (e: unknown) { setMsg((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Ошибка') }
  }
  const handleCancel = async (id: number) => {
    try { await cancelListing(id); loadMy() }
    catch (e: unknown) { setMsg((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Ошибка') }
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="gold-text text-xl mb-4">Барахолка</h1>
      {msg && <div className="wood-panel px-3 py-2 mb-3 text-sm text-gold">{msg}</div>}

      {/* Табы */}
      <div className="flex gap-1 mb-3">
        <button className={`game-tab ${tab === 'market' ? 'game-tab-active' : 'game-tab-inactive'}`}
          onClick={() => setTab('market')}>Рынок</button>
        <button className={`game-tab ${tab === 'my' ? 'game-tab-active' : 'game-tab-inactive'}`}
          onClick={() => setTab('my')}>Мои лоты</button>
      </div>

      {tab === 'market' && (
        <>
          {/* Фильтр по типу */}
          <div className="flex gap-1.5 mb-3 flex-wrap">
            {ITEM_TYPES.map((t) => (
              <button key={t.value}
                className={`px-2.5 py-1 rounded text-[11px] border transition-colors ${
                  filter === t.value
                    ? 'bg-gold/20 text-gold border-gold/40'
                    : 'bg-forest-800 text-wood-500 border-wood-700/30 hover:text-wood-300 hover:border-wood-600/40'
                }`}
                onClick={() => setFilter(t.value)}
              >{t.label}</button>
            ))}
          </div>

          {loading ? (
            <div className="text-center text-wood-500 text-sm py-8">Загрузка...</div>
          ) : (
            <div className="space-y-2">
              {listings.map((l) => (
                <div key={l.id} className="card flex items-center gap-3">
                  <GameImage
                    src={l.item_image || getFallbackUrl('tackle')}
                    fallback={getFallbackUrl('tackle')}
                    alt={l.item_type}
                    className="w-8 h-8 object-contain flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-wood-200 font-serif text-sm truncate">{l.item_name}</h3>
                    <p className="text-[10px] text-wood-600">
                      {l.quantity} шт. | {l.seller_nickname}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-gold font-serif text-sm">{l.price}$</span>
                    <button className="btn btn-action text-xs" onClick={() => handleBuy(l.id)}>Купить</button>
                  </div>
                </div>
              ))}
              {listings.length === 0 && <p className="text-wood-500 text-sm text-center py-6">Нет лотов</p>}
            </div>
          )}
        </>
      )}

      {tab === 'my' && (
        <>
          {loading ? (
            <div className="text-center text-wood-500 text-sm py-8">Загрузка...</div>
          ) : (
            <div className="space-y-2">
              {myListings.map((l) => (
                <div key={l.id} className="card flex justify-between items-center">
                  <div>
                    <h3 className="text-wood-200 font-serif text-sm">{l.item_name}</h3>
                    <p className="text-[10px] text-wood-600">
                      {l.quantity} шт. | {l.price}$
                      {!l.is_active && <span className="text-wood-700 ml-1">(продано)</span>}
                    </p>
                  </div>
                  {l.is_active && (
                    <button className="btn btn-danger text-xs" onClick={() => handleCancel(l.id)}>Отменить</button>
                  )}
                </div>
              ))}
              {myListings.length === 0 && <p className="text-wood-500 text-sm text-center py-6">У вас нет лотов</p>}
            </div>
          )}
        </>
      )}
    </div>
  )
}
