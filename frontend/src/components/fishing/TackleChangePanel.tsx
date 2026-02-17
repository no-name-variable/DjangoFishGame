/**
 * Панель быстрой замены компонентов снасти.
 * Доступна только когда удочка вытащена из воды.
 */
import { useEffect, useState } from 'react'
import { getInventory, changeTackle } from '../../api/player'
import type { FullRod } from './TacklePanel'

interface InventoryItem {
  id: number
  item_type: string
  object_id: number
  item_name: string
  quantity: number
}

/** Маппинг item_type → поле в запросе */
const typeToField: Record<string, string> = {
  hook: 'hook_id',
  floattackle: 'float_tackle_id',
  lure: 'lure_id',
  bait: 'bait_id',
}

/** Маппинг item_type → русское название */
const typeLabel: Record<string, string> = {
  hook: 'Крючок',
  floattackle: 'Поплавок',
  lure: 'Приманка',
  bait: 'Наживка',
}

/** Типы компонентов доступные для класса удочки */
function allowedTypes(rodClass: string): string[] {
  switch (rodClass) {
    case 'float': return ['hook', 'floattackle', 'bait']
    case 'spinning': return ['hook', 'lure']
    case 'bottom': return ['hook', 'bait']
    case 'feeder': return ['hook', 'bait']
    default: return ['hook', 'bait']
  }
}

interface TackleChangePanelProps {
  rod: FullRod
  onApply: (rodId: number, updatedRod: FullRod) => void
  onClose: () => void
}

export default function TackleChangePanel({ rod, onApply, onClose }: TackleChangePanelProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [selected, setSelected] = useState<Record<string, number | null>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getInventory()
      .then((res) => {
        const data = res.data
        const list: InventoryItem[] = Array.isArray(data) ? data : (data.results ?? data)
        setInventory(list)
      })
      .catch(() => setError('Не удалось загрузить инвентарь'))
  }, [])

  const types = allowedTypes(rod.rod_class)

  const handleApply = async () => {
    // Собираем только изменённые поля
    const changes: Record<string, number | null> = {}
    for (const [field, value] of Object.entries(selected)) {
      changes[field] = value
    }
    if (Object.keys(changes).length === 0) {
      onClose()
      return
    }

    setLoading(true)
    setError('')
    try {
      const updatedRod = await changeTackle(rod.id, changes)
      onApply(rod.id, updatedRod)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'Ошибка смены снасти'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-2 border-b border-wood-700/40 bg-wood-800/30 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-wood-300 text-xs font-serif">Сменить снасть</span>
        <button onClick={onClose} className="text-wood-500 hover:text-wood-300 text-xs">
          ✕
        </button>
      </div>

      {types.map((type) => {
        const items = inventory.filter((i) => i.item_type === type && i.quantity > 0)
        const fieldKey = typeToField[type]
        return (
          <div key={type} className="space-y-0.5">
            <label className="text-wood-500 text-[10px]">{typeLabel[type] || type}</label>
            <select
              className="w-full bg-wood-900/80 border border-wood-700/50 text-wood-200
                text-xs rounded px-2 py-1 focus:outline-none focus:border-water-500"
              value={selected[fieldKey] ?? ''}
              onChange={(e) => {
                const val = e.target.value
                if (val === '') {
                  setSelected((prev) => {
                    const next = { ...prev }
                    delete next[fieldKey]
                    return next
                  })
                } else {
                  setSelected((prev) => ({
                    ...prev,
                    [fieldKey]: val === 'none' ? null : Number(val),
                  }))
                }
              }}
            >
              <option value="">— не менять —</option>
              <option value="none">Снять</option>
              {items.map((item) => (
                <option key={item.object_id} value={item.object_id}>
                  {item.item_name} (x{item.quantity})
                </option>
              ))}
            </select>
          </div>
        )
      })}

      {error && <p className="text-red-400 text-[10px]">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleApply}
          disabled={loading}
          className="btn btn-primary text-xs flex-1"
        >
          {loading ? 'Применяю...' : 'Применить'}
        </button>
        <button onClick={onClose} className="btn btn-secondary text-xs flex-1">
          Отмена
        </button>
      </div>
    </div>
  )
}
