/**
 * Модальное окно просмотра/управления удочкой.
 * mode='inventory' — полное управление, mode='fishing' — только замена снастей.
 */
import { useEffect, useState } from 'react'
import TackleSlot, { type TackleSlotData } from './TackleSlot'
import TacklePickerPopup, { type PickerItem } from './TacklePickerPopup'
import ConfirmDialog from '../ui/ConfirmDialog'
import { getInventory, changeTackle, renameRod, updateRodSettings } from '../../api/player'
import { disassembleRod, deleteRod, equipRod, unequipRod } from '../../api/inventory'
import { repairRod } from '../../api/shop'
import { getProfile } from '../../api/auth'
import { usePlayerStore } from '../../store/playerStore'

interface InventoryItem {
  id: number
  item_type: string
  object_id: number
  item_name: string
  item_image: string | null
  quantity: number
}

/** Формат удочки из InventoryPage / TacklePanel */
export interface RodData {
  id: number
  rod_type: number
  rod_type_name: string
  display_name: string
  custom_name: string
  rod_class: string
  reel: number | null
  reel_name: string | null
  line: number | null
  line_name: string | null
  hook: number | null
  hook_name: string | null
  float_tackle: number | null
  float_name: string | null
  bait: number | null
  bait_name: string | null
  bait_remaining: number
  durability_current: number
  durability_max?: number
  is_assembled: boolean
  is_ready: boolean
  depth_setting: number
}

interface Props {
  rod: RodData
  mode: 'inventory' | 'fishing'
  /** На рыбалке: удочка в воде — нельзя менять */
  rodInWater?: boolean
  onClose: () => void
  onUpdate: () => void
  /** Для режима рыбалки: колбэк обновления настроек */
  onUpdateSettings?: (rodId: number, s: { depth_setting?: number }) => void
  /** Для режима рыбалки: колбэк замены снасти */
  onChangeTackle?: (rodId: number, updatedRod: RodData) => void
}

const ROD_CLASS_LABEL: Record<string, string> = {
  float: 'Поплавочная', bottom: 'Донная',
}

/** Типы слотов, доступные для класса удочки */
function slotsForClass(rodClass: string): string[] {
  switch (rodClass) {
    case 'float': return ['rodtype', 'reel', 'line', 'hook', 'floattackle', 'bait']
    case 'bottom': return ['rodtype', 'reel', 'line', 'hook', 'bait']
    default: return ['rodtype', 'reel', 'line', 'hook', 'bait']
  }
}

/** Маппинг slot type → поле API */
const TYPE_TO_FIELD: Record<string, string> = {
  hook: 'hook_id', floattackle: 'float_tackle_id', bait: 'bait_id',
}

const TYPE_LABELS: Record<string, string> = {
  rodtype: 'Удилище', reel: 'Катушка', line: 'Леска', hook: 'Крючок',
  floattackle: 'Поплавок', bait: 'Наживка',
}

function durabilityColor(d: number): string {
  if (d > 50) return '#22c55e'
  if (d > 20) return '#eab308'
  return '#ef4444'
}

export default function RodDetailModal({
  rod, mode, rodInWater, onClose, onUpdate, onUpdateSettings, onChangeTackle,
}: Props) {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [pickerType, setPickerType] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{
    title: string; message: string; danger: boolean; action: () => Promise<void>
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(rod.custom_name || '')
  const [localDepth, setLocalDepth] = useState(rod.depth_setting)

  const { setPlayer, player } = usePlayerStore()

  const equippedSlot = (() => {
    if (!player) return null
    if (player.rod_slot_1?.id === rod.id) return 1
    if (player.rod_slot_2?.id === rod.id) return 2
    if (player.rod_slot_3?.id === rod.id) return 3
    return null
  })()

  useEffect(() => {
    getInventory()
      .then((res) => {
        const data = res.data
        setInventory(Array.isArray(data) ? data : (data.results ?? data))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !pickerType && !confirm) onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, pickerType, confirm])

  const refreshProfile = async () => {
    try { const p = await getProfile(); setPlayer(p) } catch {}
  }

  const slots = slotsForClass(rod.rod_class)

  const buildSlot = (type: string): TackleSlotData => {
    switch (type) {
      case 'rodtype': return { type, itemId: rod.rod_type, name: rod.rod_type_name }
      case 'reel': return { type, itemId: rod.reel, name: rod.reel_name }
      case 'line': return { type, itemId: rod.line, name: rod.line_name }
      case 'hook': return { type, itemId: rod.hook, name: rod.hook_name }
      case 'floattackle': return { type, itemId: rod.float_tackle, name: rod.float_name }
      case 'bait': return { type, itemId: rod.bait, name: rod.bait_name, remaining: rod.bait_remaining }
      default: return { type, itemId: null, name: null }
    }
  }

  const canChangeTackle = (type: string) => {
    if (rodInWater) return false
    // Нельзя менять удилище, катушку, леску на собранной удочке
    if (['rodtype', 'reel', 'line'].includes(type)) return false
    return !!TYPE_TO_FIELD[type]
  }

  const pickerItems = (type: string): PickerItem[] =>
    inventory
      .filter((i) => i.item_type === type && i.quantity > 0)
      .map((i) => ({ objectId: i.object_id, name: i.item_name, quantity: i.quantity, itemType: i.item_type }))

  const handleSelectTackle = async (objectId: number) => {
    if (!pickerType) return
    const field = TYPE_TO_FIELD[pickerType]
    if (!field) return
    setPickerType(null)
    setLoading(true)
    setError('')
    try {
      const updated = await changeTackle(rod.id, { [field]: objectId })
      onChangeTackle?.(rod.id, updated)
      onUpdate()
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Ошибка замены')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveTackle = async () => {
    if (!pickerType) return
    const field = TYPE_TO_FIELD[pickerType]
    if (!field) return
    setPickerType(null)
    setLoading(true)
    setError('')
    try {
      const updated = await changeTackle(rod.id, { [field]: null })
      onChangeTackle?.(rod.id, updated)
      onUpdate()
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Ошибка снятия')
    } finally {
      setLoading(false)
    }
  }

  const handleDisassemble = () => {
    setConfirm({
      title: 'Разобрать удочку?',
      message: 'Компоненты вернутся в инвентарь (кроме наживки).',
      danger: true,
      action: async () => {
        await disassembleRod(rod.id)
        await refreshProfile()
        onUpdate()
        onClose()
      },
    })
  }

  const handleDelete = () => {
    setConfirm({
      title: 'Удалить удочку?',
      message: 'Удочка будет удалена безвозвратно. Компоненты НЕ вернутся в инвентарь!',
      danger: true,
      action: async () => {
        await deleteRod(rod.id)
        await refreshProfile()
        onUpdate()
        onClose()
      },
    })
  }

  const handleEquip = async (slot: 1 | 2 | 3) => {
    setLoading(true)
    setError('')
    try {
      await equipRod(rod.id, slot)
      await refreshProfile()
      onUpdate()
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Ошибка экипировки')
    } finally {
      setLoading(false)
    }
  }

  const handleUnequip = async () => {
    setLoading(true)
    setError('')
    try {
      await unequipRod(rod.id)
      await refreshProfile()
      onUpdate()
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Ошибка снятия')
    } finally {
      setLoading(false)
    }
  }

  const handleRepair = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await repairRod(rod.id)
      await refreshProfile()
      setError(`Отремонтировано за ${result.cost} монет`)
      onUpdate()
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Ошибка ремонта')
    } finally {
      setLoading(false)
    }
  }

  const handleRename = async () => {
    try {
      await renameRod(rod.id, nameValue)
      setEditingName(false)
      onUpdate()
    } catch {
      setError('Ошибка переименования')
    }
  }

  const handleConfirmAction = async () => {
    if (!confirm) return
    setLoading(true)
    setError('')
    try {
      await confirm.action()
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Ошибка')
    } finally {
      setLoading(false)
      setConfirm(null)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="modalIn"
        style={{
          width: '100%', maxWidth: '440px', maxHeight: '85vh',
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
          padding: '12px 16px',
          borderBottom: '1px solid rgba(92,61,30,0.3)',
          background: 'rgba(7,18,7,0.5)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {editingName ? (
              <form style={{ display: 'flex', gap: '6px', flex: 1, marginRight: '8px' }}
                onSubmit={(e) => { e.preventDefault(); handleRename() }}>
                <input autoFocus value={nameValue} onChange={(e) => setNameValue(e.target.value)}
                  maxLength={64} placeholder={rod.rod_type_name}
                  className="game-input text-sm py-0.5 flex-1"
                  onKeyDown={(e) => { if (e.key === 'Escape') setEditingName(false) }} />
                <button type="submit" className="btn btn-primary text-xs px-2 py-0.5">OK</button>
                <button type="button" onClick={() => setEditingName(false)}
                  className="btn btn-secondary text-xs px-2 py-0.5">✖</button>
              </form>
            ) : (
              <span
                style={{ color: '#d4c5a9', fontSize: '0.92rem', cursor: 'pointer' }}
                onClick={() => { setEditingName(true); setNameValue(rod.custom_name || '') }}
                title="Переименовать"
              >
                {rod.display_name || rod.rod_type_name}
                <span style={{ fontSize: '0.65rem', color: '#5c3d1e', marginLeft: '6px' }}>✏️</span>
              </span>
            )}
            <button onClick={onClose}
              style={{ color: '#5c3d1e', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}>
              ✕
            </button>
          </div>

          {/* Класс + прочность */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: '#8b6d3f' }}>
                {ROD_CLASS_LABEL[rod.rod_class] ?? rod.rod_class}
              </span>
              <span className={`badge ${rod.is_ready ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.6rem' }}>
                {rod.is_ready ? 'Готова' : 'Неполная'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '50px', height: '5px', borderRadius: '3px',
                background: 'rgba(13,31,13,0.8)', border: '1px solid rgba(74,49,24,0.4)', overflow: 'hidden',
              }}>
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
        </div>

        {/* Контент */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 16px' }}>
          {error && (
            <div style={{
              color: error.includes('Отремонтировано') ? '#4ade80' : '#f87171',
              fontSize: '0.75rem', marginBottom: '10px', padding: '6px 10px',
              background: error.includes('Отремонтировано') ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
              borderRadius: '6px',
              border: `1px solid ${error.includes('Отремонтировано') ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
            }}>{error}</div>
          )}

          {/* Слоты снастей */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '12px' }}>
            {slots.map((type) => (
              <TackleSlot
                key={type}
                slot={buildSlot(type)}
                onClick={canChangeTackle(type) ? () => setPickerType(type) : undefined}
                disabled={loading || rodInWater}
              />
            ))}
          </div>

          {/* Настройки */}
          <div style={{
            padding: '10px 12px', borderRadius: '8px', marginBottom: '12px',
            background: 'rgba(7,18,7,0.3)', border: '1px solid rgba(92,61,30,0.25)',
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ color: '#7898b8', fontSize: '0.72rem' }}>Глубина</label>
                <span style={{ color: '#a8894e', fontSize: '0.72rem' }}>{localDepth.toFixed(1)} м</span>
              </div>
              <input type="range" min={0.1} max={10} step={0.1} value={localDepth}
                disabled={rodInWater}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  setLocalDepth(v)
                  if (mode === 'fishing') onUpdateSettings?.(rod.id, { depth_setting: v })
                  else updateRodSettings(rod.id, { depth_setting: v }).catch(() => {})
                }}
                style={{ width: '100%', accentColor: '#3b82f6' }} />
            </div>
          </div>
        </div>

        {/* Кнопки управления */}
        <div style={{
          padding: '10px 16px',
          borderTop: '1px solid rgba(92,61,30,0.3)',
          display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0,
        }}>
          {/* Экипировка */}
          {mode === 'inventory' && (
            <div style={{ display: 'flex', gap: '6px' }}>
              {equippedSlot ? (
                <button onClick={handleUnequip} disabled={loading}
                  className="btn btn-secondary text-xs flex-1" style={{ minHeight: '34px' }}>
                  Снять (слот {equippedSlot})
                </button>
              ) : (
                <>
                  {([1, 2, 3] as const).map((slot) => (
                    <button key={slot} onClick={() => handleEquip(slot)} disabled={loading || !rod.is_ready}
                      className="btn btn-primary text-xs flex-1" style={{ minHeight: '34px' }}>
                      Слот {slot}
                    </button>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Действия */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {rod.durability_current < 100 && (
              <button onClick={handleRepair} disabled={loading}
                className="btn btn-secondary text-xs flex-1" style={{ minHeight: '34px' }}>
                🔧 Ремонт
              </button>
            )}
            {mode === 'inventory' && (
              <>
                <button onClick={handleDisassemble} disabled={loading || equippedSlot !== null}
                  className="btn btn-secondary text-xs flex-1" style={{ minHeight: '34px' }}
                  title={equippedSlot ? 'Сначала снимите из слота' : ''}>
                  Разобрать
                </button>
                <button onClick={handleDelete} disabled={loading}
                  className="btn btn-danger text-xs flex-1" style={{ minHeight: '34px' }}>
                  Удалить
                </button>
              </>
            )}
            <button onClick={onClose} className="btn btn-secondary text-xs flex-1" style={{ minHeight: '34px' }}>
              Закрыть
            </button>
          </div>
        </div>
      </div>

      {/* Picker */}
      {pickerType && (
        <TacklePickerPopup
          title={TYPE_LABELS[pickerType] || pickerType}
          items={pickerItems(pickerType)}
          allowRemove={buildSlot(pickerType).itemId !== null}
          onSelect={handleSelectTackle}
          onRemove={handleRemoveTackle}
          onClose={() => setPickerType(null)}
        />
      )}

      {/* Confirm */}
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          danger={confirm.danger}
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
