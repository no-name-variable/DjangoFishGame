/**
 * Поплавок + анимация по состояниям (per rod).
 * Реалистичное покачивание, утопление при поклёвке, увод рыбой.
 */
import { Graphics } from 'pixi.js'
import type { FishingState } from '../../../store/fishingStore'

export interface FloatConfig {
  sessionId: number
  castX: number
  castY: number
  state: FishingState
  isActive: boolean
  tension: number
  /** Случайная фаза, чтобы поплавки не качались синхронно */
  phase: number
  /** Случайный угол увода при поклёвке */
  biteAngle: number
}

/** Конвертация нормализованных координат (0-100) в canvas coords */
export function toCanvasCoords(
  castX: number, castY: number, w: number, h: number, waterline: number,
): [number, number] {
  const cx = (castX / 100) * w
  const cy = waterline + (castY / 100) * (h - waterline)
  return [cx, cy]
}

export function drawFloat(
  g: Graphics, cfg: FloatConfig, frame: number,
  w: number, h: number, waterline: number,
) {
  const [baseX, baseY] = toCanvasCoords(cfg.castX, cfg.castY, w, h, waterline)
  const f = frame
  const p = cfg.phase

  const alpha = cfg.isActive ? 1.0 : 0.5

  if (cfg.state === 'waiting') {
    drawWaitingFloat(g, baseX, baseY, f, p, alpha)
  } else if (cfg.state === 'bite') {
    drawBiteFloat(g, baseX, baseY, f, p, cfg.biteAngle, alpha)
  } else if (cfg.state === 'fighting') {
    drawFightingEffects(g, baseX, baseY, f, cfg.tension)
  } else if (cfg.state === 'caught') {
    drawCaughtFloat(g, baseX, baseY, f, p, alpha)
  }
}

/** Круги на воде вокруг поплавка */
export function drawRipples(
  g: Graphics, cfg: FloatConfig, frame: number,
  w: number, h: number, waterline: number,
) {
  const [baseX, baseY] = toCanvasCoords(cfg.castX, cfg.castY, w, h, waterline)
  const f = frame

  if (cfg.state === 'waiting') {
    // Концентрические круги, тихие
    const r1 = 6 + Math.sin(f * 0.05 + cfg.phase) * 2
    g.circle(baseX, baseY, r1)
    g.stroke({ color: 0xffffff, alpha: 0.05, width: 0.5 })
    g.circle(baseX, baseY, r1 + 8)
    g.stroke({ color: 0xffffff, alpha: 0.03, width: 0.5 })
  } else if (cfg.state === 'bite') {
    // Агрессивные круги
    for (let r = 0; r < 3; r++) {
      const radius = ((f * 2 + r * 30) % 60)
      const alpha = 0.25 * (1 - radius / 60)
      g.circle(baseX, baseY, radius)
      g.stroke({ color: 0xffffff, alpha, width: 1.2 })
    }
  } else if (cfg.state === 'fighting') {
    // Всплески от рыбы
    const vibX = Math.sin(f * 0.4) * (cfg.tension * 0.05)
    const vibY = Math.cos(f * 0.3) * (cfg.tension * 0.03)
    const fishX = baseX + vibX
    const fishY = baseY + vibY

    if (f % 20 < 3) {
      for (let s = 0; s < 4; s++) {
        const sx = fishX + (Math.sin(f * 3 + s * 17) - 0.5) * 30
        const sy = fishY + (Math.cos(f * 5 + s * 23) - 0.5) * 10
        g.circle(sx, sy, 2)
        g.fill({ color: 0xffffff, alpha: 0.3 })
      }
    }
    g.circle(fishX, fishY, 10 + Math.sin(f * 0.2) * 5)
    g.stroke({ color: 0xffffff, alpha: 0.15, width: 1 })
  }
}

/** Индикатор поклёвки на неактивной удочке */
export function drawBiteIndicator(
  g: Graphics, cfg: FloatConfig, frame: number,
  w: number, h: number, waterline: number,
) {
  if (cfg.state !== 'bite' || cfg.isActive) return

  const [baseX, baseY] = toCanvasCoords(cfg.castX, cfg.castY, w, h, waterline)
  const pulse = Math.sin(frame * 0.15) * 0.5 + 0.5

  // Пульсирующий красный круг
  g.circle(baseX, baseY - 25, 10 + pulse * 4)
  g.fill({ color: 0xff2222, alpha: 0.3 + pulse * 0.3 })

  // Восклицательный знак
  g.rect(baseX - 1.5, baseY - 33, 3, 10)
  g.fill({ color: 0xff4444, alpha: 0.9 })
  g.circle(baseX, baseY - 20, 2)
  g.fill({ color: 0xff4444, alpha: 0.9 })
}

// ────────── Приватные draw-функции ──────────

function drawWaitingFloat(
  g: Graphics, x: number, y: number, f: number, phase: number, alpha: number,
) {
  // Покачивание: двойной sin
  const bobY = y + Math.sin(f * 0.04 + phase) * 2 + Math.sin(f * 0.02 + phase * 0.7) * 1
  const tilt = Math.sin(f * 0.03 + phase) * 0.05 // ~3 градуса

  // Антенна (14px)
  const antennaTop = bobY - 14
  g.moveTo(x + tilt * 14, antennaTop)
  g.lineTo(x, bobY)
  g.stroke({ color: 0xff3333, width: 2, alpha })

  // Тело поплавка
  g.ellipse(x, bobY + 4, 3, 6)
  g.fill({ color: 0xff4444, alpha })
  g.ellipse(x, bobY + 10, 2, 4)
  g.fill({ color: 0xffffff, alpha })

  // Подводная часть лески
  g.moveTo(x, bobY + 14)
  g.lineTo(x + Math.sin(f * 0.05 + phase) * 3, bobY + 40)
  g.stroke({ color: 0xcccccc, width: 0.5, alpha: 0.3 * alpha })
}

function drawBiteFloat(
  g: Graphics, x: number, y: number, f: number, _phase: number,
  biteAngle: number, alpha: number,
) {
  // Время с начала поклёвки (приблизительно по кадрам, ~60fps)
  // Фазы определяются через модулированные кадры
  const biteFrame = f % 300 // Циклическая анимация поклёвки

  if (biteFrame < 18) {
    // Фаза 1: Пробные тычки (0-300мс ~18 кадров)
    const dip = Math.sin(biteFrame * 1.5) * 4
    const bobY = y + dip

    // Укороченная антенна (дёргается)
    g.moveTo(x, bobY - 10 + Math.abs(dip))
    g.lineTo(x, bobY)
    g.stroke({ color: 0xff3333, width: 2, alpha })

    g.ellipse(x, bobY + 4, 3, 6)
    g.fill({ color: 0xff4444, alpha })
    g.ellipse(x, bobY + 10, 2, 4)
    g.fill({ color: 0xffffff, alpha })

  } else if (biteFrame < 60) {
    // Фаза 2: Утапливание (300-1000мс ~42 кадра)
    const progress = (biteFrame - 18) / 42
    const sinkY = y + progress * 12
    const tiltX = Math.sin(biteAngle) * progress * 6

    // Антенна укорачивается
    const antennaLen = 14 * (1 - progress * 0.7)
    g.moveTo(x + tiltX, sinkY - antennaLen)
    g.lineTo(x + tiltX, sinkY)
    g.stroke({ color: 0xff3333, width: 2, alpha })

    g.ellipse(x + tiltX, sinkY + 4, 3, 6)
    g.fill({ color: 0xff4444, alpha: alpha * (1 - progress * 0.3) })

  } else {
    // Фаза 3: Под водой — торчит только 3px антенны
    const wobble = Math.sin(f * 0.5) * 3
    const sinkY = y + 12

    g.moveTo(x + wobble, sinkY - 3)
    g.lineTo(x + wobble, sinkY)
    g.stroke({ color: 0xff3333, width: 2, alpha })

    // Красный ореол
    const pulse = Math.sin(f * 0.15) * 0.5 + 0.5
    g.circle(x + wobble, sinkY, 8 + pulse * 4)
    g.fill({ color: 0xff0000, alpha: 0.1 + pulse * 0.15 })
  }
}

function drawFightingEffects(
  g: Graphics, x: number, y: number, f: number, tension: number,
) {
  // Поплавок скрыт — рисуем только место борьбы
  const vibX = Math.sin(f * 0.4) * (tension * 0.05)
  const vibY = Math.cos(f * 0.3) * (tension * 0.03)
  const fishX = x + vibX
  const fishY = y + vibY

  // Рывки рыбы (раз в ~1-3с)
  if (f % 80 < 2) {
    const jerkX = fishX + Math.sin(f * 7) * 20
    const jerkY = fishY + Math.cos(f * 5) * 8
    g.circle(jerkX, jerkY, 4)
    g.fill({ color: 0xffffff, alpha: 0.4 })
  }

  // Водный след за движением
  for (let i = 0; i < 3; i++) {
    const trailX = fishX - vibX * (i + 1) * 0.3
    const trailY = fishY - vibY * (i + 1) * 0.3
    g.circle(trailX, trailY, 2 - i * 0.5)
    g.fill({ color: 0xffffff, alpha: 0.1 - i * 0.03 })
  }
}

function drawCaughtFloat(
  g: Graphics, x: number, y: number, f: number, phase: number, alpha: number,
) {
  // Поплавок всплыл, лежит на боку
  const bobY = y + Math.sin(f * 0.03 + phase) * 1

  g.moveTo(x - 5, bobY)
  g.lineTo(x + 5, bobY)
  g.stroke({ color: 0xff3333, width: 2, alpha: alpha * 0.7 })

  g.ellipse(x, bobY + 2, 5, 3)
  g.fill({ color: 0xff4444, alpha: alpha * 0.6 })
}
