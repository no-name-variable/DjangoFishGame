/**
 * Правая панель рыбалки — слоты удочек, выбор снасти, действия, вываживание, чат.
 */
import { useCallback, useRef, useState, type ChangeEvent } from 'react'
import FightBar from './FightBar'
import ChatWindow from '../chat/ChatWindow'
import PlayerList from '../chat/PlayerList'
import RodDock from './RodDock'
import TackleChangePanel from './TackleChangePanel'
import TackleSlot, { type TackleSlotData } from '../inventory/TackleSlot'
import type { SessionInfo, FightInfo } from '../../store/fishingStore'

export interface FullRod {
  id: number
  rod_type?: number
  rod_type_name: string
  display_name: string
  custom_name: string
  rod_class: string
  reel?: number | null
  reel_name: string | null
  line?: number | null
  line_name: string | null
  hook?: number | null
  hook_name: string | null
  float_tackle?: number | null
  float_name: string | null
  bait?: number | null
  bait_name: string | null
  bait_remaining: number
  durability_current: number
  is_ready: boolean
  depth_setting: number
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
  onKeep: () => void
  onRelease: () => void
  onRetrieve: (sessionId: number) => void
  onLeave: () => void
  onUpdateSettings: (rodId: number, settings: { depth_setting?: number }) => void
  onChangeTackle: (rodId: number, updatedRod: FullRod) => void
  onMessage?: (msg: string) => void
  message: string
  chatChannelId: number | null
}

const rodClassLabel: Record<string, string> = {
  float: '🪣 Поплавочная',
  bottom: '⚓ Донная',
  feeder: '🔲 Фидер',
  match: '🎯 Матчевая',
}

/** Компактные слоты снасти для панели */
function buildTackleSlots(rod: FullRod): TackleSlotData[] {
  const slots: TackleSlotData[] = [
    { type: 'reel', itemId: rod.reel ?? null, name: rod.reel_name },
    { type: 'line', itemId: rod.line ?? null, name: rod.line_name },
    { type: 'hook', itemId: rod.hook ?? null, name: rod.hook_name },
  ]
  if (rod.rod_class === 'float') {
    slots.push({ type: 'floattackle', itemId: rod.float_tackle ?? null, name: rod.float_name })
  }
  slots.push({ type: 'bait', itemId: rod.bait ?? null, name: rod.bait_name, remaining: rod.bait_remaining })
  return slots
}

function durabilityColor(d: number): string {
  if (d > 60) return '#4ade80'
  if (d > 30) return '#facc15'
  return '#f87171'
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

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value)
    setLocalValue(v)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onChange(v), 300)
  }, [onChange])

  return (
    <>
      <span className="text-wood-300 text-xs">{label}:</span>
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
          {(label === 'Глубина' || label === 'Клипса') ? 'м' : ''}
        </span>
      </div>
    </>
  )
}

export default function TacklePanel({
  rods, availableRods, selectedRodId, onSelectRod,
  sessions, fights, activeSessionId, activeSession, activeFight,
  onSessionClick, onStrike, onReelIn, onPull, onKeep, onRelease, onRetrieve,
  onLeave, onUpdateSettings, onChangeTackle, message, chatChannelId,
}: TacklePanelProps) {
  const [tackleChangeRodId, setTackleChangeRodId] = useState<number | null>(null)
  const [chatTab, setChatTab] = useState<'chat' | 'players'>('chat')
  const [playerCount, setPlayerCount] = useState(0)

  // Детали снасти: из активной сессии или выбранной удочки
  const activeRod = activeSession
    ? rods.find((r) => r.id === activeSession.rodId)
    : rods.find((r) => r.id === selectedRodId)

  // Слайдеры заблокированы во время nibble/bite/fighting/caught
  const slidersDisabled = !!activeSession && ['nibble', 'bite', 'fighting', 'caught'].includes(activeSession.state)

  // Удочка в воде — нельзя менять снасть
  const rodInWater = activeRod
    ? sessions.some((s) => s.rodId === activeRod.id)
    : false

  const showDepth = !!activeRod

  // Состояние подсечки: ищем bite/nibble среди ВСЕХ сессий
  const anyBite = sessions.find((s) => s.state === 'bite')
  const anyNibble = sessions.find((s) => s.state === 'nibble')
  const strikeState: 'bite' | 'nibble' | 'idle' = anyBite ? 'bite' : anyNibble ? 'nibble' : 'idle'

  /* Тип сообщения для цветового кодирования */
  const msgIsError = message.startsWith('⚠') || message.includes('Обрыв') || message.includes('сломал') || message.includes('Ошибка')
  const msgIsSuccess = message.startsWith('✅') || message.includes('садке') || message.includes('Заброс') || message.includes('Отпущена')

  return (
    <div className="wood-panel flex flex-col lg:h-full lg:overflow-hidden">
      {/* Dok удочек — слоты с визуальным выбором */}
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
        <div className="p-2 border-b border-wood-700/40 overflow-y-auto" style={{ maxHeight: '185px' }}>
          {/* Заголовок: класс + прочность */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.68rem', color: '#c0a87a', fontFamily: 'Georgia, serif' }}>
              {rodClassLabel[activeRod.rod_class] || activeRod.rod_class}
            </span>
            <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: durabilityColor(activeRod.durability_current) }}>
              {activeRod.durability_current}%
            </span>
          </div>

          {/* Мини-бар прочности */}
          <div style={{ height: '2px', background: 'rgba(92,61,30,0.3)', borderRadius: '2px', marginBottom: '5px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '2px',
              width: `${activeRod.durability_current}%`,
              background: durabilityColor(activeRod.durability_current),
              transition: 'width 0.3s ease',
            }} />
          </div>

          {/* Компактные слоты снастей */}
          <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginBottom: '5px' }}>
            {buildTackleSlots(activeRod).map((slot, i) => (
              <TackleSlot key={i} slot={slot} size="compact" />
            ))}
          </div>

          {/* Слайдеры */}
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
            {showDepth && (
              <SettingSlider
                label="Глубина"
                value={activeRod.depth_setting}
                min={0.1} max={10} step={0.1}
                disabled={slidersDisabled}
                onChange={(v) => onUpdateSettings(activeRod.id, { depth_setting: v })}
              />
            )}

          </div>

          {/* Кнопка смены снасти */}
          {!rodInWater && (
            <div className="mt-1">
              <button
                onClick={() => setTackleChangeRodId(tackleChangeRodId === activeRod.id ? null : activeRod.id)}
                className="btn btn-secondary text-[10px] w-full py-0.5"
              >
                {tackleChangeRodId === activeRod.id ? '✖ Скрыть' : '🔧 Сменить снасть'}
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

      {/* ─── Статус + кнопки действий ─── */}
      <div className="p-2 border-b border-wood-700/40 space-y-2">
        {/* Сообщение — цветной баннер */}
        {message && (
          <div style={{
            padding: '4px 8px', borderRadius: '6px', fontSize: '0.72rem',
            textAlign: 'center', lineHeight: 1.35,
            background: msgIsError ? 'rgba(220,38,38,0.12)' : msgIsSuccess ? 'rgba(22,101,52,0.18)' : 'rgba(92,61,30,0.2)',
            color: msgIsError ? '#f87171' : msgIsSuccess ? '#4ade80' : '#d4c5a9',
            border: `1px solid ${msgIsError ? 'rgba(220,38,38,0.2)' : msgIsSuccess ? 'rgba(74,222,128,0.2)' : 'rgba(92,61,30,0.25)'}`,
          }}>
            {message}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {/* Нет сессий и есть удочки = подсказка */}
          {sessions.length === 0 && rods.length > 0 && (
            <span className="text-wood-300 text-sm font-serif py-1 w-full text-center">
              🎣 Кликните по воде для заброса
            </span>
          )}

          {/* Нет снастей */}
          {rods.length === 0 && (
            <span className="text-wood-300 text-xs">Нет готовых снастей</span>
          )}

          {/* Кнопка подсечки — меняет вид по состоянию */}
          {sessions.length > 0 && (
            <button
              onClick={onStrike}
              className={`btn w-full ${strikeState === 'bite' ? 'animate-pulse' : ''}`}
              style={{
                minHeight: '48px', fontSize: strikeState === 'bite' ? '1.1rem' : '0.95rem',
                fontFamily: 'Georgia, serif', letterSpacing: '0.04em',
                transition: 'all 0.2s ease',
                ...(strikeState === 'bite' ? {
                  background: 'linear-gradient(135deg, rgba(220,38,38,0.5), rgba(185,28,28,0.3))',
                  borderColor: '#ef4444',
                  color: '#fecaca',
                  boxShadow: '0 0 16px rgba(239,68,68,0.4)',
                } : strikeState === 'nibble' ? {
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.3), rgba(217,119,6,0.15))',
                  borderColor: 'rgba(245,158,11,0.5)',
                  color: '#fde68a',
                } : {
                  background: 'linear-gradient(135deg, rgba(92,61,30,0.35), rgba(92,61,30,0.15))',
                  borderColor: 'rgba(92,61,30,0.5)',
                  color: '#e2d3b6',
                }),
              }}
              title={strikeState === 'bite' ? 'Подсекай! [Пробел]'
                : strikeState === 'nibble' ? 'Подёргивает — ждите поклёвку'
                : 'Подсечь [Пробел]'}
            >
              {strikeState === 'bite' ? '🔥 ПОДСЕЧЬ!' :
               strikeState === 'nibble' ? '🐟 Подёргивает...' :
               '✦ Подсечь'}
            </button>
          )}

          {/* ─── Подёргивание (nibble) ─── */}
          {(() => {
            const nibbleSession = activeSession?.state === 'nibble'
              ? activeSession
              : sessions.length === 1 && sessions[0].state === 'nibble'
                ? sessions[0]
                : null
            if (!nibbleSession) return null
            return (
              <div className="w-full flex flex-col gap-1">
                <div style={{
                  textAlign: 'center', fontSize: '0.82rem',
                  fontFamily: 'Georgia, serif', color: '#f59e0b',
                  animation: 'pulse 1.2s ease-in-out infinite',
                  padding: '6px 8px', borderRadius: '8px',
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.2)',
                }}>
                  🐟 Подёргивает... Ждите поклёвку!
                </div>
              </div>
            )
          })()}

          {/* ─── Ожидание поклёвки ─── */}
          {(() => {
            const waitingSession = activeSession?.state === 'waiting'
              ? activeSession
              : sessions.length === 1 && sessions[0].state === 'waiting'
                ? sessions[0]
                : null
            if (!waitingSession) return null
            return (
              <div className="w-full flex flex-col gap-2">
                <span className="text-wood-300 text-sm font-serif animate-pulse py-1 text-center">
                  ⏳ Ожидание поклёвки...
                </span>

                <button
                  onClick={() => onRetrieve(waitingSession.id)}
                  className="btn btn-secondary text-xs"
                  style={{ minHeight: '36px' }}
                >
                  Вытащить
                </button>
              </div>
            )
          })()}

          {/* ─── Рыба поймана (caught без модала) ─── */}
          {activeSession?.state === 'caught' && (
            <div className="w-full flex flex-col gap-1.5">
              <div style={{
                textAlign: 'center', fontSize: '0.78rem',
                fontFamily: 'Georgia, serif', color: '#4ade80',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}>
                🎉 {activeSession.hookedSpeciesName || 'Рыба'} поймана!
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={onKeep}
                  className="btn btn-primary flex-1"
                  style={{ minHeight: '44px', fontSize: '0.85rem' }}
                >
                  🪣 В садок
                </button>
                <button
                  onClick={onRelease}
                  className="btn btn-secondary flex-1"
                  style={{ minHeight: '44px', fontSize: '0.85rem' }}
                >
                  🌊 Отпустить
                </button>
              </div>
            </div>
          )}

          {/* ─── Вываживание ─── */}
          {activeSession?.state === 'fighting' && (
            <>
              <button
                onClick={onReelIn}
                className="btn btn-primary flex-1"
                style={{ minHeight: '48px', fontSize: '0.9rem' }}
              >
                🎣 Подмотка [G]
              </button>
              <button
                onClick={onPull}
                className="btn btn-action flex-1"
                style={{ minHeight: '48px', fontSize: '0.9rem' }}
              >
                💪 Подтяжка [H]
              </button>
            </>
          )}
        </div>
      </div>

      {/* ─── FightBar при вываживании ─── */}
      {activeSession?.state === 'fighting' && activeFight && (
        <div className="border-b border-wood-700/40">
          <FightBar
            tension={activeFight.tension}
            distance={activeFight.distance}
            rodDurability={activeFight.rodDurability}
          />
        </div>
      )}

      {/* ─── Чат / Игроки ─── */}
      {chatChannelId && (
        <div className="flex-1 min-h-[200px] lg:min-h-0 flex flex-col">
          <div className="flex border-b border-wood-700/40">
            <button
              onClick={() => setChatTab('chat')}
              style={{
                flex: 1, fontSize: '0.72rem', padding: '7px 4px',
                fontFamily: 'Georgia, serif', background: 'none',
                borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer',
                borderBottom: chatTab === 'chat' ? '2px solid #7898b8' : '2px solid transparent',
                color: chatTab === 'chat' ? '#d4c5a9' : '#a8894e',
              }}
            >
              💬 Чат
            </button>
            <button
              onClick={() => setChatTab('players')}
              style={{
                flex: 1, fontSize: '0.72rem', padding: '7px 4px',
                fontFamily: 'Georgia, serif', background: 'none',
                borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer',
                borderBottom: chatTab === 'players' ? '2px solid #7898b8' : '2px solid transparent',
                color: chatTab === 'players' ? '#d4c5a9' : '#a8894e',
              }}
            >
              👥 Игроки{playerCount > 0 ? ` (${playerCount})` : ''}
            </button>
          </div>
          <div className="flex-1 min-h-0 p-2">
            {chatTab === 'chat' ? (
              <ChatWindow channelType="location" channelId={chatChannelId} className="h-full" />
            ) : (
              <PlayerList locationId={chatChannelId} onCountChange={setPlayerCount} className="h-full" />
            )}
          </div>
        </div>
      )}

      {/* ─── Кнопка выхода ─── */}
      <div className="p-2 border-t border-wood-700/40 mt-auto">
        <button onClick={onLeave} className="btn btn-secondary w-full text-xs" style={{ minHeight: '36px' }}>
          🏠 На базу
        </button>
      </div>
    </div>
  )
}
