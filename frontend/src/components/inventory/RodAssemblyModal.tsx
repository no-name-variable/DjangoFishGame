/**
 * Модальное окно сборки удочки с визуальными слотами.
 */
import { useEffect, useState } from 'react'
import TackleSlot, { type TackleSlotData } from './TackleSlot'
import TacklePickerPopup, { type PickerItem } from './TacklePickerPopup'
import { assembleRod } from '../../api/player'

interface InventoryItem {
  id: number
  item_type: string
  object_id: number
  item_name: string
  item_image: string | null
  quantity: number
}

interface Props {
  items: InventoryItem[]
  onAssembled: () => void
  onClose: () => void
}

const SLOT_ORDER = ['rodtype', 'reel', 'line', 'hook', 'floattackle', 'bait'] as const
type SlotType = typeof SLOT_ORDER[number]

const TYPE_LABELS: Record<string, string> = {
  rodtype: 'Удилище', reel: 'Катушка', line: 'Леска', hook: 'Крючок',
  floattackle: 'Поплавок', bait: 'Наживка',
}

export default function RodAssemblyModal({ items, onAssembled, onClose }: Props) {
  const [selected, setSelected] = useState<Record<string, { id: number; name: string } | null>>({})
  const [pickerType, setPickerType] = useState<SlotType | null>(null)
  const [depth, setDepth] = useState(1.5)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const byType = (type: string): PickerItem[] =>
    items
      .filter((i) => i.item_type === type && i.quantity > 0)
      .map((i) => ({ objectId: i.object_id, name: i.item_name, quantity: i.quantity, itemType: i.item_type }))

  const handleSelect = (objectId: number) => {
    if (!pickerType) return
    const item = items.find((i) => i.item_type === pickerType && i.object_id === objectId)
    if (item) {
      setSelected({ ...selected, [pickerType]: { id: objectId, name: item.item_name } })
    }
    setPickerType(null)
  }

  const handleRemove = () => {
    if (!pickerType) return
    setSelected({ ...selected, [pickerType]: null })
    setPickerType(null)
  }

  const handleSubmit = async () => {
    if (!selected.rodtype) {
      setError('Выберите удилище')
      return
    }
    setLoading(true)
    setError('')
    try {
      const params: Record<string, number | undefined> = {
        rod_type_id: selected.rodtype.id,
        depth_setting: depth,
      }
      if (selected.reel) params.reel_id = selected.reel.id
      if (selected.line) params.line_id = selected.line.id
      if (selected.hook) params.hook_id = selected.hook.id
      if (selected.floattackle) params.float_tackle_id = selected.floattackle.id
      if (selected.bait) params.bait_id = selected.bait.id
      await assembleRod(params as Parameters<typeof assembleRod>[0])
      onAssembled()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Ошибка сборки'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const buildSlot = (type: SlotType): TackleSlotData => {
    const sel = selected[type]
    return { type, itemId: sel?.id ?? null, name: sel?.name ?? null }
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
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(92,61,30,0.3)',
          background: 'rgba(7,18,7,0.5)', flexShrink: 0,
        }}>
          <span style={{ color: '#a8894e', fontSize: '0.92rem' }}>🔧 Сборка удочки</span>
          <button
            onClick={onClose}
            style={{ color: '#5c3d1e', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
          >✕</button>
        </div>

        {/* Контент */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 16px' }}>
          {error && (
            <div style={{
              color: '#f87171', fontSize: '0.75rem', marginBottom: '10px', padding: '6px 10px',
              background: 'rgba(248,113,113,0.1)', borderRadius: '6px',
              border: '1px solid rgba(248,113,113,0.2)',
            }}>{error}</div>
          )}

          {/* Слоты */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
            {SLOT_ORDER.map((type) => (
              <TackleSlot
                key={type}
                slot={buildSlot(type)}
                onClick={() => setPickerType(type)}
                required={type === 'rodtype' && !selected.rodtype}
              />
            ))}
          </div>

          {/* Настройки */}
          <div style={{
            padding: '10px 12px', borderRadius: '8px',
            background: 'rgba(7,18,7,0.3)', border: '1px solid rgba(92,61,30,0.25)',
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ color: '#7898b8', fontSize: '0.72rem' }}>Глубина</label>
                <span style={{ color: '#a8894e', fontSize: '0.72rem' }}>{depth.toFixed(1)} м</span>
              </div>
              <input type="range" min={0.5} max={10} step={0.5} value={depth}
                onChange={(e) => setDepth(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#3b82f6' }} />
            </div>
          </div>
        </div>

        {/* Кнопки */}
        <div style={{
          display: 'flex', gap: '8px', padding: '12px 16px',
          borderTop: '1px solid rgba(92,61,30,0.3)', flexShrink: 0,
        }}>
          <button onClick={onClose} className="btn btn-secondary text-sm flex-1" style={{ minHeight: '38px' }}>
            Отмена
          </button>
          <button onClick={handleSubmit} disabled={loading} className="btn btn-primary text-sm flex-1" style={{ minHeight: '38px' }}>
            {loading ? 'Сборка...' : 'Собрать'}
          </button>
        </div>
      </div>

      {/* Picker */}
      {pickerType && (
        <TacklePickerPopup
          title={TYPE_LABELS[pickerType] || pickerType}
          items={byType(pickerType)}
          allowRemove={!!selected[pickerType]}
          onSelect={handleSelect}
          onRemove={handleRemove}
          onClose={() => setPickerType(null)}
        />
      )}
    </div>
  )
}
