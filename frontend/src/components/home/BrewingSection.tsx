/**
 * Секция "Варка и баффы" — активные сессии + баффы.
 */
import { useState } from 'react'
import { collectMoonshine } from '../../api/home'

interface BrewingSession {
  id: number
  recipe_name: string
  effect_type: string
  status: string
  started_at_hour: number
  started_at_day: number
  ready_at_hour: number
  ready_at_day: number
}

interface Buff {
  id: number
  recipe_name: string
  effect_type: string
  effect_value: number
  activated_at_day: number
  activated_at_hour: number
  expires_at_day: number
  expires_at_hour: number
  is_active: boolean
}

interface Props {
  sessions: BrewingSession[]
  buffs: Buff[]
  onUpdate: () => void
  onMessage: (msg: string) => void
}

const EFFECT_ICONS: Record<string, string> = {
  bite_boost: '\uD83C\uDF1F',
  experience_boost: '\uD83D\uDCDA',
  hunger_restore: '\uD83C\uDF56',
  luck: '\uD83C\uDF40',
}

export default function BrewingSection({ sessions, buffs, onUpdate, onMessage }: Props) {
  const [collecting, setCollecting] = useState<number | null>(null)

  const handleCollect = async (sessionId: number) => {
    setCollecting(sessionId)
    try {
      const res = await collectMoonshine(sessionId)
      onMessage(res.data.message)
      onUpdate()
    } catch (e: unknown) {
      const err = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Ошибка'
      onMessage(err)
    } finally {
      setCollecting(null)
    }
  }

  return (
    <>
      {/* Активная варка */}
      {sessions.length > 0 && (
        <div className="card mb-4" style={{ borderColor: 'rgba(234,179,8,0.25)' }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', color: '#facc15', marginBottom: '10px' }}>
            Варка
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sessions.map((s) => (
              <div key={s.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 12px', borderRadius: '8px',
                background: s.status === 'ready' ? 'rgba(22,101,52,0.2)' : 'rgba(92,61,30,0.15)',
                border: `1px solid ${s.status === 'ready' ? 'rgba(74,222,128,0.25)' : 'rgba(234,179,8,0.2)'}`,
              }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#d4c5a9', fontFamily: 'Georgia, serif' }}>
                    {EFFECT_ICONS[s.effect_type] || '\uD83C\uDF76'} {s.recipe_name}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#5c3d1e', marginTop: '2px' }}>
                    {s.status === 'ready'
                      ? 'Готово! Можно забирать'
                      : `Будет готов: день ${s.ready_at_day}, ${s.ready_at_hour}:00`
                    }
                  </div>
                </div>

                {s.status === 'ready' ? (
                  <button
                    className="btn btn-primary text-xs"
                    onClick={() => handleCollect(s.id)}
                    disabled={collecting === s.id}
                    style={{ minHeight: '32px', flexShrink: 0 }}
                  >
                    {collecting === s.id ? '\u23F3' : 'Забрать'}
                  </button>
                ) : (
                  <span style={{
                    fontSize: '0.7rem', padding: '4px 10px', borderRadius: '6px',
                    background: 'rgba(234,179,8,0.15)', color: '#facc15',
                    border: '1px solid rgba(234,179,8,0.2)',
                  }}>
                    Варится...
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Активные баффы */}
      {buffs.length > 0 && (
        <div className="card mb-4" style={{ borderColor: 'rgba(74,222,128,0.2)' }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', color: '#4ade80', marginBottom: '10px' }}>
            Активные баффы
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {buffs.map((b) => (
              <div key={b.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '7px 10px', borderRadius: '7px',
                background: 'rgba(22,101,52,0.2)', border: '1px solid rgba(74,222,128,0.15)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1rem' }}>{EFFECT_ICONS[b.effect_type] || '\u2728'}</span>
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: '0.85rem', color: '#d4c5a9' }}>
                    {b.recipe_name}
                  </span>
                </div>
                <span style={{ fontSize: '0.65rem', color: '#5c3d1e' }}>
                  до дня {b.expires_at_day}, {b.expires_at_hour}:00
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
