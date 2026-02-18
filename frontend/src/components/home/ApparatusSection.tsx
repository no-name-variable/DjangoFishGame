/**
 * Секция "Самогонный аппарат" — сетка из 6 деталей.
 */

interface Part {
  id: number
  name: string
  slug: string
  description: string
  order: number
  collected: boolean
}

interface Props {
  parts: Part[]
  collected: number
  total: number
  isComplete: boolean
}

export default function ApparatusSection({ parts, collected, total, isComplete }: Props) {
  return (
    <div className="card mb-4">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', color: '#d4a84a' }}>
          Самогонный аппарат
        </h2>
        <span style={{
          fontSize: '0.7rem', padding: '2px 10px', borderRadius: '10px',
          background: isComplete ? 'rgba(22,101,52,0.25)' : 'rgba(92,61,30,0.3)',
          color: isComplete ? '#4ade80' : '#8b6d3f',
          border: `1px solid ${isComplete ? 'rgba(74,222,128,0.3)' : 'rgba(92,61,30,0.5)'}`,
        }}>
          {collected}/{total}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {parts.map((part) => (
          <div
            key={part.id}
            style={{
              padding: '10px 8px',
              borderRadius: '10px',
              textAlign: 'center',
              background: part.collected ? 'rgba(22,101,52,0.2)' : 'rgba(13,31,13,0.5)',
              border: `1px solid ${part.collected ? 'rgba(74,222,128,0.25)' : 'rgba(74,49,24,0.4)'}`,
              opacity: part.collected ? 1 : 0.6,
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>
              {part.collected ? PART_ICONS[part.slug] || '\u2699\uFE0F' : '\uD83D\uDD12'}
            </div>
            <div style={{
              fontSize: '0.7rem',
              color: part.collected ? '#d4c5a9' : '#5c3d1e',
              fontFamily: 'Georgia, serif',
            }}>
              {part.name}
            </div>
          </div>
        ))}
      </div>

      {!isComplete && (
        <p style={{ fontSize: '0.68rem', color: '#5c3d1e', marginTop: '10px', textAlign: 'center' }}>
          Выполняйте квесты, чтобы получить недостающие детали
        </p>
      )}
    </div>
  )
}

const PART_ICONS: Record<string, string> = {
  cube: '\uD83E\uDEAF',
  coil: '\uD83C\uDF00',
  thermometer: '\uD83C\uDF21\uFE0F',
  dry_pot: '\u2697\uFE0F',
  hoses: '\uD83E\uDEA0',
  gaskets: '\uD83D\uDD27',
}
