/**
 * Полоса натяжения лески в стиле РР3 + бар дистанции (подводка к берегу).
 */
import { useRef } from 'react'

interface FightBarProps {
  tension: number
  distance: number
  rodDurability?: number
}

export default function FightBar({ tension, distance, rodDurability = 100 }: FightBarProps) {
  const clampedTension = Math.min(100, Math.max(0, tension))
  const isCritical = clampedTension > 80

  // Фиксируем начальную дистанцию для корректного вычисления процента
  const initialDistRef = useRef<number | null>(null)
  if (initialDistRef.current === null && distance > 0) {
    initialDistRef.current = distance
  }
  const maxDist = initialDistRef.current ?? Math.max(distance, 10)
  const distPct  = Math.min(100, Math.max(0, ((maxDist - distance) / maxDist) * 100))
  const isClose  = distPct > 75

  return (
    <div className="p-1" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {/* ── Полоса натяжения ── */}
      <div>
        <div className="flex justify-between text-[10px] text-wood-300 mb-1 font-serif">
          <span>Безопасно</span>
          <span>Натяжение</span>
          <span>Обрыв!</span>
        </div>

        <div className="relative h-5 rounded border border-wood-600/60 overflow-hidden">
          {/* Фон-градиент */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to right, #1a5a1a 0%, #2e7d2e 25%, #d4a84a 55%, #cc4444 80%, #ff2222 100%)',
            }}
          />
          {/* Затемнение неактивной части */}
          <div
            className="absolute inset-0 bg-black/60 transition-all duration-150"
            style={{ left: `${clampedTension}%` }}
          />
          {/* Бегунок */}
          <div
            className={`absolute top-0 bottom-0 w-1 bg-white transition-all duration-150 ${
              isCritical ? 'animate-pulse shadow-[0_0_8px_rgba(255,0,0,0.8)]' : ''
            }`}
            style={{ left: `${clampedTension}%`, transform: 'translateX(-50%)' }}
          >
            <div
              className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-0 h-0"
              style={{
                borderLeft: '4px solid transparent',
                borderRight: '4px solid transparent',
                borderTop: '5px solid white',
              }}
            />
          </div>
          {/* Зоны */}
          <div className="absolute inset-0 flex pointer-events-none">
            <div className="w-[40%] border-r border-white/10" />
            <div className="w-[30%] border-r border-white/10" />
            <div className="w-[30%]" />
          </div>
        </div>

        <div className="flex justify-between mt-1 text-xs">
          <span style={{ fontSize: '0.65rem', color: '#a8894e' }}>Прочность:</span>
          <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: isCritical ? '#f87171' : '#d4c5a9' }}>
            {clampedTension.toFixed(0)}%
          </span>
          <span style={{ fontSize: '0.65rem', color: rodDurability < 30 ? '#f87171' : '#4ade80', fontWeight: 'bold' }}>
            {rodDurability}%
          </span>
        </div>
      </div>

      {/* ── Полоса дистанции (подводка к берегу) ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
          <span style={{ fontSize: '0.6rem', color: '#a8894e' }}>📏 Дистанция</span>
          <span style={{ fontSize: '0.68rem', color: '#7898b8', fontWeight: 'bold' }}>
            {distance.toFixed(1)} м
          </span>
          <span style={{ fontSize: '0.6rem', color: isClose ? '#4ade80' : '#a8894e' }}>
            {isClose ? '🎣 Почти!' : '🌊 Берег'}
          </span>
        </div>

        {/* Бар дистанции */}
        <div style={{
          height: '6px', borderRadius: '6px', overflow: 'hidden',
          background: 'rgba(12,74,110,0.25)', border: '1px solid rgba(96,165,250,0.15)',
        }}>
          <div style={{
            height: '100%', borderRadius: '6px',
            width: `${distPct}%`,
            background: isClose
              ? 'linear-gradient(to right, #0369a1, #4ade80)'
              : 'linear-gradient(to right, #164e63, #0369a1)',
            transition: 'width 0.3s ease',
            boxShadow: isClose ? '0 0 6px rgba(74,222,128,0.4)' : 'none',
          }} />
        </div>
      </div>
    </div>
  )
}
