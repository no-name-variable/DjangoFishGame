/**
 * Рюкзак — инвентарь, снасти, садок. Улучшенный UI с иконками и прогресс-барами.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getInventory, getPlayerRods, getCreel, renameRod, eat } from '../api/player'
import { sellFish } from '../api/shop'
import { getProfile } from '../api/auth'
import { usePlayerStore } from '../store/playerStore'
import { useInventoryStore } from '../store/inventoryStore'
import RodAssembly from '../components/inventory/RodAssembly'
import RodSlots from '../components/inventory/RodSlots'
import RodManagement from '../components/inventory/RodManagement'
import GameImage from '../components/ui/GameImage'
import { getFallbackUrl } from '../utils/getAssetUrl'

type Tab = 'inventory' | 'rods' | 'creel'

const ROD_CLASS_LABEL: Record<string, string> = {
  float: '🪣 Поплавочная', spinning: '🌀 Спиннинг', bottom: '⚓ Донная',
}

export default function InventoryPage() {
  const [tab, setTab]               = useState<Tab>('inventory')
  const [message, setMessage]       = useState('')
  const [assembling, setAssembling] = useState(false)
  const [editingRodId, setEditingRodId] = useState<number | null>(null)
  const [editName, setEditName]     = useState('')
  const [eating, setEating]         = useState<number | null>(null)
  const [selling, setSelling]       = useState(false)

  const { items, rods, creel, setItems, setRods, setCreel } = useInventoryStore()
  const setPlayer = usePlayerStore((s) => s.setPlayer)
  const navigate  = useNavigate()

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [invRes, rodsData, creelData] = await Promise.all([getInventory(), getPlayerRods(), getCreel()])
      setItems(invRes.data.results || invRes.data)
      setRods(rodsData.results || rodsData)
      setCreel(creelData.results || creelData)
    } catch {
      setMessage('⚠️ Ошибка загрузки')
    }
  }

  const handleSellAll = async () => {
    if (creel.length === 0) return
    setSelling(true)
    try {
      const result = await sellFish(creel.map((f) => f.id))
      setMessage(`✅ Продано ${result.fish_sold} рыб за ${result.money_earned}$`)
      setCreel([])
      const profile = await getProfile()
      setPlayer(profile)
    } catch { setMessage('⚠️ Ошибка продажи') }
    finally { setSelling(false) }
  }

  const handleEat = async (objectId: number) => {
    setEating(objectId)
    try {
      await eat(objectId)
      setMessage('✅ Вы перекусили! Сытость восстановлена.')
      loadData()
      const profile = await getProfile()
      setPlayer(profile)
    } catch { setMessage('⚠️ Ошибка') }
    finally { setEating(null) }
  }

  const totalCreelWeight = creel.reduce((sum, f) => sum + f.weight, 0)
  const totalCreelValue  = creel.reduce((sum, f) => sum + f.sell_price, 0)

  const tabs: { key: Tab; label: string; icon: string; badge?: number }[] = [
    { key: 'inventory', label: 'Предметы', icon: '📦', badge: items.length  },
    { key: 'rods',      label: 'Снасти',   icon: '🎣', badge: rods.length   },
    { key: 'creel',     label: 'Садок',    icon: '🐟', badge: creel.length  },
  ]

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Заголовок */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h1 className="gold-text text-xl">🎒 Рюкзак</h1>
        <button onClick={() => navigate('/')} className="btn btn-secondary text-xs">← База</button>
      </div>

      {message && (
        <div className="wood-panel px-3 py-2 mb-3 text-sm" style={{
          color: message.startsWith('✅') ? '#4ade80' : '#f87171',
          display: 'flex', gap: '6px', alignItems: 'center',
        }}>
          {message}
          <button style={{ marginLeft: 'auto', color: '#5c3d1e' }} onClick={() => setMessage('')}>✖</button>
        </div>
      )}

      {/* Слоты удочек */}
      <div style={{ marginBottom: '16px' }}>
        <RodSlots />
      </div>

      {/* Вкладки */}
      <div className="flex gap-1 mb-4">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`game-tab ${tab === t.key ? 'game-tab-active' : 'game-tab-inactive'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
            {t.badge !== undefined && t.badge > 0 && (
              <span style={{
                background: tab === t.key ? 'rgba(212,168,74,0.25)' : 'rgba(74,49,24,0.5)',
                color: tab === t.key ? '#d4a84a' : '#8b6d3f',
                fontSize: '0.6rem', borderRadius: '10px',
                padding: '0 5px', minWidth: '18px', textAlign: 'center',
              }}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Предметы ── */}
      {tab === 'inventory' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px' }}>
          {items.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#5c3d1e' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📦</div>
              <p style={{ fontSize: '0.85rem' }}>Инвентарь пуст</p>
            </div>
          )}
          {items.map((item) => (
            <div key={item.id} className="card-large" style={{ padding: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <div style={{
                  width: '36px', height: '36px', flexShrink: 0,
                  background: 'rgba(13,31,13,0.5)', borderRadius: '7px',
                  border: '1px solid rgba(74,49,24,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3px',
                }}>
                  <GameImage
                    src={item.item_image || getFallbackUrl('tackle')}
                    fallback={getFallbackUrl('tackle')}
                    alt={item.item_name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: '0.8rem', color: '#d4c5a9',
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {item.item_name}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#5c3d1e', marginTop: '2px' }}>
                    x{item.quantity} шт.
                  </div>
                </div>
              </div>
              {item.item_type === 'food' && (
                <button
                  onClick={() => handleEat(item.object_id)}
                  disabled={eating === item.object_id}
                  className="btn btn-primary text-xs w-full"
                  style={{ padding: '4px', marginTop: '2px' }}
                >
                  {eating === item.object_id ? '⏳' : '🍴 Съесть'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Снасти ── */}
      {tab === 'rods' && (
        <div className="space-y-3">
          {!assembling && (
            <button onClick={() => setAssembling(true)} className="btn btn-primary mb-2" style={{ minHeight: '40px' }}>
              🔧 Собрать удочку
            </button>
          )}
          {assembling && (
            <RodAssembly
              items={items}
              onAssembled={() => { setAssembling(false); setMessage('✅ Удочка собрана!'); loadData() }}
              onCancel={() => setAssembling(false)}
            />
          )}
          {rods.length === 0 && !assembling && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#5c3d1e' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🎣</div>
              <p style={{ fontSize: '0.85rem' }}>Нет собранных снастей. Соберите удочку!</p>
            </div>
          )}
          {rods.map((rod) => (
            <div key={rod.id} className="card-large">
              {/* Шапка удочки */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                {editingRodId === rod.id ? (
                  <form
                    style={{ display: 'flex', gap: '6px', flex: 1, marginRight: '8px' }}
                    onSubmit={async (e) => {
                      e.preventDefault()
                      try { await renameRod(rod.id, editName); setEditingRodId(null); loadData() }
                      catch { setMessage('⚠️ Ошибка переименования') }
                    }}
                  >
                    <input
                      autoFocus value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={64} placeholder={rod.rod_type_name}
                      className="game-input text-sm py-0.5 flex-1"
                      onKeyDown={(e) => { if (e.key === 'Escape') setEditingRodId(null) }}
                    />
                    <button type="submit" className="btn btn-primary text-xs px-2 py-0.5">OK</button>
                    <button type="button" onClick={() => setEditingRodId(null)} className="btn btn-secondary text-xs px-2 py-0.5">✖</button>
                  </form>
                ) : (
                  <h3
                    style={{ fontFamily: 'Georgia, serif', color: '#d4c5a9', fontSize: '0.9rem', cursor: 'pointer', flex: 1 }}
                    title="Нажмите для переименования"
                    onClick={() => { setEditingRodId(rod.id); setEditName(rod.custom_name || '') }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#d4a84a' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#d4c5a9' }}
                  >
                    {rod.display_name} <span style={{ fontSize: '0.65rem', color: '#5c3d1e' }}>✏️</span>
                  </h3>
                )}
                <span className={`badge ${rod.is_ready ? 'badge-green' : 'badge-red'} flex-shrink-0`}>
                  {rod.is_ready ? '✅ Готова' : '⚠️ Неполная'}
                </span>
              </div>

              {rod.custom_name && (
                <div style={{ fontSize: '0.65rem', color: '#5c3d1e', marginBottom: '8px' }}>
                  {rod.rod_type_name}
                </div>
              )}

              {/* Класс + прочность */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: '#8b6d3f' }}>
                  {ROD_CLASS_LABEL[rod.rod_class] ?? rod.rod_class}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.65rem', color: '#5c3d1e' }}>Прочность:</span>
                  <div style={{ width: '50px', height: '5px', borderRadius: '3px',
                    background: 'rgba(13,31,13,0.8)', border: '1px solid rgba(74,49,24,0.4)', overflow: 'hidden' }}>
                    <div style={{
                      width: `${rod.durability_current}%`, height: '100%', borderRadius: '3px',
                      background: rod.durability_current > 50 ? '#22c55e' : rod.durability_current > 20 ? '#eab308' : '#ef4444',
                    }} />
                  </div>
                  <span style={{
                    fontSize: '0.65rem',
                    color: rod.durability_current > 50 ? '#22c55e' : rod.durability_current > 20 ? '#eab308' : '#ef4444',
                  }}>{rod.durability_current}%</span>
                </div>
              </div>

              {/* Характеристики */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', marginBottom: '8px' }}>
                {[
                  rod.reel_name  && `⚙️ ${rod.reel_name}`,
                  rod.line_name  && `🧵 ${rod.line_name}`,
                  rod.hook_name  && `🪝 ${rod.hook_name}`,
                  rod.float_name && `🔴 ${rod.float_name}`,
                  rod.lure_name  && `🪱 ${rod.lure_name}`,
                  rod.bait_name  && `🪱 ${rod.bait_name} (${rod.bait_remaining})`,
                  `📐 Глубина: ${rod.depth_setting}м`,
                  `🔄 Проводка: ${rod.retrieve_speed}/10`,
                ].filter(Boolean).map((spec, i) => (
                  <div key={i} style={{ fontSize: '0.68rem', color: '#6b5030',
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {spec}
                  </div>
                ))}
              </div>

              <RodManagement rod={rod} onUpdate={loadData} />
            </div>
          ))}
        </div>
      )}

      {/* ── Садок ── */}
      {tab === 'creel' && (
        <div>
          {/* Итоги садка */}
          {creel.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap',
              gap: '10px', padding: '10px 14px', borderRadius: '10px', marginBottom: '12px',
              background: 'rgba(42,26,13,0.5)', border: '1px solid rgba(92,61,30,0.4)',
            }}>
              <div style={{ display: 'flex', gap: '16px', fontSize: '0.78rem' }}>
                <span style={{ color: '#8b6d3f' }}>🐟 {creel.length} рыб</span>
                <span style={{ color: '#8b6d3f' }}>⚖️ {totalCreelWeight.toFixed(2)} кг</span>
                <span className="gold-text" style={{ fontWeight: 'bold' }}>💰 ~{totalCreelValue}$</span>
              </div>
              <button onClick={handleSellAll} disabled={selling} className="btn btn-primary text-xs" style={{ minHeight: '36px' }}>
                {selling ? '⏳ Продаём...' : '💰 Продать всё'}
              </button>
            </div>
          )}

          <div className="space-y-2">
            {creel.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#5c3d1e' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🐟</div>
                <p style={{ fontSize: '0.85rem' }}>Садок пуст. Пора на рыбалку!</p>
              </div>
            )}
            {creel.map((fish) => (
              <div key={fish.id} className="card-large" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px' }}>
                <div style={{
                  width: '44px', height: '36px', flexShrink: 0,
                  background: 'rgba(13,31,13,0.5)', borderRadius: '7px',
                  border: '1px solid rgba(74,49,24,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3px',
                }}>
                  <GameImage
                    src={fish.species_image || getFallbackUrl('fish')}
                    fallback={getFallbackUrl('fish')}
                    alt={fish.species_name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: '0.85rem', color: '#d4c5a9', marginBottom: '2px' }}>
                    {fish.species_name}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#5c3d1e' }}>
                    ⚖️ {fish.weight.toFixed(2)} кг · 📏 {fish.length} см
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ color: '#eab308', fontWeight: 'bold', fontSize: '0.85rem', fontFamily: 'Georgia, serif' }}>
                    {fish.sell_price}$
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
