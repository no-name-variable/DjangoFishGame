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
  onKeep: () => void
  onRelease: () => void
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
      <span className="text-wood-500 text-xs">{label}:</span>
      <span className={`text-xs ${valueClass || 'text-wood-200'}`}>{value}</span>
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
  onStartRetrieve, onStopRetrieve,
  onLeave, onUpdateSettings, onChangeTackle, onMessage, message, chatChannelId,
}: TacklePanelProps) {
  const [tackleChangeRodId, setTackleChangeRodId] = useState<number | null>(null)
  const [chatTab, setChatTab] = useState<'chat' | 'players'>('chat')
  const [playerCount, setPlayerCount] = useState(0)

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

  /* Тип сообщения для цветового кодирования */
  const msgIsError = message.startsWith('⚠') || message.includes('Обрыв') || message.includes('сломал') || message.includes('Ошибка')
  const msgIsSuccess = message.startsWith('✅') || message.includes('садке') || message.includes('Заброс') || message.includes('Отпущена')

  return (
    <div className="wood-panel flex flex-col h-full overflow-hidden">
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
            <span style={{ fontSize: '0.68rem', color: '#8b6d3f', fontFamily: 'Georgia, serif' }}>
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

          {/* Детали в 2 колонки */}
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
            <TackleRow label="Катушка" value={activeRod.reel_name} />
            <TackleRow label="Леска"   value={activeRod.line_name} />
            <TackleRow label="Крючок"  value={activeRod.hook_name} />
            {activeRod.float_name && <TackleRow label="Поплавок" value={activeRod.float_name} />}
            {activeRod.lure_name  && <TackleRow label="Приманка" value={activeRod.lure_name} />}
            {activeRod.bait_name && (
              <>
                <span className="text-wood-500 text-xs">Наживка:</span>
                <div className="flex items-center justify-between gap-2">
                  <span className={activeRod.bait_remaining < 5 ? 'text-xs text-red-400' : 'text-xs text-wood-200'}>
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

            {/* Слайдер глубины */}
            {showDepth && (
              <SettingSlider
                label="Глубина"
                value={activeRod.depth_setting}
                min={0.1} max={10} step={0.1}
                disabled={slidersDisabled}
                onChange={(v) => onUpdateSettings(activeRod.id, { depth_setting: v })}
              />
            )}

            {/* Слайдер проводки */}
            {showRetrieve && (
              <>
                <SettingSlider
                  label="Проводка"
                  value={activeRod.retrieve_speed}
                  min={1} max={10} step={1}
                  disabled={slidersDisabled}
                  onChange={(v) => onUpdateSettings(activeRod.id, { retrieve_speed: v })}
                />
                <span className="col-span-2 text-[9px] text-center">
                  {activeRod.retrieve_speed >= 4 && activeRod.retrieve_speed <= 7 && (
                    <span className="text-green-400">✓ Оптимальная скорость (+20%)</span>
                  )}
                  {(activeRod.retrieve_speed <= 2 || activeRod.retrieve_speed >= 9) && (
                    <span className="text-red-400">⚠ Слишком медленная/быстрая (-30%)</span>
                  )}
                  {(activeRod.retrieve_speed === 3 || activeRod.retrieve_speed === 8) && (
                    <span className="text-yellow-400">~ Средняя скорость</span>
                  )}
                </span>
              </>
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
            <span className="text-wood-500 text-sm font-serif py-1 w-full text-center">
              🎣 Кликните по воде для заброса
            </span>
          )}

          {/* Нет снастей */}
          {rods.length === 0 && (
            <span className="text-wood-500 text-xs">Нет готовых снастей</span>
          )}

          {/* ─── Ожидание поклёвки ─── */}
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
              <div className="w-full flex flex-col gap-2">
                {/* Спиннинг */}
                {isSpinning ? (
                  <div className="flex flex-col gap-1">
                    {nearShore ? (
                      /* Приманка у берега */
                      <div className="flex flex-col gap-1">
                        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#4ade80', animation: 'pulse 1s ease-in-out infinite' }}>
                          🏖 Приманка у берега! Клик по воде — новый заброс
                        </div>
                        <button
                          onClick={() => onRetrieve(waitingSession.id)}
                          style={{
                            width: '100%', minHeight: '52px', fontSize: '1rem',
                            fontFamily: 'Georgia, serif',
                            background: 'linear-gradient(135deg, rgba(133,77,14,0.6), rgba(161,94,18,0.4))',
                            borderColor: '#d97706', borderWidth: '1.5px',
                            color: '#fde68a',
                            boxShadow: '0 0 14px rgba(217,119,6,0.4)',
                          }}
                          className="btn"
                        >
                          🔄 Вытащить и перезабросить
                        </button>
                      </div>
                    ) : (
                      /* Обычная кнопка проводки */
                      <>
                        <button
                          onMouseDown={() => onStartRetrieve?.(waitingSession.id)}
                          onMouseUp={() => onStopRetrieve?.(waitingSession.id)}
                          onMouseLeave={() => onStopRetrieve?.(waitingSession.id)}
                          onTouchStart={(e) => { e.preventDefault(); onStartRetrieve?.(waitingSession.id) }}
                          onTouchEnd={(e) => { e.preventDefault(); onStopRetrieve?.(waitingSession.id) }}
                          style={{
                            minHeight: '56px', fontSize: '1rem', width: '100%',
                            fontFamily: 'Georgia, serif', letterSpacing: '0.03em',
                            transition: 'all 0.12s ease',
                            background: waitingSession.isRetrieving
                              ? 'linear-gradient(135deg, rgba(2,132,199,0.6), rgba(14,165,233,0.4))'
                              : 'rgba(12,74,110,0.3)',
                            borderColor: waitingSession.isRetrieving ? '#0ea5e9' : '#164e63',
                            borderWidth: '1.5px',
                            color: waitingSession.isRetrieving ? '#e0f2fe' : '#7898b8',
                            boxShadow: waitingSession.isRetrieving
                              ? '0 0 18px rgba(14,165,233,0.45), inset 0 1px 0 rgba(255,255,255,0.1)'
                              : 'none',
                          }}
                          className="btn"
                        >
                          {waitingSession.isRetrieving
                            ? '⚡ Проводка...'
                            : '🌀 Зажмите для проводки [R]'}
                        </button>

                        {/* Прогресс дистанции приманки */}
                        <div style={{ position: 'relative' }}>
                          <div className="w-full rounded-full overflow-hidden" style={{
                            height: '10px',
                            background: 'rgba(12,74,110,0.2)',
                            border: '1px solid rgba(96,165,250,0.15)',
                          }}>
                            <div
                              className="h-full transition-all duration-300"
                              style={{
                                width: `${waitingSession.retrieveProgress * 100}%`,
                                background: waitingSession.retrieveProgress > 0.7
                                  ? 'linear-gradient(to right, #0369a1, #4ade80)'
                                  : 'linear-gradient(to right, #164e63, #0ea5e9)',
                                borderRadius: '9999px',
                                boxShadow: waitingSession.isRetrieving ? '0 0 6px rgba(14,165,233,0.5)' : 'none',
                              }}
                            />
                          </div>
                          <div style={{
                            display: 'flex', justifyContent: 'space-between',
                            marginTop: '2px', fontSize: '0.6rem',
                          }}>
                            <span style={{ color: '#164e63' }}>🎯 Заброс</span>
                            <span style={{ color: waitingSession.retrieveProgress > 0.7 ? '#4ade80' : '#164e63' }}>
                              🏖 Берег
                            </span>
                          </div>
                        </div>

                        <div className="text-center" style={{ fontSize: '0.65rem', color: '#4a6580' }}>
                          Удерживайте — рыба клюёт только при движении приманки
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  /* Не спиннинг — ожидание поклёвки */
                  <span className="text-wood-500 text-sm font-serif animate-pulse py-1 text-center">
                    ⏳ Ожидание поклёвки...
                  </span>
                )}

                {/* Кнопка вытащить (если не у берега) */}
                {!nearShore && (
                  <button
                    onClick={() => onRetrieve(waitingSession.id)}
                    className="btn btn-secondary text-xs"
                    style={{ minHeight: '36px' }}
                  >
                    Вытащить
                  </button>
                )}
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

          {/* ─── Поклёвка ─── */}
          {activeSession?.state === 'bite' && (
            <button
              onClick={onStrike}
              className="btn flex-1"
              style={{
                minHeight: '52px', fontSize: '1.05rem', fontFamily: 'Georgia, serif',
                letterSpacing: '0.05em',
                background: 'rgba(185,28,28,0.55)', borderColor: '#b91c1c',
                color: '#fca5a5', animation: 'pulse 0.6s ease-in-out infinite',
                boxShadow: '0 0 20px rgba(220,38,38,0.4)',
              }}
            >
              ⚡ ПОДСЕЧКА! [Space]
            </button>
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
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex border-b border-wood-700/40">
            <button
              onClick={() => setChatTab('chat')}
              style={{
                flex: 1, fontSize: '0.72rem', padding: '7px 4px',
                fontFamily: 'Georgia, serif', background: 'none',
                borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer',
                borderBottom: chatTab === 'chat' ? '2px solid #7898b8' : '2px solid transparent',
                color: chatTab === 'chat' ? '#d4c5a9' : '#5c3d1e',
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
                color: chatTab === 'players' ? '#d4c5a9' : '#5c3d1e',
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
