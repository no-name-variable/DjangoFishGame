/**
 * Форма сборки удочки из компонентов инвентаря.
 */
import { useState } from 'react'
import { assembleRod } from '../../api/player'

interface InventoryItem {
  id: number
  item_type: string
  object_id: number
  item_name: string
  quantity: number
}

interface Props {
  items: InventoryItem[]
  onAssembled: () => void
  onCancel: () => void
}

const COMPONENT_LABELS: Record<string, string> = {
  rodtype: 'Удилище',
  reel: 'Катушка',
  line: 'Леска',
  hook: 'Крючок',
  floattackle: 'Поплавок',
  lure: 'Блесна/приманка',
  bait: 'Наживка',
}

export default function RodAssembly({ items, onAssembled, onCancel }: Props) {
  const [selected, setSelected] = useState<Record<string, number | null>>({
    rodtype: null,
    reel: null,
    line: null,
    hook: null,
    floattackle: null,
    lure: null,
    bait: null,
  })
  const [depth, setDepth] = useState(1.5)
  const [speed, setSpeed] = useState(5)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const byType = (type: string) => items.filter((i) => i.item_type === type)

  const handleSubmit = async () => {
    if (!selected.rodtype) {
      setError('Выберите удилище')
      return
    }
    setLoading(true)
    setError('')
    try {
      const params: Record<string, number | undefined> = {
        rod_type_id: selected.rodtype!,
        depth_setting: depth,
        retrieve_speed: speed,
      }
      if (selected.reel) params.reel_id = selected.reel
      if (selected.line) params.line_id = selected.line
      if (selected.hook) params.hook_id = selected.hook
      if (selected.floattackle) params.float_tackle_id = selected.floattackle
      if (selected.lure) params.lure_id = selected.lure
      if (selected.bait) params.bait_id = selected.bait
      await assembleRod(params as Parameters<typeof assembleRod>[0])
      onAssembled()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Ошибка сборки'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const renderSelect = (type: string) => {
    const available = byType(type)
    const isRequired = type === 'rodtype'
    return (
      <div key={type} className="flex items-center gap-3">
        <label className="w-32 text-sm text-wood-300 text-right">
          {COMPONENT_LABELS[type]}{isRequired ? ' *' : ''}
        </label>
        <select
          value={selected[type] || ''}
          onChange={(e) => setSelected({ ...selected, [type]: e.target.value ? Number(e.target.value) : null })}
          className="flex-1 game-input"
        >
          <option value="">{available.length > 0 ? '— не выбрано —' : '— нет в инвентаре —'}</option>
          {available.map((item) => (
            <option key={item.id} value={item.object_id}>
              {item.item_name} (x{item.quantity})
            </option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div className="card">
      <h2 className="font-serif text-lg text-wood-200 mb-4">Сборка удочки</h2>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      <div className="space-y-3">
        {Object.keys(COMPONENT_LABELS).map(renderSelect)}

        <div className="flex items-center gap-3">
          <label className="w-32 text-sm text-wood-300 text-right">Глубина (м)</label>
          <input
            type="number"
            min={0.5}
            max={10}
            step={0.5}
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
            className="w-24 game-input"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="w-32 text-sm text-wood-300 text-right">Проводка (1-10)</label>
          <input
            type="number"
            min={1}
            max={10}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-24 game-input"
          />
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button onClick={handleSubmit} disabled={loading} className="btn btn-primary">
          {loading ? 'Сборка...' : 'Собрать'}
        </button>
        <button onClick={onCancel} className="btn btn-secondary">
          Отмена
        </button>
      </div>
    </div>
  )
}
