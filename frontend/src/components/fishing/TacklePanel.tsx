/**
 * Правая панель рыбалки — слоты удочек, выбор снасти, действия, вываживание, чат.
 */
import { useCallback, useRef, useState, type ChangeEvent } from 'react'
import FightBar from './FightBar'
import ChatWindow from '../chat/ChatWindow'
import PlayerList from '../chat/PlayerList'
import RodDock from './RodDock'
import TackleChangePanel from './TackleChangePanel'
import BaitChangeButton from './BaitChangeButton'
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
  onStartRetrieve?: (sessionId: number) => void
  onStopRetrieve?: (sessionId: number) => void
  onLeave: () => void
  onUpdateSettings: (rodId: number, settings: { depth_setting?: number; retrieve_speed?: number }) => void
  onChangeTackle: (rodId: number, updatedRod: FullRod) => void
  onMessage?: (msg: string) => void
  message: string
  chatChannelId: number | null
}

const rodClassLabel: Record<string, string> = {
  float: '🪣 Поплавочная',
  spinning: '🌀 Спиннинг',
  bottom: '⚓ Донная',
  feeder: '🔲 Фидер',
  match: '🎯 Матчевая',
}

function TackleRow({ label, value, valueClass }: {
  label: string
  value: string | number | null
  valueClass?: string
}) {
  if (!value && value !== 0) return null
  return (
    <>
      <span style={{ fontSize: '0.65rem', color: '#6b5030' }}>{label}:</span>
      <span style={{ fontSize: '0.65rem' }} className={valueClass || 'text-wood-200'}>{value}</span>
    </>
  )
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
      <span style={{ fontSize: '0.65rem', color: '#6b5030' }}>{label}:</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
        <span style={{ fontSize: '0.65rem', color: '#d4c5a9', minWidth: '28px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
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
  onSessionClick, onStrike, onReelIn, onPull, onRetrieve,
  onStartRetrieve, onStopRetrieve,
  onLeave, onUpdateSettings, onChangeTackle, onMessage, message, chatChannelId,
}: TacklePanelProps) {
  const [tackleChangeRodId, setTackleChangeRodId] = useState<number | null>(null)
  const [chatTab, setChatTab] = useState<'chat' | 'players'>('chat')
  const [playerCount, setPlayerCount] = useState(0)

  const activeRod = activeSession
    ? rods.find((r) => r.id === activeSession.rodId)
    : rods.find((r) => r.id === selectedRodId)

  const slidersDisabled = !!activeSession && ['bite', 'fighting', 'caught'].includes(activeSession.state)

  const rodInWater = activeRod
    ? sessions.some((s) => s.rodId === activeRod.id)
    : false

  const showDepth = activeRod && activeRod.rod_class !== 'spinning'
  const showRetrieve = activeRod?.rod_class === 'spinning'

  /* Цвет сообщения */
  const msgIsError = message.startsWith('⚠') || message.includes('Обрыв') || message.includes('сломал') || message.includes('Ошибка')
  const msgIsSuccess = message.startsWith('✅') || message.includes('пойман') || message.includes('Заброс') || message.includes('отпущена')

  return (
    <div className="wood-panel flex flex-col h-full overflow-hidden">
      {/* Слоты удочек */}
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
        <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(92,61,30,0.3)' }}>
          {/* Заголовок снасти */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.7rem', color: '#8b6d3f', fontFamily: 'Georgia, serif' }}>
              {rodClassLabel[activeRod.rod_class] || activeRod.rod_class}
            </span>
            <span style={{ fontSize: '0.65rem', color: durabilityColor(activeRod.durability_current), fontWeight: 'bold' }}>
              {activeRod.durability_current}%
            </span>
          </div>

          {/* Мини-бар прочности */}
          <div style={{ height: '2px', background: 'rgba(92,61,30,0.3)', borderRadius: '2px', marginBottom: '6px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '2px',
              width: `${activeRod.durability_current}%`,
              background: durabilityColor(activeRod.durability_current),
              transition: 'width 0.3s ease',
            }} />
          </div>

          {/* Детали в 2 колонки */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 10px' }}>
            <TackleRow label="Катушка"  value={activeRod.reel_name} />
            <TackleRow label="Леска"    value={activeRod.line_name} />
            <TackleRow label="Крючок"   value={activeRod.hook_name} />
            {activeRod.float_name && <TackleRow label="Поплавок" value={activeRod.float_name} />}
            {activeRod.lure_name && <TackleRow label="Приманка" value={activeRod.lure_name} />}
            {activeRod.bait_name && (
              <>
                <span style={{ fontSize: '0.65rem', color: '#6b5030' }}>Наживка:</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                  <span style={{ fontSize: '0.65rem', color: activeRod.bait_remaining < 5 ? '#f87171' : '#d4c5a9' }}>
                    {activeRod.bait_name} ({activeRod.bait_remaining})
                  </span>
                  {activeSession?.state === 'waiting' && activeSession.rodId === activeRod.id && (
                    <BaitChangeButton
                      sessionId={activeSession.id}
                      currentBaitName={activeRod.bait_name}
                      onSuccess={(msg) => onMessage?.(msg)}
                    />
                  )}
                </div>
              </>
            )}

            {showDepth && (
              <SettingSlider
                label="Глубина"
                value={activeRod.depth_setting}
                min={0.1} max={10} step={0.1}
                disabled={slidersDisabled}
                onChange={(v) => onUpdateSettings(activeRod.id, { depth_setting: v })}
              />
            )}

            {showRetrieve && (
              <>
                <SettingSlider
                  label="Проводка"
                  value={activeRod.retrieve_speed}
                  min={1} max={10} step={1}
                  disabled={slidersDisabled}
                  onChange={(v) => onUpdateSettings(activeRod.id, { retrieve_speed: v })}
                />
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', fontSize: '0.6rem', lineHeight: 1.3 }}>
                  {activeRod.retrieve_speed >= 4 && activeRod.retrieve_speed <= 7 && (
                    <span style={{ color: '#4ade80' }}>✓ Оптимальная скорость (+20%)</span>
                  )}
                  {(activeRod.retrieve_speed <= 2 || activeRod.retrieve_speed >= 9) && (
                    <span style={{ color: '#f87171' }}>⚠ Слишком медленная/быстрая (-30%)</span>
                  )}
                  {(activeRod.retrieve_speed === 3 || activeRod.retrieve_speed === 8) && (
                    <span style={{ color: '#facc15' }}>~ Средняя скорость</span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Кнопка смены снасти */}
          {!rodInWater && (
            <button
              onClick={() => setTackleChangeRodId(tackleChangeRodId === activeRod.id ? null : activeRod.id)}
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '6px', fontSize: '0.65rem', minHeight: '28px', padding: '3px 8px' }}
            >
              {tackleChangeRodId === activeRod.id ? '✖ Скрыть' : '🔧 Сменить снасть'}
            </button>
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
      <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(92,61,30,0.3)', flexShrink: 0 }}>
        {/* Сообщение */}
        {message && (
          <div style={{
            padding: '5px 10px', borderRadius: '6px', marginBottom: '8px', fontSize: '0.72rem',
            textAlign: 'center', lineHeight: 1.35,
            background: msgIsError
              ? 'rgba(220,38,38,0.12)'
              : msgIsSuccess
                ? 'rgba(22,101,52,0.18)'
                : 'rgba(92,61,30,0.25)',
            color: msgIsError ? '#f87171' : msgIsSuccess ? '#4ade80' : '#d4c5a9',
            border: `1px solid ${msgIsError ? 'rgba(220,38,38,0.2)' : msgIsSuccess ? 'rgba(74,222,128,0.2)' : 'rgba(92,61,30,0.3)'}`,
          }}>
            {message}
          </div>
        )}

        {/* Нет снастей */}
        {rods.length === 0 && (
          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#5c3d1e', fontFamily: 'Georgia, serif', padding: '4px 0' }}>
            Нет готовых снастей. Соберите удочку в рюкзаке.
          </p>
        )}

        {/* Нет сессий — подсказка */}
        {sessions.length === 0 && rods.length > 0 && (
          <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#8b6d3f', fontFamily: 'Georgia, serif', padding: '4px 0', animation: 'pulse 2s infinite' }}>
            🎣 Кликните по воде для заброса
          </p>
        )}

        {/* Ожидание поклёвки */}
        {(() => {
          const waitingSession = activeSession?.state === 'waiting'
            ? activeSession
            : sessions.length === 1 && sessions[0].state === 'waiting'
              ? sessions[0]
              : null
          if (!waitingSession) return null
          const isSpinning = waitingSession.rodClass === 'spinning'
          const nearShore = isSpinning && waitingSession.retrieveProgress > 0.85
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {isSpinning ? (
                <>
                  {nearShore ? (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#facc15', fontSize: '0.72rem', marginBottom: '6px', animation: 'pulse 1.5s infinite' }}>
                        🎣 Приманка у берега!
                      </div>
                      <button
                        onClick={() => onRetrieve(waitingSession.id)}
                        className="btn"
                        style={{
                          width: '100%', minHeight: '44px', fontSize: '0.9rem',
                          background: 'rgba(133,77,14,0.5)', borderColor: '#92400e',
                          color: '#fde68a',
                        }}
                      >
                        🔄 Перезаброс
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onMouseDown={() => onStartRetrieve?.(waitingSession.id)}
                        onMouseUp={() => onStopRetrieve?.(waitingSession.id)}
                        onMouseLeave={() => onStopRetrieve?.(waitingSession.id)}
                        onTouchStart={(e) => { e.preventDefault(); onStartRetrieve?.(waitingSession.id) }}
                        onTouchEnd={(e) => { e.preventDefault(); onStopRetrieve?.(waitingSession.id) }}
                        className="btn"
                        style={{
                          width: '100%', minHeight: '48px', fontSize: '0.9rem',
                          transition: 'all 0.15s ease',
                          background: waitingSession.isRetrieving
                            ? 'rgba(2,132,199,0.5)' : 'rgba(12,74,110,0.4)',
                          borderColor: waitingSession.isRetrieving ? '#0369a1' : '#164e63',
                          color: waitingSession.isRetrieving ? '#e0f2fe' : '#7898b8',
                          boxShadow: waitingSession.isRetrieving ? '0 0 12px rgba(2,132,199,0.3)' : 'none',
                        }}
                      >
                        {waitingSession.isRetrieving ? '⚡ Проводка...' : '🎣 Зажмите для проводки [R]'}
                      </button>
                      {/* Прогресс подматывания */}
                      {waitingSession.retrieveProgress > 0.05 && (
                        <div style={{ height: '4px', background: 'rgba(12,74,110,0.4)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: '4px',
                            width: `${waitingSession.retrieveProgress * 100}%`,
                            background: 'linear-gradient(to right, #0369a1, #38bdf8)',
                            transition: 'width 0.3s ease',
                          }} />
                        </div>
                      )}
                      <p style={{ textAlign: 'center', fontSize: '0.6rem', color: '#4a3118' }}>
                        Рыба клюёт только во время проводки
                      </p>
                    </>
                  )}
                  {!nearShore && (
                    <button
                      onClick={() => onRetrieve(waitingSession.id)}
                      className="btn btn-secondary"
                      style={{ minHeight: '36px', fontSize: '0.75rem' }}
                    >
                      Вытащить
                    </button>
                  )}
                </>
              ) : (
                <>
                  <p style={{
                    textAlign: 'center', fontSize: '0.82rem', color: '#8b6d3f',
                    fontFamily: 'Georgia, serif', animation: 'pulse 2s infinite',
                  }}>
                    ⏳ Ожидание поклёвки...
                  </p>
                  <button
                    onClick={() => onRetrieve(waitingSession.id)}
                    className="btn btn-secondary"
                    style={{ minHeight: '36px', fontSize: '0.75rem' }}
                  >
                    Вытащить
                  </button>
                </>
              )}
            </div>
          )
        })()}

        {/* Поклёвка */}
        {activeSession?.state === 'bite' && (
          <button
            onClick={onStrike}
            className="btn"
            style={{
              width: '100%', minHeight: '52px', fontSize: '1.05rem',
              fontFamily: 'Georgia, serif', letterSpacing: '0.05em',
              background: 'rgba(185,28,28,0.5)', borderColor: '#b91c1c',
              color: '#fca5a5', animation: 'pulse 0.6s infinite',
              boxShadow: '0 0 20px rgba(220,38,38,0.4)',
            }}
          >
            ⚡ ПОДСЕЧКА! [Space]
          </button>
        )}

        {/* Вываживание */}
        {activeSession?.state === 'fighting' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onReelIn}
              className="btn btn-primary"
              style={{ flex: 1, minHeight: '48px', fontSize: '0.9rem' }}
            >
              🎣 Подмотка [G]
            </button>
            <button
              onClick={onPull}
              className="btn btn-action"
              style={{ flex: 1, minHeight: '48px', fontSize: '0.9rem' }}
            >
              💪 Подтяжка [H]
            </button>
          </div>
        )}
      </div>

      {/* FightBar */}
      {activeSession?.state === 'fighting' && activeFight && (
        <div style={{ borderBottom: '1px solid rgba(92,61,30,0.3)' }}>
          <FightBar
            tension={activeFight.tension}
            distance={activeFight.distance}
            rodDurability={activeFight.rodDurability}
          />
        </div>
      )}

      {/* Чат / Игроки */}
      {chatChannelId && (
        <div className="flex-1 min-h-0 flex flex-col">
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(92,61,30,0.3)' }}>
            {(['chat', 'players'] as const).map((tab) => {
              const isActive = chatTab === tab
              return (
                <button
                  key={tab}
                  onClick={() => setChatTab(tab)}
                  style={{
                    flex: 1, fontSize: '0.72rem', padding: '7px 4px',
                    fontFamily: 'Georgia, serif', transition: 'color 0.15s ease',
                    background: 'none', outline: 'none', cursor: 'pointer',
                    borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                    borderBottom: isActive ? '2px solid #7898b8' : '2px solid transparent',
                    color: isActive ? '#d4c5a9' : '#5c3d1e',
                  }}
                >
                  {tab === 'chat' ? '💬 Чат' : `👥 Игроки${playerCount > 0 ? ` (${playerCount})` : ''}`}
                </button>
              )
            })}
          </div>
          <div style={{ flex: 1, minHeight: 0, padding: '6px' }}>
            {chatTab === 'chat' ? (
              <ChatWindow channelType="location" channelId={chatChannelId} className="h-full" />
            ) : (
              <PlayerList locationId={chatChannelId} onCountChange={setPlayerCount} className="h-full" />
            )}
          </div>
        </div>
      )}

      {/* Кнопка выхода */}
      <div style={{ padding: '8px 10px', borderTop: '1px solid rgba(92,61,30,0.3)', flexShrink: 0 }}>
        <button
          onClick={onLeave}
          className="btn btn-secondary"
          style={{ width: '100%', minHeight: '38px', fontSize: '0.78rem' }}
        >
          🏠 На базу
        </button>
      </div>
    </div>
  )
}
