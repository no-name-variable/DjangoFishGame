/**
 * Компактная кнопка для смены наживки во время рыбалки (WAITING сессии).
 */
import { useEffect, useState } from 'react'
import { getInventory } from '../../api/player'
import * as fishingApi from '../../api/fishing'

interface InventoryItem {
  id: number
  item_type: string
  object_id: number
  item_name: string
  quantity: number
}

interface BaitChangeButtonProps {
  sessionId: number
  currentBaitName: string | null
  onSuccess: (message: string) => void
}

export default function BaitChangeButton({ sessionId, currentBaitName, onSuccess }: BaitChangeButtonProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [baits, setBaits] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (showPicker) {
      getInventory()
        .then((res) => {
          const data = res.data
          const list: InventoryItem[] = Array.isArray(data) ? data : (data.results ?? data)
          const baitItems = list.filter((i) => i.item_type === 'bait' && i.quantity > 0)
          setBaits(baitItems)
        })
        .catch(() => setError('Не удалось загрузить инвентарь'))
    }
  }, [showPicker])

  const handleChangeBait = async (baitId: number, baitName: string) => {
    setLoading(true)
    setError('')
    try {
      await fishingApi.changeBait(sessionId, baitId)
      onSuccess(`Наживка сменена на ${baitName}`)
      setShowPicker(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'Ошибка смены наживки'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!showPicker) {
    return (
      <button
        onClick={() => setShowPicker(true)}
        className="text-water-400 hover:text-water-300 text-[10px] underline"
        title="Сменить наживку"
      >
        сменить
      </button>
    )
  }

  return (
    <div className="col-span-2 mt-1 p-2 bg-wood-900/50 rounded border border-wood-700/40 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-wood-400 text-[10px]">Выберите наживку:</span>
        <button
          onClick={() => setShowPicker(false)}
          className="text-wood-500 hover:text-wood-300 text-xs"
        >
          ✕
        </button>
      </div>

      {error && <p className="text-red-400 text-[10px]">{error}</p>}

      <div className="space-y-1 max-h-32 overflow-y-auto">
        {baits.length === 0 && (
          <p className="text-wood-500 text-[10px]">Нет наживок в инвентаре</p>
        )}
        {baits.map((bait) => (
          <button
            key={bait.object_id}
            onClick={() => handleChangeBait(bait.object_id, bait.item_name)}
            disabled={loading}
            className="w-full text-left px-2 py-1 bg-wood-800/60 hover:bg-wood-700/60
              border border-wood-700/30 rounded text-wood-200 text-[10px]
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {bait.item_name} (x{bait.quantity})
            {bait.item_name === currentBaitName && <span className="text-water-400 ml-1">✓</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
