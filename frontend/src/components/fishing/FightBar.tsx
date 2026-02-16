/**
 * Полоса натяжения лески в стиле РР3 — горизонтальный слайдер с градиентом.
 */

interface FightBarProps {
  tension: number
  distance: number
  rodDurability?: number
}

export default function FightBar({ tension, distance, rodDurability = 100 }: FightBarProps) {
  const clampedTension = Math.min(100, Math.max(0, tension))
  const isCritical = clampedTension > 80

  return (
    <div className="p-1">
      {/* Полоса натяжения */}
      <div className="relative">
        <div className="flex justify-between text-[10px] text-wood-500 mb-1 font-serif">
          <span>Безопасно</span>
          <span>Натяжение</span>
          <span>Обрыв!</span>
        </div>

        {/* Градиентная полоса */}
        <div className="relative h-5 rounded border border-wood-600/60 overflow-hidden">
          {/* Фон-градиент: зелёный → жёлтый → красный */}
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

          {/* Бегунок (стрелка) */}
          <div
            className={`absolute top-0 bottom-0 w-1 bg-white transition-all duration-150 ${
              isCritical ? 'animate-pulse shadow-[0_0_8px_rgba(255,0,0,0.8)]' : ''
            }`}
            style={{ left: `${clampedTension}%`, transform: 'translateX(-50%)' }}
          >
            {/* Треугольник сверху */}
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
      </div>

      {/* Числа под полосой */}
      <div className="flex justify-between mt-2 text-xs">
        <div className="flex items-center gap-1">
          <span className="text-wood-500">Дистанция:</span>
          <span className="text-water-300 font-medium">{distance.toFixed(1)}м</span>
        </div>
        <div className={`font-medium ${isCritical ? 'text-red-400' : 'text-wood-300'}`}>
          {clampedTension.toFixed(0)}%
        </div>
        <div className="flex items-center gap-1">
          <span className="text-wood-500">Прочность:</span>
          <span className={`font-medium ${rodDurability < 30 ? 'text-red-400' : 'text-green-400'}`}>
            {rodDurability}%
          </span>
        </div>
      </div>
    </div>
  )
}
