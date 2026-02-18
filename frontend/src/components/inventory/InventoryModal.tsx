/**
 * Модальный рюкзак для FishingPage — те же 3 вкладки что и InventoryPage,
 * но в оверлее и с ограничениями рыбалки (mode='fishing' для RodDetailModal).
 */
import { useEffect, useState } from 'react'
import { getInventory, getPlayerRods, getCreel, renameRod, eat } from '../../api/player'
import { sellFish } from '../../api/shop'
import { getProfile } from '../../api/auth'
import { usePlayerStore } from '../../store/playerStore'
import RodSlots from './RodSlots'
import RodManagement from './RodManagement'
import RodAssemblyModal from './RodAssemblyModal'
import RodDetailModal, { type RodData } from './RodDetailModal'
import TackleSlot, { type TackleSlotData } from './TackleSlot'
import GameImage from '../ui/GameImage'
import { getFallbackUrl } from '../../utils/getAssetUrl'
import type { SessionInfo } from '../../store/fishingStore'
import type { FullRod } from '../fishing/TacklePanel'

type Tab = 'inventory' | 'rods' | 'creel'

interface Props {
  sessions: SessionInfo[]
  onUpdateSettings: (rodId: number, settings: { depth_setting?: number }) => void
  onChangeTackle: (rodId: number, updatedRod: FullRod) => void
  onClose: () => void
}

const ROD_CLASS_LABEL: Record<string, string> = {
  float: 'Поплавочная', bottom: 'Донная',
}

interface InventoryItem {
  id: number; item_type: string; object_id: number
  item_name: string; item_image: string | null; quantity: number
}
interface PlayerRod {
  id: number; rod_type: number; rod_type_name: string; display_name: string
  custom_name: string; rod_class: 'float' | 'bottom'
  reel: number | null; reel_name: string | null
  line: number | null; line_name: string | null
  hook: number | null; hook_name: string | null
  float_tackle: number | null; float_name: string | null
  bait: number | null; bait_name: string | null
  bait_remaining: number; durability_current: number; durability_max: number
  is_assembled: boolean; is_ready: boolean
  depth_setting: number
}
interface CaughtFish {
  id: number; species_name: string; species_image: string | null
  weight: number; length: number; sell_price: number
}

function compactSlots(rod: RodData): TackleSlotData[] {
  const slots: TackleSlotData[] = [
    { type: 'reel', itemId: rod.reel, name: rod.reel_name },
    { type: 'line', itemId: rod.line, name: rod.line_name },
    { type: 'hook', itemId: rod.hook, name: rod.hook_name },
  ]
  if (rod.rod_class === 'float') slots.push({ type: 'floattackle', itemId: rod.float_tackle, name: rod.float_name })
  slots.push({ type: 'bait', itemId: rod.bait, name: rod.bait_name, remaining: rod.bait_remaining })
  return slots
}

function durabilityColor(d: number): string {
  if (d > 50) return '#22c55e'
  if (d > 20) return '#eab308'
  return '#ef4444'
}

export default function InventoryModal({ sessions, onUpdateSettings, onChangeTackle, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('inventory')
  const [message, setMessage] = useState('')
  const [items, setItems] = useState<InventoryItem[]>([])
  const [rods, setRods] = useState<PlayerRod[]>([])
  const [creel, setCreel] = useState<CaughtFish[]>([])
  const [assembling, setAssembling] = useState(false)
  const [detailRod, setDetailRod] = useState<RodData | null>(null)
  const [editingRodId, setEditingRodId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [eating, setEating] = useState<number | null>(null)
  const [selling, setSelling] = useState(false)

  const setPlayer = usePlayerStore((s) => s.setPlayer)

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !assembling && !detailRod) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, assembling, detailRod])

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
      const result = await sellFish(creel.map((f: CaughtFish) => f.id))
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

  const isRodInWater = (rodId: number) => sessions.some((s) => s.rodId === rodId)

  const totalCreelWeight = creel.reduce((sum, f) => sum + f.weight, 0)
  const totalCreelValue = creel.reduce((sum, f) => sum + f.sell_price, 0)

  const tabDefs: { key: Tab; label: string; icon: string; badge?: number }[] = [
    { key: 'inventory', label: 'Предметы', icon: '📦', badge: items.length },
    { key: 'rods', label: 'Снасти', icon: '🎣', badge: rods.length },
    { key: 'creel', label: 'Садок', icon: '🐟', badge: creel.length },
  ]

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="modalIn"
        style={{
          width: '100%', maxWidth: '560px', maxHeight: '85vh',
          background: 'rgba(10,20,10,0.97)',
          border: '1px solid rgba(92,61,30,0.5)',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
          fontFamily: 'Georgia, serif',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Заголовок */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px',
          borderBottom: '1px solid rgba(92,61,30,0.3)',
          background: 'rgba(7,18,7,0.5)', flexShrink: 0,
        }}>
          <span style={{ color: '#a8894e', fontSize: '0.92rem' }}>🎒 Рюкзак</span>
          <button onClick={onClose}
            style={{ color: '#5c3d1e', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}>
            ✕
          </button>
        </div>

        {/* Сообщение */}
        {message && (
          <div style={{
            margin: '8px 16px 0', padding: '6px 10px', borderRadius: '6px', fontSize: '0.75rem',
            color: message.startsWith('✅') ? '#4ade80' : '#f87171',
            background: message.startsWith('✅') ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
            border: `1px solid ${message.startsWith('✅') ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
            display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
          }}>
            {message}
            <button style={{ marginLeft: 'auto', color: '#5c3d1e', background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => setMessage('')}>✖</button>
          </div>
        )}

        {/* Слоты удочек */}
        <div style={{ padding: '8px 16px 0', flexShrink: 0 }}>
          <RodSlots />
        </div>

        {/* Вкладки */}
        <div style={{ display: 'flex', gap: '4px', padding: '8px 16px 0', flexShrink: 0 }}>
          {tabDefs.map((t) => (
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

        {/* Контент */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px 16px' }}>

          {/* ── Предметы ── */}
          {tab === 'inventory' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px' }}>
              {items.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '30px', color: '#5c3d1e' }}>
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
              <button onClick={() => setAssembling(true)} className="btn btn-primary mb-2" style={{ minHeight: '36px' }}>
                🔧 Собрать удочку
              </button>

              {rods.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px', color: '#5c3d1e' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🎣</div>
                  <p style={{ fontSize: '0.85rem' }}>Нет собранных снастей. Соберите удочку!</p>
                </div>
              )}
              {rods.map((rod) => (
                <div key={rod.id} className="card-large" style={{ cursor: 'pointer' }}
                  onClick={() => setDetailRod(rod as unknown as RodData)}>
                  {/* Шапка */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    {editingRodId === rod.id ? (
                      <form
                        style={{ display: 'flex', gap: '6px', flex: 1, marginRight: '8px' }}
                        onClick={(e) => e.stopPropagation()}
                        onSubmit={async (e) => {
                          e.preventDefault()
                          try { await renameRod(rod.id, editName); setEditingRodId(null); loadData() }
                          catch { setMessage('⚠️ Ошибка переименования') }
                        }}
                      >
                        <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)}
                          maxLength={64} placeholder={rod.rod_type_name}
                          className="game-input text-sm py-0.5 flex-1"
                          onKeyDown={(e) => { if (e.key === 'Escape') setEditingRodId(null) }} />
                        <button type="submit" className="btn btn-primary text-xs px-2 py-0.5">OK</button>
                        <button type="button" onClick={() => setEditingRodId(null)} className="btn btn-secondary text-xs px-2 py-0.5">✖</button>
                      </form>
                    ) : (
                      <h3 style={{ fontFamily: 'Georgia, serif', color: '#d4c5a9', fontSize: '0.9rem', flex: 1 }}>
                        {rod.display_name}
                        <span style={{ fontSize: '0.65rem', color: '#5c3d1e', marginLeft: '6px', cursor: 'pointer' }}
                          onClick={(e) => { e.stopPropagation(); setEditingRodId(rod.id); setEditName(rod.custom_name || '') }}
                          title="Переименовать">✏️</span>
                      </h3>
                    )}
                    <span className={`badge ${rod.is_ready ? 'badge-green' : 'badge-red'} flex-shrink-0`}>
                      {rod.is_ready ? '✅ Готова' : '⚠️ Неполная'}
                    </span>
                  </div>

                  {rod.custom_name && (
                    <div style={{ fontSize: '0.65rem', color: '#5c3d1e', marginBottom: '6px' }}>{rod.rod_type_name}</div>
                  )}

                  {/* Класс + прочность */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#8b6d3f' }}>
                      {ROD_CLASS_LABEL[rod.rod_class] ?? rod.rod_class}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '50px', height: '5px', borderRadius: '3px',
                        background: 'rgba(13,31,13,0.8)', border: '1px solid rgba(74,49,24,0.4)', overflow: 'hidden' }}>
                        <div style={{
                          width: `${rod.durability_current}%`, height: '100%', borderRadius: '3px',
                          background: durabilityColor(rod.durability_current),
                        }} />
                      </div>
                      <span style={{ fontSize: '0.65rem', color: durabilityColor(rod.durability_current) }}>
                        {rod.durability_current}%
                      </span>
                    </div>
                  </div>

                  {/* Компактные слоты */}
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {compactSlots(rod as unknown as RodData).map((slot, i) => (
                      <TackleSlot key={i} slot={slot} size="compact" />
                    ))}
                  </div>

                  <div onClick={(e) => e.stopPropagation()}>
                    <RodManagement rod={rod} onUpdate={loadData} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Садок ── */}
          {tab === 'creel' && (
            <div>
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
                  <div style={{ textAlign: 'center', padding: '30px', color: '#5c3d1e' }}>
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
      </div>

      {/* Модал сборки */}
      {assembling && (
        <RodAssemblyModal
          items={items}
          onAssembled={() => { setAssembling(false); setMessage('✅ Удочка собрана!'); loadData() }}
          onClose={() => setAssembling(false)}
        />
      )}

      {/* Модал детальной удочки (fishing mode) */}
      {detailRod && (
        <RodDetailModal
          rod={detailRod}
          mode="fishing"
          rodInWater={isRodInWater(detailRod.id)}
          onClose={() => setDetailRod(null)}
          onUpdate={() => { loadData(); setDetailRod(null) }}
          onUpdateSettings={onUpdateSettings}
          onChangeTackle={(rodId, updated) => {
            onChangeTackle(rodId, updated as unknown as FullRod)
            loadData()
          }}
        />
      )}
    </div>
  )
}
