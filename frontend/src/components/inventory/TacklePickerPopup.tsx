/**
 * Всплывающий список для выбора компонента снасти из инвентаря.
 */
import { useEffect } from 'react'
import GameImage from '../ui/GameImage'
import { getItemImageUrl, getFallbackUrl } from '../../utils/getAssetUrl'

export interface PickerItem {
  objectId: number
  name: string
  quantity: number
  itemType: string
}

interface Props {
  title: string
  items: PickerItem[]
  /** Разрешить "снять" текущий компонент */
  allowRemove?: boolean
  onSelect: (objectId: number) => void
  onRemove?: () => void
  onClose: () => void
}

export default function TacklePickerPopup({ title, items, allowRemove, onSelect, onRemove, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 90,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="modalIn"
        style={{
          width: '100%', maxWidth: '340px', maxHeight: '70vh',
          background: 'rgba(10,20,10,0.97)',
          border: '1px solid rgba(92,61,30,0.5)',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
          fontFamily: 'Georgia, serif',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Заголовок */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '1px solid rgba(92,61,30,0.3)',
          background: 'rgba(7,18,7,0.5)', flexShrink: 0,
        }}>
          <span style={{ color: '#a8894e', fontSize: '0.85rem' }}>{title}</span>
          <button
            onClick={onClose}
            style={{ color: '#5c3d1e', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
          >
            ✕
          </button>
        </div>

        {/* Список */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '6px' }}>
          {items.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px', color: '#5c3d1e', fontSize: '0.8rem' }}>
              Нет доступных предметов
            </div>
          )}

          {items.map((item) => (
            <button
              key={item.objectId}
              onClick={() => onSelect(item.objectId)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                width: '100%', padding: '8px 10px',
                background: 'transparent', border: 'none',
                borderRadius: '7px', cursor: 'pointer',
                textAlign: 'left', transition: 'background 0.12s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(92,61,30,0.2)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{
                width: '36px', height: '36px', flexShrink: 0,
                background: 'rgba(7,18,7,0.5)', borderRadius: '6px',
                border: '1px solid rgba(74,49,24,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '3px',
              }}>
                <GameImage
                  src={getItemImageUrl(item.itemType, item.objectId)}
                  fallback={getFallbackUrl('tackle')}
                  alt={item.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.78rem', color: '#d4c5a9',
                  overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                }}>
                  {item.name}
                </div>
                <div style={{ fontSize: '0.62rem', color: '#8b6d3f', marginTop: '1px' }}>
                  x{item.quantity}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Кнопки */}
        <div style={{
          display: 'flex', gap: '6px', padding: '8px 14px',
          borderTop: '1px solid rgba(92,61,30,0.3)', flexShrink: 0,
        }}>
          {allowRemove && onRemove && (
            <button onClick={onRemove} className="btn btn-danger text-xs flex-1" style={{ minHeight: '32px' }}>
              Снять
            </button>
          )}
          <button onClick={onClose} className="btn btn-secondary text-xs flex-1" style={{ minHeight: '32px' }}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  )
}
