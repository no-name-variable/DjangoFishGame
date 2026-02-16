/**
 * Canvas-сцена водоёма на PixiJS 8 — оркестратор, клик-обработка.
 * Мульти-удочки: каждая сессия — свой поплавок, леска, удочка с динамическим изгибом.
 */
import { useEffect, useRef, useCallback } from 'react'
import { Application, Graphics, Container, Sprite, Assets, Texture, FederatedPointerEvent } from 'pixi.js'
import type { SessionInfo, FightInfo } from '../../store/fishingStore'
import {
  drawFallbackBg, drawTimeOverlay, drawWaves, drawGlare, drawMoonPath,
} from './water/WaterEffects'
import {
  drawFloat, drawRipples, drawBiteIndicator,
  type FloatConfig,
} from './water/FloatSprite'
import { drawLine } from './water/RodAndLine'
import {
  drawCastAnimation, createCastAnim,
  type CastAnimState,
} from './water/CastAnimation'
import {
  createRodAnimState, updateRodAnim,
  calcRodPoints, drawSegmentedRod, drawRodGlow,
  type RodAnimState,
} from './water/RodBend'
import { calcMultiRodLayout } from './water/MultiRodLayout'

interface WaterSceneProps {
  sessions: SessionInfo[]
  fights: Record<number, FightInfo>
  activeSessionId: number | null
  timeOfDay?: string
  locationImageUrl?: string | null
  onWaterClick: (normX: number, normY: number) => void
  onFloatClick: (sessionId: number) => void
}

const WATERLINE_RATIO = 0.3
const FLOAT_HIT_RADIUS = 25

export default function WaterScene({
  sessions, fights, activeSessionId,
  timeOfDay = 'day', locationImageUrl,
  onWaterClick, onFloatClick,
}: WaterSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)
  const frameRef = useRef(0)

  // Рефы для данных, которые обновляются без пересоздания сцены
  const sessionsRef = useRef(sessions)
  const fightsRef = useRef(fights)
  const activeIdRef = useRef(activeSessionId)
  const timeRef = useRef(timeOfDay)
  const castAnimsRef = useRef<CastAnimState[]>([])
  const phasesRef = useRef<Record<number, { phase: number; biteAngle: number }>>({})

  // Состояния анимации удочек — сохраняем между кадрами
  const rodAnimStatesRef = useRef<Map<number, RodAnimState>>(new Map())

  sessionsRef.current = sessions
  fightsRef.current = fights
  activeIdRef.current = activeSessionId
  timeRef.current = timeOfDay

  // Генерация/сохранение случайных фаз для каждой сессии
  const getPhases = useCallback((sessionId: number) => {
    if (!phasesRef.current[sessionId]) {
      phasesRef.current[sessionId] = {
        phase: Math.random() * Math.PI * 2,
        biteAngle: (Math.random() - 0.5) * Math.PI,
      }
    }
    return phasesRef.current[sessionId]
  }, [])

  // Получить или создать RodAnimState
  const getRodAnimState = useCallback((sessionId: number) => {
    const map = rodAnimStatesRef.current
    if (!map.has(sessionId)) {
      map.set(sessionId, createRodAnimState())
    }
    return map.get(sessionId)!
  }, [])

  // Регистрация анимации заброса (с вычислением originX/originY)
  const addCastAnim = useCallback((sessionId: number, castX: number, castY: number) => {
    // Позиция кончика новой удочки
    const app = appRef.current
    if (!app) return
    const w = app.screen.width
    const h = app.screen.height

    // Количество сессий после заброса (текущие + 1)
    const nonIdle = sessionsRef.current.filter((s) => s.state !== 'idle')
    const rodCount = nonIdle.length + 1
    const slotIndex = rodCount - 1

    const layout = calcMultiRodLayout(w, h, rodCount, slotIndex)
    // Грубая оценка кончика по baseAngle и длине
    const tipX = layout.baseX + Math.cos(layout.baseAngle) * layout.rodLength
    const tipY = layout.baseY + Math.sin(layout.baseAngle) * layout.rodLength

    castAnimsRef.current.push(
      createCastAnim(sessionId, castX, castY, frameRef.current, tipX, tipY),
    )
  }, [])

  // Сохраняем addCastAnim в ref чтобы FishingPage мог вызвать
  const addCastAnimRef = useRef(addCastAnim)
  addCastAnimRef.current = addCastAnim

  // Обработчик кликов — выставляем через ref, чтобы не пересоздавать сцену
  const onWaterClickRef = useRef(onWaterClick)
  const onFloatClickRef = useRef(onFloatClick)
  onWaterClickRef.current = onWaterClick
  onFloatClickRef.current = onFloatClick

  const initApp = useCallback(async () => {
    if (!containerRef.current || appRef.current) return

    const app = new Application()
    await app.init({
      resizeTo: containerRef.current,
      backgroundAlpha: 0,
      backgroundColor: 0x0a1828,
      antialias: true,
    })
    containerRef.current.appendChild(app.canvas)
    appRef.current = app

    const w = app.screen.width
    const h = app.screen.height
    const waterline = h * WATERLINE_RATIO

    // Слои
    const bgLayer = new Container()
    const waterFxLayer = new Container()
    const sceneLayer = new Container()
    app.stage.addChild(bgLayer, waterFxLayer, sceneLayer)

    // Фон
    let bgSprite: Sprite | null = null
    const bgFallback = new Graphics()
    bgLayer.addChild(bgFallback)

    if (locationImageUrl) {
      try {
        const texture: Texture = await Assets.load(locationImageUrl)
        bgSprite = new Sprite(texture)
        const scale = Math.max(w / texture.width, h / texture.height)
        bgSprite.width = texture.width * scale
        bgSprite.height = texture.height * scale
        bgSprite.x = (w - bgSprite.width) / 2
        bgSprite.y = (h - bgSprite.height) / 2
        bgLayer.addChildAt(bgSprite, 0)
      } catch {
        bgSprite = null
      }
    }

    // Эффекты
    const timeOverlay = new Graphics()
    const waves = new Graphics()
    const glare = new Graphics()
    const moonPath = new Graphics()
    waterFxLayer.addChild(timeOverlay, waves, glare, moonPath)

    // Сцена: удочки, лески, поплавки, круги, анимации заброса
    const rodsGfx = new Graphics()
    const rodGlowGfx = new Graphics()
    const lines = new Graphics()
    const floats = new Graphics()
    const ripples = new Graphics()
    const castAnims = new Graphics()
    const indicators = new Graphics()
    sceneLayer.addChild(rodGlowGfx, rodsGfx, lines, castAnims, ripples, floats, indicators)

    // Клик по сцене
    app.stage.eventMode = 'static'
    app.stage.hitArea = app.screen
    app.stage.on('pointerdown', (e: FederatedPointerEvent) => {
      const px = e.globalX
      const py = e.globalY

      // Проверяем клик по поплавку (hitTest)
      const curSessions = sessionsRef.current
      for (const s of curSessions) {
        if (s.state === 'idle') continue
        const cx = (s.castX / 100) * w
        const cy = waterline + (s.castY / 100) * (h - waterline)
        const dist = Math.hypot(px - cx, py - cy)
        if (dist < FLOAT_HIT_RADIUS) {
          onFloatClickRef.current(s.id)
          return
        }
      }

      // Клик ниже waterline = заброс
      if (py > waterline) {
        const normX = (px / w) * 100
        const normY = ((py - waterline) / (h - waterline)) * 100
        onWaterClickRef.current(
          Math.max(0, Math.min(100, normX)),
          Math.max(0, Math.min(100, normY)),
        )
      }
    })

    const drawFrame = () => {
      frameRef.current++
      const f = frameRef.current
      const curSessions = sessionsRef.current
      const curFights = fightsRef.current
      const activeId = activeIdRef.current
      const tod = timeRef.current

      // Fallback-фон
      bgFallback.clear()
      if (!bgSprite) {
        drawFallbackBg(bgFallback, w, h, waterline, tod)
      }

      // Эффекты
      timeOverlay.clear()
      drawTimeOverlay(timeOverlay, w, h, tod)

      waves.clear()
      drawWaves(waves, w, h, waterline, f, tod)

      glare.clear()
      drawGlare(glare, w, waterline, h, f, tod)

      moonPath.clear()
      drawMoonPath(moonPath, w, waterline, h, f, tod)

      // Сбор данных для мульти-удочек
      const nonIdleSessions = curSessions.filter((s) => s.state !== 'idle')
      const rodCount = nonIdleSessions.length

      // Очистка устаревших animState
      const activeIds = new Set(nonIdleSessions.map((s) => s.id))
      const animMap = rodAnimStatesRef.current
      for (const key of animMap.keys()) {
        if (!activeIds.has(key)) animMap.delete(key)
      }

      // Подготовка данных рендера удочек: неактивные первыми, активная поверх
      interface RodDrawInfo {
        sessionId: number
        slotIndex: number
        isActive: boolean
        fishingState: SessionInfo['state']
        tension: number
        session: SessionInfo
      }

      const rodDrawInfos: RodDrawInfo[] = nonIdleSessions.map((s, i) => ({
        sessionId: s.id,
        slotIndex: i,
        isActive: s.id === activeId,
        fishingState: s.state,
        tension: curFights[s.id]?.tension || 0,
        session: s,
      }))

      // Сортировка: неактивные первыми, активная последней (рисуется поверх)
      rodDrawInfos.sort((a, b) => (a.isActive ? 1 : 0) - (b.isActive ? 1 : 0))

      // Отрисовка удочек
      rodsGfx.clear()
      rodGlowGfx.clear()
      lines.clear()
      floats.clear()
      ripples.clear()
      indicators.clear()

      for (const info of rodDrawInfos) {
        const layout = calcMultiRodLayout(w, h, rodCount, info.slotIndex)
        const animState = getRodAnimState(info.sessionId)

        // Обновить анимацию
        updateRodAnim(animState, info.fishingState, info.tension, f)

        // Вычислить точки удочки
        const points = calcRodPoints(
          layout.baseX, layout.baseY,
          layout.rodLength, layout.baseAngle,
          animState.angles,
        )

        // Glow для активной
        if (info.isActive) {
          drawRodGlow(rodGlowGfx, points)
        }

        // Удочка
        drawSegmentedRod(rodsGfx, points, info.isActive)

        // Кончик удочки
        const tip = points[points.length - 1]

        // Леска
        const phases = getPhases(info.sessionId)
        const cfg: FloatConfig = {
          sessionId: info.sessionId,
          castX: info.session.castX,
          castY: info.session.castY,
          state: info.fishingState,
          isActive: info.isActive,
          tension: info.tension,
          phase: phases.phase,
          biteAngle: phases.biteAngle,
        }
        drawLine(lines, tip.x, tip.y, cfg, f, w, h, waterline)

        // Поплавок
        drawFloat(floats, cfg, f, w, h, waterline)

        // Круги на воде
        drawRipples(ripples, cfg, f, w, h, waterline)

        // Индикатор поклёвки на неактивной удочке
        drawBiteIndicator(indicators, cfg, f, w, h, waterline)
      }

      // Анимации заброса
      castAnims.clear()
      castAnimsRef.current = castAnimsRef.current.filter((anim) => {
        const done = drawCastAnimation(castAnims, anim, f, w, h, waterline)
        return !done
      })
    }

    app.ticker.add(() => drawFrame())

    return () => {
      app.destroy(true, { children: true })
      appRef.current = null
    }
  }, [locationImageUrl, getPhases, getRodAnimState])

  useEffect(() => {
    const cleanup = initApp()
    return () => { cleanup.then((fn) => fn?.()) }
  }, [initApp])

  // Экспортируем addCastAnim через DOM data-атрибут (для FishingPage)
  useEffect(() => {
    if (containerRef.current) {
      (containerRef.current as HTMLDivElement & { __addCastAnim?: typeof addCastAnim }).__addCastAnim = addCastAnim
    }
  }, [addCastAnim])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
    />
  )
}
