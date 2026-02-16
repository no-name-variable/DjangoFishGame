/**
 * Леска от кончика удочки к поплавку (мульти-rod).
 * Удочка рисуется через RodBend.ts, здесь только леска.
 */
import { Graphics } from 'pixi.js'
import type { FloatConfig } from './FloatSprite'
import { toCanvasCoords } from './FloatSprite'

export function drawLine(
  g: Graphics,
  tipX: number,
  tipY: number,
  cfg: FloatConfig,
  frame: number,
  w: number, h: number, waterline: number,
) {
  const [floatX, floatY] = toCanvasCoords(cfg.castX, cfg.castY, w, h, waterline)
  const isActive = cfg.isActive
  const lineAlpha = isActive ? 0.7 : 0.3

  const isFighting = cfg.state === 'fighting'
  const isBite = cfg.state === 'bite'

  // Целевая точка лески
  let targetX = floatX
  let targetY = floatY
  if (isBite) {
    targetX += Math.sin(frame * 0.5) * 5
    targetY += Math.sin(frame * 0.04) * 2 + Math.sin(frame * 0.3) * 8
  } else if (isFighting) {
    targetX += Math.sin(frame * 0.4) * (cfg.tension * 0.05)
    targetY += Math.cos(frame * 0.3) * (cfg.tension * 0.03)
  } else {
    targetY += Math.sin(frame * 0.04 + cfg.phase) * 2
  }

  // Прогиб лески
  const lineSag = isFighting ? 5 + cfg.tension * 0.2 : 15
  const lcp1x = tipX + (targetX - tipX) * 0.3
  const lcp1y = tipY + lineSag
  const lcp2x = tipX + (targetX - tipX) * 0.7
  const lcp2y = targetY - 10 + (isFighting ? cfg.tension * 0.1 : 0)

  g.moveTo(tipX, tipY)
  g.bezierCurveTo(lcp1x, lcp1y, lcp2x, lcp2y, targetX, targetY)

  const lineColor = isFighting && cfg.tension > 70 ? 0xff4444 : 0xcccccc
  g.stroke({ color: lineColor, width: 1, alpha: lineAlpha })
}
