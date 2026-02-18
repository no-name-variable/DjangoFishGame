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

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

/** Общая функция движения при поклёвке, чтобы линии и поплавок вели себя согласованно */
export function calcBiteMotion(frame: number, phase: number) {
  const t = frame * 0.06 + phase * 2

  // Лёгкие покачивания + частые мелкие рывки
  const wobble = Math.sin(t) * 2.4
  const twitch = Math.sin(t * 2.1) * 1.2

  // Редкие более глубокие притопления
  const plungePhase = (Math.sin(t * 0.45 + phase) + 1) / 2 // 0..1
  const plunge = (plungePhase * plungePhase) * 9

  const offsetX = Math.sin(t * 0.55 + phase) * 2
  const offsetY = wobble + twitch + plunge

  // Интенсивность для подсветки/волн
  const intensity = clamp((Math.abs(twitch) + plunge * 0.6) / 8, 0, 1)

  return { offsetX, offsetY, intensity }
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
  } else if (cfg.state === 'nibble') {
    drawNibbleFloat(g, baseX, baseY, f, p, alpha)
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
  } else if (cfg.state === 'nibble') {
    // Лёгкие круги от подёргивания
    const { intensity } = calcNibbleMotion(f, cfg.phase)
    if (intensity > 0.15) {
      const radius = 8 + intensity * 6
      g.circle(baseX, baseY, radius)
      g.stroke({ color: 0xffffff, alpha: 0.06 + intensity * 0.08, width: 0.7 })
    }
  } else if (cfg.state === 'bite') {
    // Активность рыбы — частые, но мелкие круги
    const { intensity } = calcBiteMotion(f, cfg.phase)
    const baseRadius = 10 + intensity * 8
    for (let r = 0; r < 2; r++) {
      const radius = (f * 1.4 + r * 18) % 40 + baseRadius
      const alpha = (0.16 + intensity * 0.15) * (1 - (radius - baseRadius) / 40)
      g.circle(baseX, baseY, radius)
      g.stroke({ color: 0xffffff, alpha, width: 1 })
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

/** Индикатор поклёвки/подёргивания на неактивной удочке */
export function drawBiteIndicator(
  g: Graphics, cfg: FloatConfig, frame: number,
  w: number, h: number, waterline: number,
) {
  if ((cfg.state !== 'bite' && cfg.state !== 'nibble') || cfg.isActive) return

  const [baseX, baseY] = toCanvasCoords(cfg.castX, cfg.castY, w, h, waterline)
  const pulse = Math.sin(frame * 0.15) * 0.5 + 0.5

  if (cfg.state === 'nibble') {
    // Оранжевый пульсирующий круг для nibble
    g.circle(baseX, baseY - 25, 8 + pulse * 3)
    g.fill({ color: 0xff8800, alpha: 0.2 + pulse * 0.2 })

    // Вопросительный знак (подёргивание, не поклёвка)
    g.rect(baseX - 1, baseY - 31, 2, 7)
    g.fill({ color: 0xffaa44, alpha: 0.8 })
    g.circle(baseX, baseY - 21, 1.5)
    g.fill({ color: 0xffaa44, alpha: 0.8 })
  } else {
    // Красный пульсирующий круг для bite
    g.circle(baseX, baseY - 25, 10 + pulse * 4)
    g.fill({ color: 0xff2222, alpha: 0.3 + pulse * 0.3 })

    // Восклицательный знак
    g.rect(baseX - 1.5, baseY - 33, 3, 10)
    g.fill({ color: 0xff4444, alpha: 0.9 })
    g.circle(baseX, baseY - 20, 2)
    g.fill({ color: 0xff4444, alpha: 0.9 })
  }
}

/** Движение при подёргивании — лёгкие тычки, без ухода под воду */
export function calcNibbleMotion(frame: number, phase: number) {
  const t = frame * 0.08 + phase * 2

  // Периодические лёгкие тычки вниз
  const twitchPhase = Math.sin(t * 1.7 + phase * 3)
  const twitch = twitchPhase > 0.6 ? (twitchPhase - 0.6) * 6 : 0

  const offsetX = Math.sin(t * 0.4 + phase) * 1
  const offsetY = twitch + Math.sin(t * 0.7) * 0.8

  const intensity = clamp(twitch / 2.5, 0, 1)
  return { offsetX, offsetY, intensity }
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

function drawNibbleFloat(
  g: Graphics, x: number, y: number, f: number, phase: number, alpha: number,
) {
  const { offsetX, offsetY } = calcNibbleMotion(f, phase)
  const bobX = x + offsetX
  const bobY = y + offsetY

  // Антенна — лёгкое покачивание, не уходит под воду
  const antennaTop = bobY - 14
  const tilt = Math.sin(f * 0.05 + phase) * 0.06
  g.moveTo(bobX + tilt * 14, antennaTop)
  g.lineTo(bobX, bobY)
  g.stroke({ color: 0xff3333, width: 2, alpha })

  // Тело поплавка
  g.ellipse(bobX, bobY + 4, 3, 6)
  g.fill({ color: 0xff4444, alpha })
  g.ellipse(bobX, bobY + 10, 2, 4)
  g.fill({ color: 0xffffff, alpha })

  // Подводная часть лески
  g.moveTo(bobX, bobY + 14)
  g.lineTo(bobX + Math.sin(f * 0.07 + phase) * 4, bobY + 40)
  g.stroke({ color: 0xcccccc, width: 0.5, alpha: 0.3 * alpha })
}

function drawBiteFloat(
  g: Graphics, x: number, y: number, f: number, phase: number,
  _biteAngle: number, alpha: number,
) {
  const { offsetX, offsetY, intensity } = calcBiteMotion(f, phase)
  const bobX = x + offsetX
  const bobY = y + offsetY
  const sinkFactor = clamp(intensity * 1.2, 0, 1)

  // Антенна постепенно "уходит" под воду, но без скачков
  const antennaLen = 14 * (1 - sinkFactor * 0.45)
  g.moveTo(bobX, bobY - antennaLen)
  g.lineTo(bobX, bobY)
  g.stroke({ color: 0xff4444, width: 2, alpha: alpha * (0.7 + 0.3 * (1 - sinkFactor)) })

  // Тело поплавка
  g.ellipse(bobX, bobY + 4, 3, 6)
  g.fill({ color: 0xff6666, alpha: alpha * (0.75 + 0.25 * (1 - sinkFactor)) })
  g.ellipse(bobX, bobY + 10, 2, 4)
  g.fill({ color: 0xffffff, alpha: alpha * (0.65 + 0.25 * (1 - sinkFactor)) })

  // Лёгкое сияние вокруг активного поплавка — видно, что рыба трогает
  if (intensity > 0.2) {
    g.circle(bobX, bobY + 2, 9 + intensity * 6)
    g.stroke({ color: 0xff6666, alpha: 0.12 + intensity * 0.18, width: 1.2 })
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
