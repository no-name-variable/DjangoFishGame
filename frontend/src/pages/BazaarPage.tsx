/**
 * Барахолка — торговля между игроками, стиль РР3.
 */
import { useEffect, useState } from 'react'
import { buyListing, cancelListing, createListing, getListings, getMyListings } from '../api/bazaar'
import { getInventory } from '../api/player'
import GameImage from '../components/ui/GameImage'
import { getFallbackUrl } from '../utils/getAssetUrl'

interface Listing {
  id: number; seller_nickname: string; item_name: string; item_type: string
  item_image: string | null
  quantity: number; price: string; created_at: string; is_active: boolean
}

interface InventoryItem {
  id: number
  item_type: string
  object_id: number
  item_name: string
  item_image: string | null
  quantity: number
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

  // Создание лота
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [sellQuantity, setSellQuantity] = useState(1)
  const [sellPrice, setSellPrice] = useState(100)

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

  const openCreateModal = async () => {
    setShowCreateModal(true)
    try {
      const res = await getInventory()
      console.log('Inventory response:', res.data)
      const items = (res.data.results || res.data) as InventoryItem[]
      // Фильтруем только допустимые типы
      const allowed = ['bait', 'lure', 'groundbait', 'flavoring', 'food', 'hook', 'floattackle', 'line', 'reel', 'rodtype']
      const filtered = items.filter((i) => allowed.includes(i.item_type))
      console.log('Filtered items:', filtered)
      setInventory(filtered)
    } catch (err) {
      console.error('Inventory load error:', err)
      setMsg(`Ошибка загрузки инвентаря: ${(err as Error).message}`)
    }
  }

  const handleCreate = async () => {
    if (!selectedItem) return
    if (sellQuantity < 1 || sellQuantity > selectedItem.quantity) {
      setMsg('Некорректное количество')
      return
    }
    if (sellPrice < 1) {
      setMsg('Цена должна быть больше 0')
      return
    }

    try {
      await createListing(selectedItem.item_type, selectedItem.object_id, sellQuantity, sellPrice)
      setMsg('Лот создан!')
      setShowCreateModal(false)
      setSelectedItem(null)
      setSellQuantity(1)
      setSellPrice(100)
      loadMy()
    } catch (e: unknown) {
      setMsg((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Ошибка')
    }
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
          <button className="btn btn-primary mb-3 text-sm" onClick={openCreateModal}>
            📦 Выставить предмет
          </button>

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

      {/* Модальное окно создания лота */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCreateModal(false)}>
          <div className="wood-panel p-4 max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <h2 className="gold-text text-lg mb-3">Создать лот</h2>

            {/* Выбор предмета */}
            <div className="mb-3">
              <label className="text-wood-400 text-xs block mb-1">Выберите предмет:</label>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {inventory.map((item) => (
                  <div key={`${item.item_type}-${item.object_id}`}
                    className={`card cursor-pointer flex items-center gap-2 ${
                      selectedItem?.object_id === item.object_id && selectedItem?.item_type === item.item_type
                        ? 'ring-2 ring-gold'
                        : ''
                    }`}
                    onClick={() => {
                      setSelectedItem(item)
                      setSellQuantity(Math.min(1, item.quantity))
                    }}>
                    <GameImage
                      src={item.item_image || getFallbackUrl('tackle')}
                      fallback={getFallbackUrl('tackle')}
                      alt={item.item_type}
                      className="w-6 h-6 object-contain"
                    />
                    <div className="flex-1">
                      <div className="text-wood-200 text-xs">{item.item_name}</div>
                      <div className="text-wood-600 text-[10px]">В наличии: {item.quantity} шт.</div>
                    </div>
                  </div>
                ))}
                {inventory.length === 0 && (
                  <p className="text-wood-500 text-xs text-center py-3">Нет предметов для продажи</p>
                )}
              </div>
            </div>

            {selectedItem && (
              <>
                {/* Количество */}
                <div className="mb-3">
                  <label className="text-wood-400 text-xs block mb-1">
                    Количество (макс. {selectedItem.quantity}):
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={selectedItem.quantity}
                    value={sellQuantity}
                    onChange={(e) => setSellQuantity(Math.max(1, Math.min(selectedItem.quantity, Number(e.target.value))))}
                    className="game-input w-full"
                  />
                </div>

                {/* Цена */}
                <div className="mb-3">
                  <label className="text-wood-400 text-xs block mb-1">Цена ($):</label>
                  <input
                    type="number"
                    min={1}
                    value={sellPrice}
                    onChange={(e) => setSellPrice(Math.max(1, Number(e.target.value)))}
                    className="game-input w-full"
                  />
                </div>

                {/* Итого */}
                <div className="mb-3 p-2 bg-forest-900/30 rounded text-xs text-wood-300">
                  Вы получите: <span className="text-gold font-serif">{sellPrice}$</span>
                </div>
              </>
            )}

            {/* Кнопки */}
            <div className="flex gap-2">
              <button
                className="btn btn-primary flex-1 text-sm"
                disabled={!selectedItem}
                onClick={handleCreate}>
                Выставить
              </button>
              <button
                className="btn btn-secondary flex-1 text-sm"
                onClick={() => setShowCreateModal(false)}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
