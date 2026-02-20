/**
 * Барахолка — улучшенный UI с фильтрами, карточками лотов и модалом создания.
 */
import { useEffect, useState } from 'react'
import { buyListing, cancelListing, createListing, getListings, getMyListings } from '../api/bazaar'
import { getInventory } from '../api/player'
import { useSound } from '../hooks/useSound'
import GameImage from '../components/ui/GameImage'
import { getFallbackUrl } from '../utils/getAssetUrl'

interface Listing {
  id: number; seller_nickname: string; item_name: string; item_type: string
  item_image: string | null; quantity: number; price: string; created_at: string; is_active: boolean
}
interface InventoryItem {
  id: number; item_type: string; object_id: number; item_name: string
  item_image: string | null; quantity: number
}

type Tab = 'market' | 'my'

const ITEM_TYPES = [
  { value: '',            label: 'Все'        },
  { value: 'bait',        label: 'Наживки'    },
  { value: 'lure',        label: 'Приманки'   },
  { value: 'groundbait',  label: 'Прикормки'  },
  { value: 'flavoring',   label: 'Ароматы'    },
  { value: 'food',        label: 'Еда'        },
  { value: 'hook',        label: 'Крючки'     },
  { value: 'line',        label: 'Лески'      },
  { value: 'reel',        label: 'Катушки'    },
  { value: 'rodtype',     label: 'Удилища'    },
]

export default function BazaarPage() {
  const [tab, setTab]               = useState<Tab>('market')
  const [listings, setListings]     = useState<Listing[]>([])
  const [myListings, setMyListings] = useState<Listing[]>([])
  const [filter, setFilter]         = useState('')
  const [loading, setLoading]       = useState(true)
  const [msg, setMsg]               = useState('')
  const [buying, setBuying]         = useState<number | null>(null)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [inventory, setInventory]     = useState<InventoryItem[]>([])
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [sellQuantity, setSellQuantity] = useState(1)
  const [sellPrice, setSellPrice]     = useState(100)
  const [creating, setCreating]       = useState(false)
  const { play } = useSound()

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (tab === 'market') loadMarket(); else loadMy() }, [tab, filter])

  const handleBuy = async (id: number) => {
    setBuying(id)
    try { await buyListing(id); play('buy'); setMsg('✅ Покупка успешна!'); loadMarket() }
    catch (e: unknown) { setMsg(`⚠️ ${(e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Ошибка'}`) }
    finally { setBuying(null) }
  }
  const handleCancel = async (id: number) => {
    try { await cancelListing(id); loadMy() }
    catch (e: unknown) { setMsg(`⚠️ ${(e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Ошибка'}`) }
  }

  const openCreateModal = async () => {
    setShowCreateModal(true)
    try {
      const res = await getInventory()
      const items = (res.data.results || res.data) as InventoryItem[]
      const allowed = ['bait', 'lure', 'groundbait', 'flavoring', 'food', 'hook', 'floattackle', 'line', 'reel', 'rodtype']
      setInventory(items.filter((i) => allowed.includes(i.item_type)))
    } catch { setMsg('⚠️ Ошибка загрузки инвентаря') }
  }

  const handleCreate = async () => {
    if (!selectedItem) return
    if (sellQuantity < 1 || sellQuantity > selectedItem.quantity) { setMsg('⚠️ Некорректное количество'); return }
    if (sellPrice < 1) { setMsg('⚠️ Цена должна быть больше 0'); return }
    setCreating(true)
    try {
      await createListing(selectedItem.item_type, selectedItem.object_id, sellQuantity, sellPrice)
      play('coin')
      setMsg('✅ Лот создан!')
      setShowCreateModal(false); setSelectedItem(null); setSellQuantity(1); setSellPrice(100)
      loadMy()
    } catch (e: unknown) {
      setMsg(`⚠️ ${(e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Ошибка'}`)
    } finally { setCreating(false) }
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="gold-text text-xl mb-4">🏷️ Барахолка</h1>

      {msg && (
        <div className="wood-panel px-3 py-2 mb-3 text-sm" style={{
          color: msg.startsWith('✅') ? '#4ade80' : '#f87171',
          display: 'flex', gap: '6px', alignItems: 'center',
        }}>
          {msg}
          <button style={{ marginLeft: 'auto', color: '#a8894e' }} onClick={() => setMsg('')}>✖</button>
        </div>
      )}

      {/* Табы */}
      <div className="flex gap-1 mb-3">
        <button className={`game-tab ${tab === 'market' ? 'game-tab-active' : 'game-tab-inactive'}`}
          onClick={() => setTab('market')}>🛒 Рынок</button>
        <button className={`game-tab ${tab === 'my' ? 'game-tab-active' : 'game-tab-inactive'}`}
          onClick={() => setTab('my')}>📦 Мои лоты</button>
      </div>

      {/* Рынок */}
      {tab === 'market' && (
        <>
          {/* Фильтры */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
            {ITEM_TYPES.map((t) => (
              <button key={t.value}
                onClick={() => setFilter(t.value)}
                style={{
                  padding: '4px 10px', borderRadius: '6px',
                  fontSize: '0.7rem', fontFamily: 'Georgia, serif',
                  border: filter === t.value
                    ? '1px solid rgba(212,168,74,0.5)'
                    : '1px solid rgba(74,49,24,0.4)',
                  background: filter === t.value ? 'rgba(212,168,74,0.12)' : 'rgba(13,31,13,0.5)',
                  color: filter === t.value ? '#d4a84a' : '#8b6d3f',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  minHeight: '28px',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >{t.label}</button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#a8894e' }}>🎣 Загрузка...</div>
          ) : (
            <div className="space-y-2">
              {listings.map((l) => (
                <div key={l.id} className="card flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0" style={{
                      width: '44px', height: '44px',
                      background: 'rgba(13,31,13,0.5)', borderRadius: '8px',
                      border: '1px solid rgba(74,49,24,0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px',
                    }}>
                      <GameImage
                        src={l.item_image || getFallbackUrl('tackle')}
                        fallback={getFallbackUrl('tackle')}
                        alt={l.item_type}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-serif text-sm text-wood-200 truncate mb-0.5">
                        {l.item_name}
                      </h3>
                      <p className="text-[0.65rem] text-wood-400">
                        📦 {l.quantity} шт. · 👤 {l.seller_nickname}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0 sm:ml-auto">
                    <span className="gold-text font-serif text-[0.95rem] font-bold">
                      {l.price}$
                    </span>
                    <button className="btn btn-action text-xs" style={{ minHeight: '34px', minWidth: '64px' }}
                      onClick={() => handleBuy(l.id)} disabled={buying === l.id}>
                      {buying === l.id ? '⏳' : '🛒 Купить'}
                    </button>
                  </div>
                </div>
              ))}
              {listings.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#a8894e' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🏷️</div>
                  <p style={{ fontSize: '0.85rem' }}>Нет лотов{filter ? ' в этой категории' : ''}.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Мои лоты */}
      {tab === 'my' && (
        <>
          <button className="btn btn-primary mb-3 text-sm" onClick={openCreateModal} style={{ minHeight: '40px' }}>
            📦 Выставить предмет
          </button>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#a8894e' }}>🎣 Загрузка...</div>
          ) : (
            <div className="space-y-2">
              {myListings.map((l) => (
                <div key={l.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '0.85rem', color: '#d4c5a9', marginBottom: '2px' }}>
                      {l.item_name}
                    </h3>
                    <p style={{ fontSize: '0.65rem', color: '#a8894e' }}>
                      📦 {l.quantity} шт. · 💰 {l.price}$
                      {!l.is_active && <span style={{ color: '#4a3118', marginLeft: '6px' }}>✅ Продано</span>}
                    </p>
                  </div>
                  {l.is_active && (
                    <button className="btn btn-danger text-xs" style={{ minHeight: '34px' }}
                      onClick={() => handleCancel(l.id)}>
                      Отменить
                    </button>
                  )}
                </div>
              ))}
              {myListings.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#a8894e' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📦</div>
                  <p style={{ fontSize: '0.85rem' }}>У вас нет активных лотов</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Модал создания лота */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px',
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="wood-panel"
            style={{ padding: '20px', maxWidth: '440px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 className="gold-text text-lg">📦 Создать лот</h2>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a8894e', fontSize: '1rem' }}
                onClick={() => setShowCreateModal(false)}>✖</button>
            </div>

            {/* Выбор предмета */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#8b6d3f', marginBottom: '6px' }}>
                Выберите предмет:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                {inventory.map((item) => {
                  const isSel = selectedItem?.object_id === item.object_id && selectedItem?.item_type === item.item_type
                  return (
                    <div
                      key={`${item.item_type}-${item.object_id}`}
                      onClick={() => { setSelectedItem(item); setSellQuantity(Math.min(1, item.quantity)) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px',
                        borderRadius: '8px', cursor: 'pointer',
                        background: isSel ? 'rgba(212,168,74,0.1)' : 'rgba(13,31,13,0.4)',
                        border: `1px solid ${isSel ? 'rgba(212,168,74,0.45)' : 'rgba(74,49,24,0.3)'}`,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ width: '28px', height: '28px', flexShrink: 0, background: 'rgba(13,31,13,0.5)',
                        borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <GameImage
                          src={item.item_image || getFallbackUrl('tackle')}
                          fallback={getFallbackUrl('tackle')}
                          alt={item.item_type}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.8rem', color: '#d4c5a9' }}>{item.item_name}</div>
                        <div style={{ fontSize: '0.65rem', color: '#a8894e' }}>В наличии: {item.quantity} шт.</div>
                      </div>
                      {isSel && <span style={{ color: '#d4a84a', fontSize: '0.8rem' }}>✓</span>}
                    </div>
                  )
                })}
                {inventory.length === 0 && (
                  <p style={{ fontSize: '0.78rem', color: '#a8894e', textAlign: 'center', padding: '16px' }}>
                    Нет предметов для продажи
                  </p>
                )}
              </div>
            </div>

            {selectedItem && (
              <>
                {/* Количество */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#8b6d3f', marginBottom: '5px' }}>
                    Количество (макс. {selectedItem.quantity}):
                  </label>
                  <input
                    type="number" min={1} max={selectedItem.quantity} value={sellQuantity}
                    onChange={(e) => setSellQuantity(Math.max(1, Math.min(selectedItem.quantity, Number(e.target.value))))}
                    className="game-input w-full"
                  />
                </div>

                {/* Цена */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#8b6d3f', marginBottom: '5px' }}>
                    Цена ($):
                  </label>
                  <input
                    type="number" min={1} value={sellPrice}
                    onChange={(e) => setSellPrice(Math.max(1, Number(e.target.value)))}
                    className="game-input w-full"
                  />
                </div>

                {/* Итого */}
                <div style={{
                  marginBottom: '16px', padding: '8px 12px', borderRadius: '8px',
                  background: 'rgba(13,31,13,0.4)', border: '1px solid rgba(74,49,24,0.3)',
                  fontSize: '0.78rem', color: '#8b6d3f',
                }}>
                  Вы получите: <span className="gold-text" style={{ fontFamily: 'Georgia, serif', fontSize: '1rem' }}>
                    {sellPrice}$
                  </span>
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary flex-1 text-sm" style={{ minHeight: '42px' }}
                disabled={!selectedItem || creating} onClick={handleCreate}>
                {creating ? '⏳ Создаём...' : '📦 Выставить'}
              </button>
              <button className="btn btn-secondary flex-1 text-sm" style={{ minHeight: '42px' }}
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
