/**
 * Анимация приманки для спиннинга.
 * Горизонтальное движение проводки, "игра" блесны, след за приманкой.
 */
import { Graphics } from 'pixi.js'
import type { FishingState } from '../../../store/fishingStore'

export interface LureConfig {
  sessionId: number
  castX: number
  castY: number
  state: FishingState
  isActive: boolean
  tension: number
  retrieveSpeed: number // 1-10
  isRetrieving?: boolean // Идёт ли проводка (игрок подматывает)
  retrieveProgress?: number // Прогресс проводки (0-1), 0=начало, 1=у берега
  phase: number
  biteAngle: number
}

/** Конвертация нормализованных координат */
function toCanvasCoords(
  castX: number, castY: number, w: number, h: number, waterline: number,
): [number, number] {
  const cx = (castX / 100) * w
  const cy = waterline + (castY / 100) * (h - waterline)
  return [cx, cy]
}

/** Главная функция отрисовки приманки */
export function drawLure(
  g: Graphics, cfg: LureConfig, frame: number,
  w: number, h: number, waterline: number,
) {
  const [baseX, baseY] = toCanvasCoords(cfg.castX, cfg.castY, w, h, waterline)
  const f = frame
  const alpha = cfg.isActive ? 1.0 : 0.6

  if (cfg.state === 'waiting') {
    drawRetrievingLure(
      g, baseX, baseY, f, cfg.retrieveSpeed, cfg.phase, alpha,
      cfg.isRetrieving ?? false, cfg.retrieveProgress ?? 0, waterline,
    )
  } else if (cfg.state === 'bite') {
    drawBiteLure(g, baseX, baseY, f, cfg.biteAngle, alpha)
  } else if (cfg.state === 'fighting') {
    drawFightingLure(g, baseX, baseY, f, cfg.tension, alpha)
  } else if (cfg.state === 'caught') {
    drawCaughtLure(g, baseX, baseY, f, alpha)
  }
}

/** Приманка при проводке (WAITING) — движение только при активной подмотке */
function drawRetrievingLure(
  g: Graphics, baseX: number, baseY: number,
  frame: number, speed: number, phase: number, alpha: number,
  isRetrieving: boolean, retrieveProgress: number, waterline: number,
) {
  let lureX = baseX
  let lureY = baseY
  let offsetX = 0

  // Подматывание к берегу (уменьшение Y) на основе прогресса
  // retrieveProgress: 0 = начальная позиция, 1 = у берега (waterline)
  const pullDistance = (baseY - waterline) * retrieveProgress
  lureY = baseY - pullDistance

  if (isRetrieving) {
    // Горизонтальное движение проводки (только при подмотке!)
    const speedFactor = speed / 10 // 0.1 - 1.0
    const cycleLength = 120 - speed * 8 // Чем быстрее, тем короче цикл
    const progress = ((frame + phase * 100) % cycleLength) / cycleLength

    // Движение влево-вправо (имитация проводки)
    const amplitude = 40 + speed * 5
    offsetX = Math.sin(progress * Math.PI * 2) * amplitude * speedFactor

    // Вертикальное колебание ("игра" приманки)
    const verticalFreq = 1 + speed * 0.3
    const offsetY = Math.sin(frame * 0.05 * verticalFreq + phase) * (3 + speed * 0.5)

    lureX = baseX + offsetX
    lureY += offsetY

    // След за приманкой (только при движении)
    drawLureTrail(g, lureX, lureY, offsetX, speed, alpha)
  } else {
    // Приманка неподвижна (пауза)
    // Лёгкое покачивание на месте от течения
    const sway = Math.sin(frame * 0.03 + phase) * 2
    lureY += sway
  }

  // Тело приманки
  drawLureBody(g, lureX, lureY, isRetrieving ? speed : 1, frame, alpha)
}

/** Тело приманки (блесна) */
function drawLureBody(
  g: Graphics, x: number, y: number,
  speed: number, frame: number, alpha: number,
) {
  // Вращение блесны
  const rotation = (frame * 0.1 * speed) % (Math.PI * 2)
  const wobble = Math.sin(frame * 0.15) * 0.3
  const totalRotation = rotation + wobble

  // Рисуем повёрнутый овал как многоугольник
  const radiusX = 8
  const radiusY = 4
  const points: number[] = []
  const segments = 16

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    const px = Math.cos(angle) * radiusX
    const py = Math.sin(angle) * radiusY
    // Поворачиваем точку
    const rotatedX = px * Math.cos(totalRotation) - py * Math.sin(totalRotation)
    const rotatedY = px * Math.sin(totalRotation) + py * Math.cos(totalRotation)
    points.push(x + rotatedX, y + rotatedY)
  }

  g.poly(points)
  g.fill({ color: 0xffcc00, alpha: alpha * 0.9 })
  g.stroke({ color: 0xffaa00, alpha: alpha, width: 1 })

  // Блик на блесне (маленький круг)
  const blikX = x - Math.cos(totalRotation) * 2
  const blikY = y - Math.sin(totalRotation) * 1
  g.circle(blikX, blikY, 2)
  g.fill({ color: 0xffffff, alpha: alpha * 0.6 })

  // Крючок (тройник)
  drawHook(g, x, y + 6, alpha * 0.7)
}

/** Крючок */
function drawHook(g: Graphics, x: number, y: number, alpha: number) {
  g.moveTo(x, y - 3)
  g.lineTo(x, y + 3)
  g.stroke({ color: 0x888888, alpha, width: 1 })

  // Три зубца
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3
    const hx = x + Math.cos(angle) * 2
    const hy = y + 3 + Math.sin(angle) * 2
    g.moveTo(x, y + 3)
    g.lineTo(hx, hy)
    g.stroke({ color: 0x666666, alpha, width: 0.8 })
  }
}

/** След за приманкой */
function drawLureTrail(
  g: Graphics, x: number, y: number,
  offsetX: number, speed: number, alpha: number,
) {
  // Пузырьки за приманкой
  const bubbleCount = Math.floor(speed / 2) + 1
  for (let i = 0; i < bubbleCount; i++) {
    const dist = (i + 1) * 8
    const trailX = x - Math.sign(offsetX) * dist
    const trailY = y + Math.sin(i * 0.5) * 2
    const size = 2 - i * 0.3
    g.circle(trailX, trailY, Math.max(0.5, size))
    g.fill({ color: 0xffffff, alpha: alpha * (0.3 - i * 0.08) })
  }
}

/** Приманка при поклёвке (BITE) */
function drawBiteLure(
  g: Graphics, baseX: number, baseY: number,
  frame: number, biteAngle: number, alpha: number,
) {
  // Рывок в сторону рыбы
  const pullDist = Math.sin(frame * 0.3) * 15
  const lureX = baseX + Math.cos(biteAngle) * pullDist
  const lureY = baseY + Math.sin(biteAngle) * pullDist

  // Дрожание
  const shake = Math.sin(frame * 0.5) * 3
  const finalX = lureX + shake
  const finalY = lureY + Math.cos(frame * 0.6) * 2

  // Блесна агрессивно "трясётся"
  drawLureBody(g, finalX, finalY, 8, frame * 2, alpha)

  // Всплески вокруг
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + frame * 0.1
    const dist = 10 + Math.sin(frame * 0.2 + i) * 5
    const sx = finalX + Math.cos(angle) * dist
    const sy = finalY + Math.sin(angle) * dist
    g.circle(sx, sy, 2)
    g.fill({ color: 0xffffff, alpha: alpha * 0.4 })
  }
}

/** Приманка при вываживании (FIGHTING) */
function drawFightingLure(
  g: Graphics, baseX: number, baseY: number,
  frame: number, tension: number, alpha: number,
) {
  // Вибрация от натяжения
  const vibX = Math.sin(frame * 0.4) * (tension * 0.1)
  const vibY = Math.cos(frame * 0.3) * (tension * 0.08)

  const lureX = baseX + vibX
  const lureY = baseY + vibY

  drawLureBody(g, lureX, lureY, 5, frame, alpha)

  // Пузыри от борьбы
  if (frame % 15 < 3) {
    for (let i = 0; i < 3; i++) {
      const bx = lureX + (Math.random() - 0.5) * 20
      const by = lureY + (Math.random() - 0.5) * 15
      g.circle(bx, by, 1 + Math.random() * 2)
      g.fill({ color: 0xffffff, alpha: alpha * 0.5 })
    }
  }
}

/** Приманка после поимки (CAUGHT) */
function drawCaughtLure(
  g: Graphics, baseX: number, baseY: number,
  frame: number, alpha: number,
) {
  // Медленно качается
  const sway = Math.sin(frame * 0.03) * 5
  drawLureBody(g, baseX + sway, baseY, 2, frame, alpha * 0.7)
}

/** Круги на воде от проводки */
export function drawLureRipples(
  g: Graphics, cfg: LureConfig, frame: number,
  w: number, h: number, waterline: number,
) {
  const [baseX, baseY] = toCanvasCoords(cfg.castX, cfg.castY, w, h, waterline)

  if (cfg.state === 'waiting') {
    if (cfg.isRetrieving) {
      // Волны от движения приманки (только при подмотке)
      const speedFactor = cfg.retrieveSpeed / 10
      const cycleLength = 120 - cfg.retrieveSpeed * 8
      const progress = ((frame + cfg.phase * 100) % cycleLength) / cycleLength
      const amplitude = 40 + cfg.retrieveSpeed * 5
      const offsetX = Math.sin(progress * Math.PI * 2) * amplitude * speedFactor

      const lureX = baseX + offsetX
      const lureY = baseY

      // Круги за приманкой
      const waveRadius = (frame * 2) % 40
      g.circle(lureX, lureY, waveRadius)
      g.stroke({ color: 0xffffff, alpha: 0.1 * (1 - waveRadius / 40), width: 1 })
    } else {
      // Тихие круги когда приманка неподвижна
      if (frame % 60 === 0) {
        g.circle(baseX, baseY, 5)
        g.stroke({ color: 0xffffff, alpha: 0.05, width: 0.5 })
      }
    }
  } else if (cfg.state === 'bite') {
    // Агрессивные круги при поклёвке
    for (let r = 0; r < 3; r++) {
      const radius = ((frame * 3 + r * 30) % 60)
      const alpha = 0.3 * (1 - radius / 60)
      g.circle(baseX, baseY, radius)
      g.stroke({ color: 0xffffff, alpha, width: 1.5 })
    }
  }
}

/** Индикатор поклёвки на неактивной приманке */
export function drawLureBiteIndicator(
  g: Graphics, cfg: LureConfig, frame: number,
  w: number, h: number, waterline: number,
) {
  if (cfg.state !== 'bite' || cfg.isActive) return

  const [x, y] = toCanvasCoords(cfg.castX, cfg.castY, w, h, waterline)

  // Красный пульсирующий круг
  const pulse = 0.7 + Math.sin(frame * 0.15) * 0.3
  g.circle(x, y - 25, 12 * pulse)
  g.fill({ color: 0xff0000, alpha: 0.4 * pulse })
  g.stroke({ color: 0xff0000, alpha: 0.8 * pulse, width: 2 })

  // Иконка приманки
  g.circle(x, y - 25, 4)
  g.fill({ color: 0xffcc00, alpha: 0.9 })
}
