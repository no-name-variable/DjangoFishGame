/**
 * Визуальный док выбора удочек — 3 слота вместо dropdown.
 * Отображает заброшенные удочки с цветовой индикацией состояния.
 */
import { useState } from 'react'
import type { SessionInfo, FightInfo } from '../../store/fishingStore'
import type { FullRod } from './TacklePanel'

interface RodDockProps {
  sessions: SessionInfo[]
  fights: Record<number, FightInfo>
  activeSessionId: number | null
  availableRods: FullRod[]
  selectedRodId: number | null
  onSessionClick: (id: number) => void
  onSelectRod: (id: number) => void
}

const MAX_SLOTS = 3

const rodClassLabel: Record<string, string> = {
  float: 'Попл.',
  bottom: 'Донн.',
  feeder: 'Фидер',
  match: 'Матч.',
}

const stateLabel: Record<string, string> = {
  waiting: 'Заброшена',
  nibble: 'Подёргивает...',
  bite: 'ПОКЛЁВКА!',
  fighting: 'Вываживание',
  caught: 'Поймана!',
}

/** Цвета рамки по состоянию */
function slotBorderClass(state: string, isActive: boolean): string {
  const base = isActive ? 'ring-2 ring-wood-300/60' : ''
  switch (state) {
    case 'nibble': return `border-orange-500 ${base}`
    case 'bite': return `border-red-500 ${base}`
    case 'fighting': return `border-yellow-500 ${base}`
    case 'caught': return `border-green-500 ${base}`
    default: return `border-water-600 ${base}`
  }
}

/** Мини-бар натяжения для fighting */
function TensionMiniBar({ tension }: { tension: number }) {
  const pct = Math.min(100, tension)
  const color = pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-yellow-500' : 'bg-green-500'
  return (
    <div className="h-1 w-full bg-wood-800/60 rounded-full mt-1">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

/** Один слот — сессия или пустой */
function RodSlot({
  session, fight, isActive, onClick,
}: {
  session?: SessionInfo
  fight?: FightInfo
  isActive: boolean
  onClick: () => void
}) {
  if (!session) {
    // Пустой слот
    return (
      <button
        onClick={onClick}
        className="flex-1 px-2 py-1.5 rounded border-2 border-dashed border-wood-700/50
          bg-wood-800/20 hover:bg-wood-800/40 hover:border-wood-600/60
          transition-all flex items-center justify-center gap-1 min-w-0"
      >
        <span className="text-wood-600 text-sm">+</span>
        <span className="text-wood-600 text-[10px] truncate">Удочка</span>
      </button>
    )
  }

  const borderClass = slotBorderClass(session.state, isActive)
  const isNibble = session.state === 'nibble'
  const isBite = session.state === 'bite'
  const isFighting = session.state === 'fighting'

  return (
    <button
      onClick={onClick}
      className={`flex-1 px-2 py-1.5 rounded border-2 transition-all min-w-0
        ${borderClass}
        ${isBite ? 'animate-pulse' : ''}
        ${isActive
          ? 'bg-wood-700/60'
          : 'bg-wood-800/40 hover:bg-wood-700/40 opacity-70'
        }`}
    >
      <div className="font-serif truncate text-wood-200 text-xs">
        #{session.slot} {session.rodName}
      </div>
      <div className={`text-[10px] mt-0.5 truncate ${
        isBite ? 'text-red-400 font-bold' :
        isNibble ? 'text-orange-400' :
        isFighting ? 'text-yellow-400' :
        'text-wood-400'
      }`}>
        {stateLabel[session.state] || session.state}
        {session.hookedSpeciesName && ` — ${session.hookedSpeciesName}`}
      </div>
      {isFighting && fight && <TensionMiniBar tension={fight.tension} />}
    </button>
  )
}

/** Слот выбранной незаброшенной удочки */
function SelectedRodSlot({ rod, onClick }: { rod: FullRod; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 px-2 py-1.5 rounded border-2 border-wood-500/60 bg-wood-700/40
        ring-2 ring-wood-300/40 transition-all min-w-0"
    >
      <div className="font-serif truncate text-wood-200 text-xs">
        {rod.display_name}
      </div>
      <div className="text-[10px] mt-0.5 text-water-400 truncate">
        Готова к забросу
      </div>
    </button>
  )
}

/** Цвет прочности для пикера */
function durabilityBadge(d: number) {
  if (d > 60) return 'text-green-400'
  if (d > 30) return 'text-yellow-400'
  return 'text-red-400'
}

/** Попап выбора удочки */
function RodPicker({
  rods, selectedRodId, onSelect, onClose,
}: {
  rods: FullRod[]
  selectedRodId: number | null
  onSelect: (id: number) => void
  onClose: () => void
}) {
  if (rods.length === 0) {
    return (
      <div className="absolute bottom-full left-0 right-0 mb-1 p-2 bg-wood-900/95
        border border-wood-700/60 rounded shadow-lg z-10">
        <p className="text-wood-500 text-xs text-center">Нет доступных удочек</p>
      </div>
    )
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-wood-900/95
      border border-wood-700/60 rounded shadow-lg z-10 max-h-48 overflow-y-auto">
      {rods.map((r) => (
        <button
          key={r.id}
          onClick={() => { onSelect(r.id); onClose() }}
          className={`w-full px-3 py-2 text-left hover:bg-wood-700/40 transition-colors
            border-b border-wood-800/40 last:border-0
            ${r.id === selectedRodId ? 'bg-wood-700/30' : ''}`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="text-wood-200 text-xs font-serif truncate">{r.display_name}</div>
            <span className={`text-[10px] ${durabilityBadge(r.durability_current)} shrink-0`}>
              {r.durability_current}%
            </span>
          </div>
          <div className="text-wood-500 text-[10px] flex gap-1.5 flex-wrap">
            <span>{rodClassLabel[r.rod_class] || r.rod_class}</span>
            {r.bait_name && <span>· {r.bait_name} ({r.bait_remaining})</span>}
          </div>
        </button>
      ))}
    </div>
  )
}

export default function RodDock({
  sessions, fights, activeSessionId,
  availableRods, selectedRodId,
  onSessionClick, onSelectRod,
}: RodDockProps) {
  const [pickerOpen, setPickerOpen] = useState(false)

  const canAddMore = sessions.length < MAX_SLOTS && availableRods.length > 0
  const selectedRod = availableRods.find((r) => r.id === selectedRodId)
  const hasNoRods = sessions.length === 0 && availableRods.length === 0

  return (
    <div className="p-2 border-b border-wood-700/40 relative">
      <div className="text-wood-500 text-[10px] mb-1 font-serif">Удочки:</div>

      {hasNoRods ? (
        <div className="text-wood-600 text-xs text-center py-2">Нет снастей</div>
      ) : (
        <div className="flex gap-1.5">
          {/* Слоты заброшенных удочек */}
          {sessions.map((s) => (
            <RodSlot
              key={s.id}
              session={s}
              fight={fights[s.id]}
              isActive={s.id === activeSessionId}
              onClick={() => onSessionClick(s.id)}
            />
          ))}

          {/* Выбранная незаброшенная удочка */}
          {selectedRod && canAddMore && (
            <SelectedRodSlot
              rod={selectedRod}
              onClick={() => setPickerOpen(!pickerOpen)}
            />
          )}

          {/* Пустой слот для добавления (когда удочка не выбрана) */}
          {canAddMore && !selectedRod && (
            <RodSlot
              isActive={false}
              onClick={() => setPickerOpen(!pickerOpen)}
            />
          )}
        </div>
      )}

      {/* Оверлей для закрытия пикера по клику вне */}
      {pickerOpen && (
        <div className="fixed inset-0 z-[5]" onClick={() => setPickerOpen(false)} />
      )}

      {/* Попап выбора удочки */}
      {pickerOpen && (
        <RodPicker
          rods={availableRods}
          selectedRodId={selectedRodId}
          onSelect={(id) => { onSelectRod(id); setPickerOpen(false) }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {/* Подсказка при пустом состоянии */}
      {sessions.length === 0 && availableRods.length > 0 && !pickerOpen && !selectedRod && (
        <p className="text-wood-500 text-[10px] mt-1 text-center">
          Выберите удочку и кликните по воде
        </p>
      )}
    </div>
  )
}
