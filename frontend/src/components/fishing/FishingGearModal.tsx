/**
 * Модальное окно управления снастями прямо на FishingPage.
 * Три вкладки: Удочки (слоты), Снасть (замена компонентов), Настройки (глубина/скорость).
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { getRods, equipRod, unequipRod, type PlayerRod } from '../../api/inventory'
import { repairRod } from '../../api/shop'
import { getProfile } from '../../api/auth'
import { usePlayerStore } from '../../store/playerStore'
import TackleChangePanel from './TackleChangePanel'
import type { FullRod } from './TacklePanel'
import type { SessionInfo } from '../../store/fishingStore'

type Tab = 'rods' | 'tackle' | 'settings'

interface Props {
  sessions: SessionInfo[]
  rods: FullRod[]
  onUpdateSettings: (rodId: number, settings: { depth_setting?: number; retrieve_speed?: number }) => void
  onChangeTackle: (rodId: number, updatedRod: FullRod) => void
  onClose: () => void
}

const tabBtn = (active: boolean): CSSProperties => ({
  padding: '8px 14px',
  fontSize: '0.78rem',
  fontFamily: 'Georgia, serif',
  cursor: 'pointer',
  color: active ? '#7898b8' : '#5c3d1e',
  background: 'none',
  border: 'none',
  borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
  transition: 'color 0.15s',
})

const card: CSSProperties = {
  background: 'rgba(7,18,7,0.6)',
  border: '1px solid rgba(92,61,30,0.4)',
  borderRadius: '8px',
  padding: '8px 10px',
  marginBottom: '6px',
}

const slotBtn = (danger: boolean, disabled: boolean): CSSProperties => ({
  background: danger ? 'rgba(248,113,113,0.15)' : 'rgba(59,130,246,0.15)',
  border: `1px solid ${danger ? 'rgba(248,113,113,0.3)' : 'rgba(59,130,246,0.35)'}`,
  borderRadius: '4px',
  color: disabled ? '#5c3d1e' : danger ? '#f87171' : '#7898b8',
  fontSize: '0.65rem',
  padding: '2px 7px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.6 : 1,
})

const selectStyle: CSSProperties = {
  width: '100%',
  marginTop: '4px',
  background: 'rgba(7,18,7,0.8)',
  border: '1px solid rgba(92,61,30,0.5)',
  borderRadius: '6px',
  color: '#a8894e',
  fontSize: '0.78rem',
  padding: '5px 8px',
}

export default function FishingGearModal({ sessions, rods, onUpdateSettings, onChangeTackle, onClose }: Props) {
  const player = usePlayerStore((s) => s.player)
  const setPlayer = usePlayerStore((s) => s.setPlayer)

  const [tab, setTab] = useState<Tab>('rods')
  const [allRods, setAllRods] = useState<PlayerRod[]>([])
  const [selectedRodId, setSelectedRodId] = useState<number | null>(rods[0]?.id ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Слайдеры настроек
  const [sliderDepth, setSliderDepth] = useState(0)
  const [sliderSpeed, setSliderSpeed] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Синхронизируем слайдеры при смене удочки
  useEffect(() => {
    const rod = rods.find((r) => r.id === selectedRodId)
    if (rod) {
      setSliderDepth(rod.depth_setting)
      setSliderSpeed(rod.retrieve_speed)
    }
  }, [selectedRodId, rods])

  // Загрузка всех удочек при открытии
  useEffect(() => {
    setLoading(true)
    getRods()
      .then(({ results }) => setAllRods(results))
      .catch(() => setError('Ошибка загрузки удочек'))
      .finally(() => setLoading(false))
  }, [])

  const refreshProfile = () => getProfile().then(setPlayer).catch(() => {})

  const equippedSlots = [
    { slot: 1 as const, rodId: player?.rod_slot_1?.id ?? null },
    { slot: 2 as const, rodId: player?.rod_slot_2?.id ?? null },
    { slot: 3 as const, rodId: player?.rod_slot_3?.id ?? null },
  ]

  const hasSession = (rodId: number) => sessions.some((s) => s.rodId === rodId)

  const handleEquip = async (rodId: number, slot: 1 | 2 | 3) => {
    setError('')
    try {
      await equipRod(rodId, slot)
      await refreshProfile()
      // Перезагрузить список, чтобы обновить статус экипировки
      const { results } = await getRods()
      setAllRods(results)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Ошибка экипировки'
      setError(msg)
    }
  }

  const handleUnequip = async (rodId: number) => {
    if (hasSession(rodId)) {
      setError('Нельзя снять удочку с активной сессией рыбалки')
      return
    }
    setError('')
    try {
      await unequipRod(rodId)
      await refreshProfile()
      const { results } = await getRods()
      setAllRods(results)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Ошибка снятия'
      setError(msg)
    }
  }

  const handleRepair = async (rodId: number) => {
    setError('')
    try {
      const result = await repairRod(rodId)
      await refreshProfile()
      const { results } = await getRods()
      setAllRods(results)
      setError(`✅ Отремонтировано за ${result.cost} монет`)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Ошибка ремонта'
      setError(msg)
    }
  }

  const handleSlider = (field: 'depth_setting' | 'retrieve_speed', value: number) => {
    if (field === 'depth_setting') setSliderDepth(value)
    else setSliderSpeed(value)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (!selectedRodId) return
      const settings: { depth_setting?: number; retrieve_speed?: number } = {}
      if (field === 'depth_setting') settings.depth_setting = value
      else settings.retrieve_speed = value
      onUpdateSettings(selectedRodId, settings)
    }, 300)
  }

  const selectedRod = rods.find((r) => r.id === selectedRodId)

  // ─── Рендер ───────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: '440px',
          background: 'rgba(10,20,10,0.97)',
          border: '1px solid rgba(92,61,30,0.5)',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
          fontFamily: 'Georgia, serif',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Заголовок */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px',
          borderBottom: '1px solid rgba(92,61,30,0.3)',
          background: 'rgba(7,18,7,0.5)',
        }}>
          <span style={{ color: '#a8894e', fontSize: '0.92rem' }}>🎒 Управление снастями</span>
          <button
            onClick={onClose}
            style={{ color: '#5c3d1e', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Вкладки */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(92,61,30,0.3)',
          background: 'rgba(7,18,7,0.3)',
        }}>
          <button style={tabBtn(tab === 'rods')} onClick={() => setTab('rods')}>🎣 Удочки</button>
          <button style={tabBtn(tab === 'tackle')} onClick={() => setTab('tackle')}>🔧 Снасть</button>
          <button style={tabBtn(tab === 'settings')} onClick={() => setTab('settings')}>⚙️ Настройки</button>
        </div>

        {/* Контент */}
        <div style={{ padding: '12px 16px', maxHeight: '62vh', overflowY: 'auto' }}>
          {error && (
            <div style={{
              color: error.startsWith('✅') ? '#4ade80' : '#f87171',
              fontSize: '0.75rem', marginBottom: '8px', padding: '5px 8px',
              background: error.startsWith('✅') ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
              borderRadius: '4px',
              border: `1px solid ${error.startsWith('✅') ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
            }}>
              {error}
            </div>
          )}

          {/* Вкладка: Удочки */}
          {tab === 'rods' && (
            <div>
              <p style={{ color: '#7898b8', fontSize: '0.72rem', marginBottom: '6px' }}>Экипированные слоты</p>
              {equippedSlots.map(({ slot, rodId }) => {
                const rod = rodId ? allRods.find((r) => r.id === rodId) : null
                const active = rodId ? hasSession(rodId) : false
                return (
                  <div key={slot} style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: '#a8894e', fontSize: '0.78rem' }}>
                        Слот {slot}:{' '}
                        {rod
                          ? (rod.custom_name || rod.rod_type_name)
                          : <span style={{ color: '#5c3d1e' }}>— пусто —</span>}
                      </span>
                      {rod && (
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          {active && <span style={{ color: '#4ade80', fontSize: '0.65rem' }}>🎣</span>}
                          <button disabled={active} onClick={() => handleUnequip(rod.id)} style={slotBtn(true, active)}>
                            Снять
                          </button>
                        </div>
                      )}
                    </div>
                    {rod && (
                      <p style={{ color: '#5c3d1e', fontSize: '0.65rem', marginTop: '2px' }}>
                        {rod.rod_class} · {rod.is_ready ? '✅ Готова' : '⚠️ Не готова'}
                        {' · '}
                        <span style={{ color: rod.durability_current <= 0 ? '#f87171' : rod.durability_current < 30 ? '#fbbf24' : '#6b8c5c' }}>
                          🔧 {rod.durability_current}/100
                        </span>
                      </p>
                    )}
                  </div>
                )
              })}

              <p style={{ color: '#7898b8', fontSize: '0.72rem', margin: '12px 0 6px' }}>Все удочки</p>
              {loading && <p style={{ color: '#5c3d1e', fontSize: '0.75rem' }}>Загрузка...</p>}
              {allRods.length === 0 && !loading && (
                <p style={{ color: '#5c3d1e', fontSize: '0.75rem' }}>Нет собранных удочек</p>
              )}
              {allRods.map((rod) => {
                const equippedSlot = equippedSlots.find((s) => s.rodId === rod.id)
                const active = hasSession(rod.id)
                return (
                  <div key={rod.id} style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <span style={{ color: '#a8894e', fontSize: '0.78rem' }}>
                          {rod.custom_name || rod.rod_type_name}
                        </span>
                        <p style={{ color: '#5c3d1e', fontSize: '0.65rem', margin: '1px 0 0' }}>
                          {rod.rod_class}{' · '}{rod.is_ready ? '✅ Готова' : '⚠️ Не готова'}
                          {equippedSlot && ` · Слот ${equippedSlot.slot}`}
                          {' · '}
                          <span style={{ color: rod.durability_current <= 0 ? '#f87171' : rod.durability_current < 30 ? '#fbbf24' : '#5c3d1e' }}>
                            🔧 {rod.durability_current}/100
                          </span>
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '3px', alignItems: 'center', flexShrink: 0 }}>
                        {rod.durability_current < 100 && (
                          <button
                            onClick={() => handleRepair(rod.id)}
                            title={`Ремонт: ${(100 - rod.durability_current) * 5} монет`}
                            style={{
                              background: 'rgba(251,191,36,0.15)',
                              border: '1px solid rgba(251,191,36,0.4)',
                              borderRadius: '4px',
                              color: '#fbbf24', fontSize: '0.65rem',
                              padding: '2px 6px', cursor: 'pointer',
                            }}
                          >
                            🔧
                          </button>
                        )}
                        {equippedSlot ? (
                          <>
                            {active && <span style={{ color: '#4ade80', fontSize: '0.65rem' }}>🎣</span>}
                            <button disabled={active} onClick={() => handleUnequip(rod.id)} style={slotBtn(true, active)}>
                              Снять
                            </button>
                          </>
                        ) : (
                          <>
                            {([1, 2, 3] as const).map((slot) => (
                              <button key={slot} onClick={() => handleEquip(rod.id, slot)} title={`В слот ${slot}`} style={slotBtn(false, false)}>
                                →{slot}
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Вкладка: Снасть */}
          {tab === 'tackle' && (
            rods.length === 0
              ? <p style={{ color: '#5c3d1e', fontSize: '0.8rem' }}>Нет экипированных готовых удочек</p>
              : (
                <>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ color: '#7898b8', fontSize: '0.72rem' }}>Удочка:</label>
                    <select value={selectedRodId ?? ''} onChange={(e) => setSelectedRodId(Number(e.target.value))} style={selectStyle}>
                      {rods.map((r) => (
                        <option key={r.id} value={r.id}>{r.display_name || r.rod_type_name}</option>
                      ))}
                    </select>
                  </div>
                  {selectedRod && (
                    <TackleChangePanel
                      rod={selectedRod}
                      onApply={(rodId, updatedRod) => { onChangeTackle(rodId, updatedRod); refreshProfile() }}
                      onClose={onClose}
                    />
                  )}
                </>
              )
          )}

          {/* Вкладка: Настройки */}
          {tab === 'settings' && (
            rods.length === 0
              ? <p style={{ color: '#5c3d1e', fontSize: '0.8rem' }}>Нет экипированных готовых удочек</p>
              : (
                <>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ color: '#7898b8', fontSize: '0.72rem' }}>Удочка:</label>
                    <select value={selectedRodId ?? ''} onChange={(e) => setSelectedRodId(Number(e.target.value))} style={selectStyle}>
                      {rods.map((r) => (
                        <option key={r.id} value={r.id}>{r.display_name || r.rod_type_name}</option>
                      ))}
                    </select>
                  </div>
                  {selectedRod && (
                    <div>
                      {selectedRod.rod_class !== 'spinning' && (
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <label style={{ color: '#7898b8', fontSize: '0.75rem' }}>🏊 Глубина</label>
                            <span style={{ color: '#a8894e', fontSize: '0.75rem' }}>{sliderDepth.toFixed(1)} м</span>
                          </div>
                          <input type="range" min={0.5} max={10} step={0.1} value={sliderDepth}
                            onChange={(e) => handleSlider('depth_setting', Number(e.target.value))}
                            style={{ width: '100%', accentColor: '#3b82f6' }}
                          />
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                            <span style={{ color: '#5c3d1e', fontSize: '0.62rem' }}>0.5 м</span>
                            <span style={{ color: '#5c3d1e', fontSize: '0.62rem' }}>10 м</span>
                          </div>
                        </div>
                      )}
                      {selectedRod.rod_class === 'spinning' && (
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <label style={{ color: '#7898b8', fontSize: '0.75rem' }}>🌀 Скорость проводки</label>
                            <span style={{ color: '#a8894e', fontSize: '0.75rem' }}>{sliderSpeed.toFixed(1)}</span>
                          </div>
                          <input type="range" min={0.5} max={10} step={0.1} value={sliderSpeed}
                            onChange={(e) => handleSlider('retrieve_speed', Number(e.target.value))}
                            style={{ width: '100%', accentColor: '#3b82f6' }}
                          />
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                            <span style={{ color: '#5c3d1e', fontSize: '0.62rem' }}>медленно</span>
                            <span style={{ color: '#5c3d1e', fontSize: '0.62rem' }}>быстро</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )
          )}
        </div>
      </div>
    </div>
  )
}
