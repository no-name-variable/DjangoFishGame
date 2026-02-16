/**
 * Позиционирование 1-3 удочек на канвасе — веерное расположение.
 * Углы в радианах (screen coords): 0=вправо, -π/2=вверх, -π=влево.
 * Удочка идёт от нижнего-правого угла вверх-влево (~-1.8 рад).
 */
import type { FishingState } from '../../../store/fishingStore'
import type { RodAnimState } from './RodBend'

export interface RodLayout {
  baseX: number
  baseY: number
  baseAngle: number  // базовый угол удочки (рад), ~-1.8 = вверх-влево
  rodLength: number
}

/** Данные для рендера одной удочки */
export interface RodRenderData {
  sessionId: number
  slotIndex: number
  layout: RodLayout
  animState: RodAnimState
  isActive: boolean
  fishingState: FishingState
  tension: number
}

/** Пресеты расположения удочек.
 *  angle: ~-1.80 = вверх и чуть влево (как в оригинальной РР3)
 *  lenPct: доля от высоты канваса
 */
const LAYOUTS: Record<number, Array<{ xPct: number; yPct: number; angle: number; lenPct: number }>> = {
  1: [
    { xPct: 0.85, yPct: 0.95, angle: -1.80, lenPct: 0.75 },
  ],
  2: [
    { xPct: 0.80, yPct: 0.96, angle: -1.92, lenPct: 0.72 },
    { xPct: 0.90, yPct: 0.94, angle: -1.65, lenPct: 0.70 },
  ],
  3: [
    { xPct: 0.76, yPct: 0.97, angle: -2.05, lenPct: 0.68 },
    { xPct: 0.85, yPct: 0.95, angle: -1.80, lenPct: 0.72 },
    { xPct: 0.93, yPct: 0.93, angle: -1.55, lenPct: 0.66 },
  ],
}

/** Вычислить layout для конкретной удочки */
export function calcMultiRodLayout(
  w: number, h: number,
  rodCount: number, slotIndex: number,
): RodLayout {
  const count = Math.max(1, Math.min(3, rodCount))
  const presets = LAYOUTS[count]
  const idx = Math.min(slotIndex, presets.length - 1)
  const p = presets[idx]

  return {
    baseX: w * p.xPct,
    baseY: h * p.yPct,
    baseAngle: p.angle,
    rodLength: h * p.lenPct,
  }
}
