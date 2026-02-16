/**
 * Анимация заброса — параболическая дуга от кончика удочки до точки клика.
 */
import { Graphics } from 'pixi.js'
import { toCanvasCoords } from './FloatSprite'

export interface CastAnimState {
  sessionId: number
  castX: number
  castY: number
  originX: number   // кончик удочки — начало дуги
  originY: number
  startFrame: number
  durationFrames: number // ~30 кадров = 0.5с при 60fps
}

const CAST_DURATION = 30

export function createCastAnim(
  sessionId: number, castX: number, castY: number,
  currentFrame: number,
  originX: number, originY: number,
): CastAnimState {
  return {
    sessionId,
    castX,
    castY,
    originX,
    originY,
    startFrame: currentFrame,
    durationFrames: CAST_DURATION,
  }
}

export function drawCastAnimation(
  g: Graphics,
  anim: CastAnimState,
  frame: number,
  w: number, h: number, waterline: number,
): boolean {
  const elapsed = frame - anim.startFrame
  if (elapsed >= anim.durationFrames) return true // анимация завершена

  const t = elapsed / anim.durationFrames
  const [targetX, targetY] = toCanvasCoords(anim.castX, anim.castY, w, h, waterline)

  const tipX = anim.originX
  const tipY = anim.originY

  // Параболическая дуга
  const arcHeight = -80 * (1 - t) * t * 4 // перевёрнутая парабола
  const x = tipX + (targetX - tipX) * t
  const y = tipY + (targetY - tipY) * t + arcHeight

  // Грузило/поплавок в полёте
  g.circle(x, y, 3)
  g.fill({ color: 0xff4444, alpha: 0.8 })

  // Леска до точки полёта
  g.moveTo(tipX, tipY)
  g.lineTo(x, y)
  g.stroke({ color: 0xcccccc, width: 1, alpha: 0.5 })

  // Всплеск при приводнении (последние 5 кадров)
  if (t > 0.8) {
    const splashProgress = (t - 0.8) / 0.2
    const splashRadius = splashProgress * 15
    g.circle(targetX, targetY, splashRadius)
    g.stroke({ color: 0xffffff, alpha: 0.4 * (1 - splashProgress), width: 2 })
  }

  return false
}
