/**
 * Правая панель рыбалки — слоты удочек, выбор снасти, действия, вываживание, чат.
 */
import { useCallback, useRef, useState } from 'react'
import FightBar from './FightBar'
import ChatWindow from '../chat/ChatWindow'
import RodDock from './RodDock'
import TackleChangePanel from './TackleChangePanel'
import type { SessionInfo, FightInfo } from '../../store/fishingStore'

export interface FullRod {
  id: number
  rod_type_name: string
  display_name: string
  custom_name: string
  rod_class: string
  reel_name: string | null
  line_name: string | null
  hook_name: string | null
  float_name: string | null
  lure_name: string | null
  bait_name: string | null
  bait_remaining: number
  durability_current: number
  is_ready: boolean
  depth_setting: number
  retrieve_speed: number
}

interface TacklePanelProps {
  rods: FullRod[]
  availableRods: FullRod[]
  selectedRodId: number | null
  onSelectRod: (id: number) => void
  sessions: SessionInfo[]
  fights: Record<number, FightInfo>
  activeSessionId: number | null
  activeSession: SessionInfo | null
  activeFight: FightInfo | null
  onSessionClick: (id: number) => void
  onStrike: () => void
  onReelIn: () => void
  onPull: () => void
  onRetrieve: (sessionId: number) => void
  onLeave: () => void
  onUpdateSettings: (rodId: number, settings: { depth_setting?: number; retrieve_speed?: number }) => void
  onChangeTackle: (rodId: number, updatedRod: FullRod) => void
  message: string
  chatChannelId: number | null
}

const rodClassLabel: Record<string, string> = {
  float: 'Поплавочная',
  spinning: 'Спиннинг',
  bottom: 'Донная',
  feeder: 'Фидер',
  match: 'Матчевая',
}

function TackleRow({ label, value, valueClass }: {
  label: string
  value: string | number | null
  valueClass?: string
}) {
  if (!value && value !== 0) return null
  return (
    <>
      <span className="text-wood-500 text-xs">{label}:</span>
      <span className={`text-xs ${valueClass || 'text-wood-200'}`}>{value}</span>
    </>
  )
}

function durabilityColor(d: number) {
  if (d > 60) return 'text-green-400'
  if (d > 30) return 'text-yellow-400'
  return 'text-red-400'
}

/** Слайдер глубины / проводки с debounce */
function SettingSlider({ label, value, min, max, step, disabled, onChange }: {
  label: string
  value: number
  min: number
  max: number
  step: number
  disabled: boolean
  onChange: (v: number) => void
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [localValue, setLocalValue] = useState(value)

  // Синхронизация при изменении props (другая удочка выбрана)
  const prevValueRef = useRef(value)
  if (prevValueRef.current !== value) {
    prevValueRef.current = value
    setLocalValue(value)
  }

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value)
    setLocalValue(v)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onChange(v), 300)
  }, [onChange])

  return (
    <>
      <span className="text-wood-500 text-xs">{label}:</span>
      <div className="flex items-center gap-1.5">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localValue}
          disabled={disabled}
          onChange={handleChange}
          className="flex-1 h-1 accent-water-500 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        />
        <span className="text-xs text-wood-200 w-8 text-right tabular-nums">
          {step < 1 ? localValue.toFixed(1) : localValue}
          {label === 'Глубина' ? 'м' : ''}
        </span>
      </div>
    </>
  )
}

export default function TacklePanel({
  rods, availableRods, selectedRodId, onSelectRod,
  sessions, fights, activeSessionId, activeSession, activeFight,
  onSessionClick, onStrike, onReelIn, onPull, onRetrieve,
  onLeave, onUpdateSettings, onChangeTackle, message, chatChannelId,
}: TacklePanelProps) {
  const [tackleChangeRodId, setTackleChangeRodId] = useState<number | null>(null)

  // Детали снасти: из активной сессии или выбранной удочки
  const activeRod = activeSession
    ? rods.find((r) => r.id === activeSession.rodId)
    : rods.find((r) => r.id === selectedRodId)

  // Слайдеры заблокированы во время bite/fighting/caught
  const slidersDisabled = !!activeSession && ['bite', 'fighting', 'caught'].includes(activeSession.state)

  // Удочка в воде — нельзя менять снасть
  const rodInWater = activeRod
    ? sessions.some((s) => s.rodId === activeRod.id)
    : false

  // Показывать глубину: поплавочная, донная, фидер, матчевая
  const showDepth = activeRod && activeRod.rod_class !== 'spinning'
  // Показывать проводку: спиннинг
  const showRetrieve = activeRod?.rod_class === 'spinning'

  return (
    <div className="wood-panel flex flex-col h-full overflow-hidden">
      {/* Док удочек — слоты с визуальным выбором */}
      <RodDock
        sessions={sessions}
        fights={fights}
        activeSessionId={activeSessionId}
        availableRods={availableRods}
        selectedRodId={selectedRodId}
        onSessionClick={onSessionClick}
        onSelectRod={onSelectRod}
      />

      {/* Детали снасти */}
      {activeRod && (
        <div className="p-2 border-b border-wood-700/40 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
          <TackleRow label="Класс" value={rodClassLabel[activeRod.rod_class] || activeRod.rod_class} />
          <TackleRow label="Катушка" value={activeRod.reel_name} />
          <TackleRow label="Леска" value={activeRod.line_name} />
          <TackleRow label="Крючок" value={activeRod.hook_name} />
          {activeRod.float_name && <TackleRow label="Поплавок" value={activeRod.float_name} />}
          {activeRod.lure_name && <TackleRow label="Приманка" value={activeRod.lure_name} />}
          {activeRod.bait_name && (
            <TackleRow
              label="Наживка"
              value={`${activeRod.bait_name} (${activeRod.bait_remaining})`}
              valueClass={activeRod.bait_remaining < 5 ? 'text-xs text-red-400' : 'text-xs text-wood-200'}
            />
          )}

          {/* Слайдер глубины */}
          {showDepth && (
            <SettingSlider
              label="Глубина"
              value={activeRod.depth_setting}
              min={0.1}
              max={10}
              step={0.1}
              disabled={slidersDisabled}
              onChange={(v) => onUpdateSettings(activeRod.id, { depth_setting: v })}
            />
          )}

          {/* Слайдер проводки */}
          {showRetrieve && (
            <SettingSlider
              label="Проводка"
              value={activeRod.retrieve_speed}
              min={1}
              max={10}
              step={1}
              disabled={slidersDisabled}
              onChange={(v) => onUpdateSettings(activeRod.id, { retrieve_speed: v })}
            />
          )}

          <TackleRow
            label="Прочность"
            value={`${activeRod.durability_current}%`}
            valueClass={`text-xs ${durabilityColor(activeRod.durability_current)}`}
          />

          {/* Кнопка смены снасти */}
          {!rodInWater && (
            <div className="col-span-2 mt-1">
              <button
                onClick={() => setTackleChangeRodId(
                  tackleChangeRodId === activeRod.id ? null : activeRod.id,
                )}
                className="btn btn-secondary text-[10px] w-full py-0.5"
              >
                {tackleChangeRodId === activeRod.id ? 'Скрыть' : 'Сменить снасть'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Панель смены компонентов */}
      {tackleChangeRodId && activeRod && tackleChangeRodId === activeRod.id && (
        <TackleChangePanel
          rod={activeRod}
          onApply={(rodId, updatedRod) => {
            onChangeTackle(rodId, updatedRod)
            setTackleChangeRodId(null)
          }}
          onClose={() => setTackleChangeRodId(null)}
        />
      )}

      {/* Статус + кнопки действий */}
      <div className="p-2 border-b border-wood-700/40 space-y-2">
        {message && (
          <p className="text-wood-300 text-xs text-center">{message}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {/* Нет сессий и есть удочки = подсказка */}
          {sessions.length === 0 && rods.length > 0 && (
            <span className="text-wood-500 text-sm font-serif py-1 w-full text-center">
              Кликните по воде для заброса
            </span>
          )}

          {/* Нет снастей */}
          {rods.length === 0 && (
            <span className="text-wood-500 text-xs">Нет готовых снастей</span>
          )}

          {/* Ожидание поклёвки — показываем для активной сессии или единственной */}
          {(() => {
            const waitingSession = activeSession?.state === 'waiting'
              ? activeSession
              : sessions.length === 1 && sessions[0].state === 'waiting'
                ? sessions[0]
                : null
            if (!waitingSession) return null
            return (
              <div className="w-full flex gap-2">
                <span className="text-wood-500 text-sm font-serif animate-pulse py-1 flex-1 text-center">
                  Ожидание поклёвки...
                </span>
                <button
                  onClick={() => onRetrieve(waitingSession.id)}
                  className="btn btn-secondary text-xs"
                >
                  Вытащить
                </button>
              </div>
            )
          })()}

          {/* Поклёвка */}
          {activeSession?.state === 'bite' && (
            <button
              onClick={onStrike}
              className="btn bg-red-800 hover:bg-red-700 text-white border-red-600 animate-pulse flex-1 text-sm"
            >
              ПОДСЕЧКА! [Space]
            </button>
          )}

          {/* Вываживание */}
          {activeSession?.state === 'fighting' && (
            <>
              <button onClick={onReelIn} className="btn btn-primary flex-1 text-sm">
                Подмотка [G]
              </button>
              <button onClick={onPull} className="btn btn-action flex-1 text-sm">
                Подтяжка [H]
              </button>
            </>
          )}
        </div>
      </div>

      {/* FightBar при вываживании */}
      {activeSession?.state === 'fighting' && activeFight && (
        <div className="border-b border-wood-700/40">
          <FightBar
            tension={activeFight.tension}
            distance={activeFight.distance}
            rodDurability={activeFight.rodDurability}
          />
        </div>
      )}

      {/* Чат */}
      {chatChannelId && (
        <div className="flex-1 min-h-0 p-2">
          <ChatWindow
            channelType="location"
            channelId={chatChannelId}
            className="h-full"
          />
        </div>
      )}

      {/* Кнопка выхода */}
      <div className="p-2 border-t border-wood-700/40 mt-auto">
        <button onClick={onLeave} className="btn btn-secondary w-full text-xs">
          На базу
        </button>
      </div>
    </div>
  )
}
