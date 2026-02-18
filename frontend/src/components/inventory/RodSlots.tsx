/**
 * Компонент отображения слотов удочек игрока (wood-тема).
 */
import React from 'react'
import { usePlayerStore } from '../../store/playerStore'

const ROD_CLASS_LABEL: Record<string, string> = {
  float: 'Поплавочная', bottom: 'Донная',
}

export const RodSlots: React.FC<{ onSelectSlot?: (slotNumber: number) => void; selectedSlot?: number }> = ({
  onSelectSlot,
  selectedSlot,
}) => {
  const player = usePlayerStore(state => state.player)

  if (!player) return null

  return (
    <div style={{
      display: 'flex', gap: '8px', padding: '10px 12px',
      background: 'rgba(42,26,13,0.35)',
      border: '1px solid rgba(92,61,30,0.3)',
      borderRadius: '10px',
    }}>
      {([1, 2, 3] as const).map((slotNum) => {
        const rodKey = `rod_slot_${slotNum}` as 'rod_slot_1' | 'rod_slot_2' | 'rod_slot_3'
        const rod = player[rodKey]
        const isSelected = selectedSlot === slotNum

        return (
          <div
            key={slotNum}
            onClick={() => onSelectSlot?.(slotNum)}
            style={{
              flex: 1, padding: '8px 10px', borderRadius: '8px',
              background: rod
                ? (isSelected ? 'rgba(92,61,30,0.35)' : 'rgba(13,31,13,0.4)')
                : 'rgba(13,31,13,0.15)',
              border: rod
                ? (isSelected ? '2px solid rgba(168,137,78,0.6)' : '1px solid rgba(92,61,30,0.45)')
                : '1px dashed rgba(92,61,30,0.3)',
              cursor: onSelectSlot ? 'pointer' : 'default',
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: '#5c3d1e', marginBottom: '4px' }}>
                Слот {slotNum}
              </div>
              {rod ? (
                <div>
                  <div style={{
                    fontFamily: 'Georgia, serif', fontSize: '0.78rem', color: '#d4c5a9',
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                  }}>
                    {rod.custom_name || rod.rod_type_name}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#8b6d3f', marginTop: '2px' }}>
                    {ROD_CLASS_LABEL[rod.rod_class] ?? rod.rod_class}
                  </div>
                  {!rod.is_ready && (
                    <div style={{ fontSize: '0.6rem', color: '#f59e0b', marginTop: '2px' }}>
                      ⚠️ Не готова
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: '0.75rem', color: '#5c3d1e' }}>Пусто</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default RodSlots
