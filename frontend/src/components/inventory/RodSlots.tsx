/**
 * Компонент отображения слотов удочек игрока
 */
import React from 'react'
import { usePlayerStore } from '../../store/playerStore'

export const RodSlots: React.FC<{ onSelectSlot?: (slotNumber: number) => void; selectedSlot?: number }> = ({
  onSelectSlot,
  selectedSlot,
}) => {
  const player = usePlayerStore(state => state.player)

  if (!player) return null

  return (
    <div className="flex gap-4 p-4 bg-slate-800 rounded-lg">
      <div className="text-white font-semibold">Слоты удочек:</div>

      {([1, 2, 3] as const).map((slotNum) => {
        const rodKey = `rod_slot_${slotNum}` as 'rod_slot_1' | 'rod_slot_2' | 'rod_slot_3'
        const rod = player[rodKey]
        const isSelected = selectedSlot === slotNum

        return (
          <div
            key={slotNum}
            onClick={() => onSelectSlot?.(slotNum)}
            className={`
              flex-1 p-4 rounded-lg border-2 transition-all
              ${isSelected ? 'border-blue-500 bg-blue-900/30' : 'border-slate-600 bg-slate-700'}
              ${onSelectSlot ? 'cursor-pointer hover:border-blue-400' : ''}
              ${!rod ? 'border-dashed' : ''}
            `}
          >
            <div className="text-center">
              <div className="text-sm text-slate-400 mb-2">Слот {slotNum}</div>
              {rod ? (
                <div>
                  <div className="text-white font-medium">
                    {rod.custom_name || rod.rod_type_name}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {rod.rod_class === 'float' && '🎣 Поплавочная'}
                    {rod.rod_class === 'spinning' && '🎣 Спиннинг'}
                    {rod.rod_class === 'bottom' && '🎣 Донная'}
                  </div>
                  {!rod.is_ready && (
                    <div className="text-xs text-orange-400 mt-1">⚠️ Не готова</div>
                  )}
                </div>
              ) : (
                <div className="text-slate-500 text-sm">Пусто</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default RodSlots
