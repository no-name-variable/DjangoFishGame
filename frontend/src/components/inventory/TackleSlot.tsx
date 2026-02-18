/**
 * Визуальный слот компонента снасти (катушка, леска, крючок и т.д.).
 */
import GameImage from '../ui/GameImage'
import { getItemImageUrl, getFallbackUrl } from '../../utils/getAssetUrl'

export interface TackleSlotData {
  /** item_type (hook, reel, line, floattackle, lure, bait, rodtype) */
  type: string
  /** object_id предмета или null */
  itemId: number | null
  /** Название предмета */
  name: string | null
  /** Остаток (только для наживки) */
  remaining?: number
}

interface Props {
  slot: TackleSlotData
  /** compact — для карточек удочек, normal — для модала */
  size?: 'compact' | 'normal'
  onClick?: () => void
  disabled?: boolean
  /** Красная рамка для обязательных пустых слотов */
  required?: boolean
}

const TYPE_LABELS: Record<string, string> = {
  rodtype: 'Удилище',
  reel: 'Катушка',
  line: 'Леска',
  hook: 'Крючок',
  floattackle: 'Поплавок',
  lure: 'Приманка',
  bait: 'Наживка',
}

const TYPE_ICONS: Record<string, string> = {
  rodtype: '🎣', reel: '⚙️', line: '🧵', hook: '🪝',
  floattackle: '🔴', lure: '🪱', bait: '🪱',
}

export default function TackleSlot({ slot, size = 'normal', onClick, disabled, required }: Props) {
  const filled = slot.itemId !== null && slot.name !== null
  const clickable = !!onClick && !disabled

  const imgSize = size === 'compact' ? 28 : 40
  const imgUrl = filled ? getItemImageUrl(slot.type, slot.itemId!) : null

  if (size === 'compact') {
    return (
      <div
        onClick={clickable ? onClick : undefined}
        title={filled ? `${TYPE_LABELS[slot.type]}: ${slot.name}` : `${TYPE_LABELS[slot.type]}: пусто`}
        style={{
          width: '34px', height: '34px', flexShrink: 0,
          background: filled ? 'rgba(13,31,13,0.5)' : 'rgba(13,31,13,0.25)',
          borderRadius: '6px',
          border: filled
            ? '1px solid rgba(92,61,30,0.5)'
            : required
              ? '1px dashed rgba(239,68,68,0.5)'
              : '1px dashed rgba(92,61,30,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: clickable ? 'pointer' : 'default',
          transition: 'border-color 0.15s, background 0.15s',
          padding: '3px',
        }}
      >
        {filled ? (
          <GameImage
            src={imgUrl!}
            fallback={getFallbackUrl('tackle')}
            alt={slot.name!}
            className="w-full h-full object-contain"
          />
        ) : (
          <span style={{ fontSize: '0.7rem', opacity: 0.4 }}>{TYPE_ICONS[slot.type] || '?'}</span>
        )}
      </div>
    )
  }

  // size === 'normal'
  return (
    <div
      onClick={clickable ? onClick : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '8px 10px',
        background: filled ? 'rgba(13,31,13,0.4)' : 'rgba(13,31,13,0.15)',
        border: filled
          ? '1px solid rgba(92,61,30,0.45)'
          : required
            ? '1px dashed rgba(239,68,68,0.5)'
            : '1px dashed rgba(92,61,30,0.3)',
        borderRadius: '8px',
        cursor: clickable ? 'pointer' : 'default',
        transition: 'border-color 0.15s, background 0.15s',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {/* Иконка */}
      <div style={{
        width: `${imgSize}px`, height: `${imgSize}px`, flexShrink: 0,
        background: 'rgba(7,18,7,0.5)', borderRadius: '7px',
        border: '1px solid rgba(74,49,24,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '3px',
      }}>
        {filled ? (
          <GameImage
            src={imgUrl!}
            fallback={getFallbackUrl('tackle')}
            alt={slot.name!}
            className="w-full h-full object-contain"
          />
        ) : (
          <span style={{ fontSize: '1rem', opacity: 0.35 }}>{TYPE_ICONS[slot.type] || '?'}</span>
        )}
      </div>

      {/* Текст */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.62rem', color: '#5c3d1e', textTransform: 'uppercase',
          letterSpacing: '0.05em', marginBottom: '1px',
        }}>
          {TYPE_LABELS[slot.type] || slot.type}
        </div>
        <div style={{
          fontFamily: 'Georgia, serif', fontSize: '0.78rem',
          color: filled ? '#d4c5a9' : '#5c3d1e',
          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
        }}>
          {filled ? slot.name : 'Пусто'}
        </div>
        {filled && slot.type === 'bait' && slot.remaining !== undefined && (
          <div style={{
            fontSize: '0.6rem', marginTop: '1px',
            color: slot.remaining < 5 ? '#f87171' : '#8b6d3f',
          }}>
            Осталось: {slot.remaining}
          </div>
        )}
      </div>

      {/* Стрелка — кликабельный */}
      {clickable && (
        <span style={{ color: '#5c3d1e', fontSize: '0.75rem', flexShrink: 0 }}>&#x25B8;</span>
      )}
    </div>
  )
}
