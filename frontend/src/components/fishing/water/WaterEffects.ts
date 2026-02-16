/**
 * Водные эффекты: рябь, блики солнца, лунная дорожка, оверлей времени суток.
 */
import { Graphics } from 'pixi.js'

/** Оверлей затемнения по времени суток */
const TIME_OVERLAY: Record<string, { color: number; alpha: number }> = {
  morning: { color: 0xffd080, alpha: 0.08 },
  day:     { color: 0x000000, alpha: 0 },
  evening: { color: 0x1a0a20, alpha: 0.25 },
  night:   { color: 0x000010, alpha: 0.4 },
}

/** Цвет ряби по времени суток */
const RIPPLE_COLORS: Record<string, number> = {
  morning: 0xffeebb,
  day:     0xffffff,
  evening: 0xffaacc,
  night:   0xccddff,
}

/** Fallback-цвета (если нет фото) */
export const FALLBACK_COLORS: Record<string, { sky: number; water: number; waterDeep: number }> = {
  morning: { sky: 0x2a4a6a, water: 0x1a4060, waterDeep: 0x0a2040 },
  day:     { sky: 0x3a6a9a, water: 0x1a5070, waterDeep: 0x0a3050 },
  evening: { sky: 0x4a3040, water: 0x1a3050, waterDeep: 0x0a1830 },
  night:   { sky: 0x0a1020, water: 0x081828, waterDeep: 0x040c18 },
}

export function drawFallbackBg(
  g: Graphics, w: number, h: number, waterline: number, tod: string,
) {
  const colors = FALLBACK_COLORS[tod] || FALLBACK_COLORS.day
  g.rect(0, 0, w, waterline)
  g.fill(colors.sky)
  g.rect(0, waterline, w, h - waterline)
  g.fill(colors.water)
  for (let i = 0; i < 30; i++) {
    const y = waterline + (h - waterline) * (i / 30)
    g.rect(0, y, w, (h - waterline) / 30)
    g.fill({ color: colors.waterDeep, alpha: i / 60 })
  }
}

export function drawTimeOverlay(
  g: Graphics, w: number, h: number, tod: string,
) {
  const overlay = TIME_OVERLAY[tod] || TIME_OVERLAY.day
  if (overlay.alpha > 0) {
    g.rect(0, 0, w, h)
    g.fill({ color: overlay.color, alpha: overlay.alpha })
  }
}

export function drawWaves(
  g: Graphics, w: number, h: number, waterline: number, frame: number, tod: string,
) {
  const rippleColor = RIPPLE_COLORS[tod] || RIPPLE_COLORS.day
  for (let i = 0; i < 8; i++) {
    const wy = waterline + i * 22 + 10
    if (wy > h) break
    const alpha = 0.1 - i * 0.012
    g.moveTo(0, wy)
    for (let x = 0; x <= w; x += 4) {
      const yOff = Math.sin(x * 0.015 + frame * 0.04 + i * 60) * (3 - i * 0.3)
        + Math.sin(x * 0.008 + frame * 0.027 + i * 40) * (2 - i * 0.2)
      g.lineTo(x, wy + yOff)
    }
    g.stroke({ color: rippleColor, alpha: Math.max(0.01, alpha), width: 1 })
  }
}

export function drawGlare(
  g: Graphics, w: number, waterline: number, h: number, frame: number, tod: string,
) {
  if (tod !== 'morning' && tod !== 'day') return
  const glareColor = tod === 'morning' ? 0xffeedd : 0xffffff
  for (let i = 0; i < 12; i++) {
    const gx = (w * 0.1) + (i * w * 0.07) + Math.sin(frame * 0.01 + i * 2) * 15
    const gy = waterline + 20 + (i % 3) * 40 + Math.sin(frame * 0.015 + i) * 10
    if (gy > h) continue
    const pulse = Math.sin(frame * 0.03 + i * 0.7) * 0.5 + 0.5
    const r = 2 + pulse * 3
    g.circle(gx, gy, r)
    g.fill({ color: glareColor, alpha: pulse * 0.15 })
  }
}

export function drawMoonPath(
  g: Graphics, w: number, waterline: number, h: number, frame: number, tod: string,
) {
  if (tod !== 'night') return
  const mpCenterX = w * 0.4
  const mpWidth = w * 0.06
  for (let y = waterline + 5; y < h; y += 3) {
    const depth = (y - waterline) / (h - waterline)
    const wobble = Math.sin(y * 0.04 + frame * 0.02) * 8
    const alpha = 0.18 * (1 - depth * 0.7)
    const sw = mpWidth * (0.3 + depth * 0.7)
    g.rect(mpCenterX - sw / 2 + wobble, y, sw, 3)
    g.fill({ color: 0xccddff, alpha })
  }
}
