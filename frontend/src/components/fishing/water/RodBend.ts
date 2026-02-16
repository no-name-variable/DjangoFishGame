/**
 * Движок динамического изгиба удочки — 12 сегментов с прогрессивным изгибом.
 * Физика: spring-damper сглаживание, профили tip/progressive, wobble-колебания.
 */
import { Graphics } from 'pixi.js'
import type { FishingState } from '../../../store/fishingStore'

const SEGMENTS = 12

/** Состояние анимации одной удочки (между кадрами) */
export interface RodAnimState {
  angles: number[]       // текущие углы сегментов
  targets: number[]      // целевые углы
  wobblePhase: number    // фаза колебаний (уникальная для каждой удочки)
  biteTimer: number      // таймер рывков при поклёвке
  biteJerk: number       // сила текущего рывка
  prevState: FishingState | null
}

export function createRodAnimState(): RodAnimState {
  return {
    angles: new Array(SEGMENTS).fill(0),
    targets: new Array(SEGMENTS).fill(0),
    wobblePhase: Math.random() * Math.PI * 2,
    biteTimer: 0,
    biteJerk: 0,
    prevState: null,
  }
}

type BendProfile = 'tip' | 'progressive'

/** Расчёт целевых углов по профилю изгиба */
function calcTargetAngles(
  totalBend: number, profile: BendProfile,
): number[] {
  const targets = new Array(SEGMENTS).fill(0)
  let sum = 0

  for (let i = 0; i < SEGMENTS; i++) {
    const t = (i + 1) / SEGMENTS // 0..1
    let weight: number
    if (profile === 'tip') {
      // Экспоненциальный — кончик гнётся сильнее
      weight = Math.pow(t, 2.5)
    } else {
      // Квадратичный — плавный прогрессивный
      weight = t * t
    }
    targets[i] = weight
    sum += weight
  }

  // Нормализация: сумма углов = totalBend
  if (sum > 0) {
    for (let i = 0; i < SEGMENTS; i++) {
      targets[i] = (targets[i] / sum) * totalBend
    }
  }

  return targets
}

/** Обновление анимации каждый кадр */
export function updateRodAnim(
  state: RodAnimState,
  fishingState: FishingState | null,
  tension: number,
  frame: number,
): void {
  // Определяем целевой изгиб и профиль
  let totalBend: number
  let profile: BendProfile
  let smoothing: number

  const active = fishingState ?? 'idle'

  switch (active) {
    case 'idle':
      totalBend = 0.05
      profile = 'tip'
      smoothing = 0.06
      break

    case 'waiting':
      totalBend = 0.08
      profile = 'progressive'
      smoothing = 0.06
      break

    case 'bite': {
      // Рывки через случайные интервалы
      state.biteTimer--
      if (state.biteTimer <= 0) {
        state.biteJerk = 0.1 + Math.random() * 0.15
        state.biteTimer = 8 + Math.floor(Math.random() * 25)
      }
      // Затухание рывка
      state.biteJerk *= 0.88
      totalBend = 0.1 + state.biteJerk
      profile = 'tip'
      smoothing = 0.25 // Резкие рывки
      break
    }

    case 'fighting':
      totalBend = 0.15 + tension * 0.008
      if (totalBend > 1.0) totalBend = 1.0
      profile = 'progressive'
      smoothing = 0.08
      break

    case 'caught':
      totalBend = 0.04
      profile = 'tip'
      smoothing = 0.05
      break

    default:
      totalBend = 0
      profile = 'tip'
      smoothing = 0.06
  }

  // Сброс biteJerk при смене состояния
  if (state.prevState !== active) {
    if (active !== 'bite') {
      state.biteJerk = 0
      state.biteTimer = 0
    }
    state.prevState = active
  }

  // Целевые углы
  state.targets = calcTargetAngles(totalBend, profile)

  // Spring-damper сглаживание + wobble
  for (let i = 0; i < SEGMENTS; i++) {
    const t = (i + 1) / SEGMENTS

    // Wobble: синусоиды разной частоты, больше к кончику
    let wobble = 0
    if (active === 'idle' || active === 'waiting') {
      wobble = Math.sin(frame * 0.02 + state.wobblePhase + i * 0.4) * 0.003 * t
        + Math.sin(frame * 0.035 + state.wobblePhase * 1.3 + i * 0.7) * 0.002 * t
    } else if (active === 'fighting') {
      // Вибрация пропорционально натяжению
      const vibAmp = tension * 0.00015 * t
      wobble = Math.sin(frame * 0.3 + i * 0.5) * vibAmp
        + Math.sin(frame * 0.7 + i * 1.1) * vibAmp * 0.5
    } else if (active === 'bite') {
      wobble = Math.sin(frame * 0.15 + i * 0.6) * 0.005 * t
    }

    const target = state.targets[i] + wobble
    state.angles[i] += (target - state.angles[i]) * smoothing
  }
}

/** По углам сегментов → массив точек (x, y) */
export function calcRodPoints(
  baseX: number, baseY: number,
  length: number, baseAngle: number,
  angles: number[],
): Array<{ x: number; y: number }> {
  const segLen = length / SEGMENTS
  const points: Array<{ x: number; y: number }> = [{ x: baseX, y: baseY }]
  let currentAngle = baseAngle

  for (let i = 0; i < SEGMENTS; i++) {
    currentAngle += angles[i]
    const prev = points[points.length - 1]
    points.push({
      x: prev.x + Math.cos(currentAngle) * segLen,
      y: prev.y + Math.sin(currentAngle) * segLen,
    })
  }

  return points
}

/** Отрисовка сегментированной удочки с переменной толщиной */
export function drawSegmentedRod(
  g: Graphics,
  points: Array<{ x: number; y: number }>,
  isActive: boolean,
): void {
  const alpha = isActive ? 1.0 : 0.6
  const n = points.length

  // Тёмная подложка для контраста
  for (let i = 0; i < n - 1; i++) {
    const t = i / (n - 1)
    const thickness = 7 - t * 4.5 // 7px → 2.5px (подложка чуть шире)
    g.moveTo(points[i].x, points[i].y)
    g.lineTo(points[i + 1].x, points[i + 1].y)
    g.stroke({ color: 0x1a1208, width: thickness, alpha: alpha * 0.5 })
  }

  // Основная линия: переменная толщина от основания к кончику
  for (let i = 0; i < n - 1; i++) {
    const t = i / (n - 1) // 0 = основание, 1 = кончик
    const thickness = 5.5 - t * 4 // 5.5px → 1.5px
    // Градиент: тёмно-коричневый → светлый к кончику
    const color = t < 0.4 ? 0x5c4a32 : t < 0.7 ? 0x7a6a4a : 0x9a8a6a

    g.moveTo(points[i].x, points[i].y)
    g.lineTo(points[i + 1].x, points[i + 1].y)
    g.stroke({ color, width: thickness, alpha })
  }

  // Катушка (15% от основания)
  const reelIdx = Math.floor(n * 0.15)
  const reelPt = points[Math.min(reelIdx, n - 1)]
  g.circle(reelPt.x, reelPt.y, 6)
  g.fill({ color: 0x777777, alpha })
  g.circle(reelPt.x, reelPt.y, 3)
  g.fill({ color: 0xbbbbbb, alpha })

  // Кольцо на кончике
  const tip = points[n - 1]
  g.circle(tip.x, tip.y, 2.5)
  g.stroke({ color: 0xcccccc, width: 1.5, alpha })
}

/** Золотистое свечение активной удочки */
export function drawRodGlow(
  g: Graphics,
  points: Array<{ x: number; y: number }>,
): void {
  const n = points.length
  for (let i = 0; i < n - 1; i++) {
    const t = i / (n - 1)
    const glowAlpha = 0.08 * (1 - t * 0.5)
    g.moveTo(points[i].x, points[i].y)
    g.lineTo(points[i + 1].x, points[i + 1].y)
    g.stroke({ color: 0xffcc44, width: 8 - t * 5, alpha: glowAlpha })
  }
}
