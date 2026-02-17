/**
 * Главное меню базы — улучшенный UI с группировкой, атмосферным фоном и mobile-first подходом.
 * Сохранена деревянная цветовая схема; добавлена визуальная иерархия и анимации.
 */
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayerStore } from '../store/playerStore'
import { useFishingStore } from '../store/fishingStore'

/* ─── Данные меню ─────────────────────────────────────────────── */

interface MenuItem {
  label: string
  path: string
  icon: string
  desc: string
}

const coreItems: MenuItem[] = [
  { label: 'Рюкзак',          path: '/inventory', icon: '🎒', desc: 'Снасти, рыба, предметы' },
  { label: 'Магазин снастей', path: '/shop',      icon: '🛒', desc: 'Купить снаряжение'       },
]

const socialItems: MenuItem[] = [
  { label: 'Турниры', path: '/tournaments', icon: '⚔️',  desc: 'Соревнования' },
  { label: 'Команда', path: '/team',        icon: '👫',  desc: 'Клуб и соратники' },
  { label: 'Рекорды', path: '/records',     icon: '🏆',  desc: 'Лучшие уловы' },
  { label: 'Квесты',  path: '/quests',      icon: '📜',  desc: 'Задания и награды' },
]

const miscItems: MenuItem[] = [
  { label: 'Зелья',      path: '/potions',   icon: '🧪',  desc: 'Варить и применять' },
  { label: 'Барахолка',  path: '/bazaar',    icon: '🏷️', desc: 'Торговля игроков' },
  { label: 'Карта мира', path: '/world-map', icon: '🗺️', desc: 'Все локации' },
  { label: 'Газета',     path: '/newspaper', icon: '📰',  desc: 'Новости рыбалки' },
  { label: 'Профиль',    path: '/profile',   icon: '👤',  desc: 'Статистика' },
]

const timeOfDayMeta: Record<string, { icon: string; label: string }> = {
  dawn:     { icon: '🌅', label: 'Рассвет' },
  morning:  { icon: '🌤️', label: 'Утро'    },
  day:      { icon: '☀️',  label: 'День'    },
  evening:  { icon: '🌇', label: 'Вечер'   },
  night:    { icon: '🌙', label: 'Ночь'    },
  midnight: { icon: '🌑', label: 'Полночь' },
}

/* ─── Подкомпоненты ───────────────────────────────────────────── */

/** Атмосферный фон: деревья + вода + туман + светлячки */
function AtmosphericBg() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {/* Небо */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, #071207 0%, #0d1f0d 35%, #0a1525 65%, #12203a 100%)',
      }} />

      {/* Силуэт деревьев */}
      <svg viewBox="0 0 1440 110" preserveAspectRatio="none"
        style={{ position: 'absolute', bottom: '28%', left: 0, width: '100%', height: '90px' }}>
        <path d="M0 110 L0 68 Q25 18 48 54 Q68 4 90 42 Q112 10 134 46 Q154 20 172 50
                 Q192 6 218 44 Q238 22 258 50 Q278 6 300 44 Q320 20 345 52 Q368 0 395 38
                 Q420 16 445 46 Q468 2 492 38 Q515 20 535 50 Q558 8 582 44 Q605 24 625 52
                 Q648 0 675 38 Q698 16 722 46 Q745 4 768 38 Q792 18 815 50 Q835 28 858 54
                 Q878 8 902 44 Q925 20 948 50 Q972 4 995 38 Q1018 20 1040 50 Q1062 8 1085 44
                 Q1108 18 1128 48 Q1148 8 1172 44 Q1195 22 1218 50 Q1240 0 1268 36
                 Q1290 18 1312 48 Q1335 6 1358 40 Q1382 22 1405 48 L1440 48 L1440 110 Z"
          fill="#030c03" />
      </svg>

      {/* Водная поверхность */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%',
        background: 'linear-gradient(to bottom, rgba(20,36,68,0.55) 0%, rgba(8,14,28,0.92) 100%)',
        overflow: 'hidden',
      }}>
        {/* Волны */}
        <svg viewBox="0 0 2880 70" preserveAspectRatio="none"
          style={{ position: 'absolute', top: 0, left: 0, width: '200%', height: '70px',
                   animation: 'waterScroll 12s linear infinite' }}>
          <path d="M0 28 Q180 10 360 28 Q540 46 720 28 Q900 10 1080 28 Q1260 46 1440 28
                   Q1620 10 1800 28 Q1980 46 2160 28 Q2340 10 2520 28 Q2700 46 2880 28"
            fill="none" stroke="rgba(100,140,190,0.22)" strokeWidth="2" />
          <path d="M0 46 Q360 28 720 46 Q1080 64 1440 46 Q1800 28 2160 46 Q2520 64 2880 46"
            fill="none" stroke="rgba(100,140,190,0.12)" strokeWidth="1.5" />
          <path d="M0 60 Q360 78 720 60 Q1080 42 1440 60 Q1800 78 2160 60 Q2520 42 2880 60"
            fill="none" stroke="rgba(100,140,190,0.07)" strokeWidth="1" />
        </svg>
        {/* Блики на воде */}
        {[12, 31, 54, 70, 85].map((left, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: `${15 + (i * 12) % 40}%`,
            left: `${left}%`,
            width: '5px', height: '2px',
            borderRadius: '50%',
            background: 'rgba(180, 210, 255, 0.4)',
            animation: `floatParticle ${2.5 + i * 0.5}s ${i * 0.6}s ease-in-out infinite alternate`,
          }} />
        ))}
      </div>

      {/* Туман у воды */}
      <div style={{
        position: 'absolute', bottom: '24%', left: '-10%', right: '-10%', height: '12%',
        background: 'radial-gradient(ellipse 80% 100% at 50% 50%, rgba(130,180,100,0.07) 0%, transparent 70%)',
        animation: 'fogDrift 14s ease-in-out infinite',
      }} />

      {/* Светлячки */}
      {[9, 24, 42, 60, 76, 89].map((left, i) => (
        <div key={i} style={{
          position: 'absolute',
          bottom: `${30 + (i * 4) % 14}%`,
          left: `${left}%`,
          width: i % 2 === 0 ? '3px' : '2px',
          height: i % 2 === 0 ? '3px' : '2px',
          borderRadius: '50%',
          background: 'rgba(210, 200, 90, 0.9)',
          boxShadow: '0 0 7px 2px rgba(210, 200, 90, 0.5)',
          animation: `floatParticle ${3.2 + i * 0.55}s ${i * 0.65}s ease-out infinite`,
        }} />
      ))}
    </div>
  )
}

/** Разделитель с подписью секции */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, rgba(92,61,30,0.55))' }} />
      <span style={{ color: '#8b6d3f', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>
        {children}
      </span>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, rgba(92,61,30,0.55))' }} />
    </div>
  )
}

/** Главная кнопка «На рыбалку!» */
function PrimaryFishingButton({ navigate }: { navigate: (p: string) => void }) {
  return (
    <button
      onClick={() => navigate('/locations')}
      style={{
        width: '100%',
        minHeight: '80px',
        padding: '18px 22px',
        borderRadius: '14px',
        background: 'linear-gradient(135deg, #1a5a1a 0%, #2a6e2a 50%, #1a5a1a 100%)',
        border: '2px solid rgba(212,168,74,0.45)',
        boxShadow: '0 8px 28px rgba(46,125,46,0.35), inset 0 1px 0 rgba(255,255,255,0.1)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        textAlign: 'left',
        position: 'relative',
        overflow: 'hidden',
        WebkitTapHighlightColor: 'transparent',
        animation: 'glowPulse 4s ease-in-out infinite',
        transition: 'transform 0.2s ease, border-color 0.2s ease',
      }}
      onMouseEnter={e => Object.assign(e.currentTarget.style, {
        transform: 'translateY(-3px)',
        borderColor: 'rgba(212,168,74,0.8)',
      })}
      onMouseLeave={e => Object.assign(e.currentTarget.style, {
        transform: 'translateY(0)',
        borderColor: 'rgba(212,168,74,0.45)',
      })}
      onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
      onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      {/* Иконка с анимацией */}
      <span style={{ fontSize: '2.8rem', animation: 'fishSwim 2.5s ease-in-out infinite', flexShrink: 0 }}>
        🎣
      </span>

      {/* Текст */}
      <div style={{ flex: 1 }}>
        <div className="gold-text" style={{ fontSize: 'clamp(1.2rem, 4vw, 1.5rem)', fontWeight: 'bold', lineHeight: 1.1, marginBottom: '3px' }}>
          На рыбалку!
        </div>
        <div style={{ color: 'rgba(212,168,74,0.55)', fontSize: '0.72rem' }}>
          Выбрать место и закинуть удочку
        </div>
      </div>

      {/* Стрелка-индикатор */}
      <span style={{ color: 'rgba(212,168,74,0.6)', fontSize: '1.4rem', flexShrink: 0 }}>›</span>

      {/* Shimmer */}
      <div style={{
        position: 'absolute', top: 0, left: '-120%', width: '70%', height: '100%',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
        animation: 'ctaShimmer 3.5s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
    </button>
  )
}

/** Карточка среднего размера (Рюкзак, Магазин, Команда и т.д.) */
function MenuCard({ item, navigate }: { item: MenuItem; navigate: (p: string) => void }) {
  return (
    <button
      onClick={() => navigate(item.path)}
      className="wood-panel"
      style={{
        padding: '14px 10px',
        borderRadius: '12px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        minHeight: '80px',
        transition: 'transform 0.18s ease, border-color 0.18s ease',
        WebkitTapHighlightColor: 'transparent',
        border: '1px solid rgba(92,61,30,0.5)',
      }}
      onMouseEnter={e => Object.assign(e.currentTarget.style, {
        transform: 'translateY(-2px)',
        borderColor: 'rgba(212,168,74,0.4)',
      })}
      onMouseLeave={e => Object.assign(e.currentTarget.style, {
        transform: 'translateY(0)',
        borderColor: 'rgba(92,61,30,0.5)',
      })}
      onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.94)' }}
      onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      <span style={{ fontSize: '2rem' }}>{item.icon}</span>
      <span style={{ color: '#d4c5a9', fontSize: '0.8rem', fontFamily: 'Georgia, serif', textAlign: 'center', lineHeight: 1.25 }}>
        {item.label}
      </span>
    </button>
  )
}

/** Компактная карточка для прочих пунктов */
function SmallCard({ item, navigate }: { item: MenuItem; navigate: (p: string) => void }) {
  return (
    <button
      onClick={() => navigate(item.path)}
      style={{
        padding: '10px 6px',
        borderRadius: '10px',
        background: 'rgba(13,31,13,0.75)',
        border: '1px solid rgba(74,49,24,0.5)',
        backdropFilter: 'blur(6px)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '5px',
        minHeight: '66px',
        transition: 'transform 0.18s ease, border-color 0.18s ease',
        WebkitTapHighlightColor: 'transparent',
      }}
      onMouseEnter={e => Object.assign(e.currentTarget.style, {
        transform: 'translateY(-2px)',
        borderColor: 'rgba(212,168,74,0.3)',
        background: 'rgba(26,42,26,0.8)',
      })}
      onMouseLeave={e => Object.assign(e.currentTarget.style, {
        transform: 'translateY(0)',
        borderColor: 'rgba(74,49,24,0.5)',
        background: 'rgba(13,31,13,0.75)',
      })}
      onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.93)' }}
      onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
      <span style={{ color: '#c0a87a', fontSize: '0.68rem', fontFamily: 'Georgia, serif', textAlign: 'center', lineHeight: 1.25 }}>
        {item.label}
      </span>
    </button>
  )
}

/* ─── Главный компонент ────────────────────────────────────────── */

export default function BasePage() {
  const player   = usePlayerStore((s) => s.player)
  const gameTime = useFishingStore((s) => s.gameTime)
  const navigate = useNavigate()

  const todMeta = gameTime?.time_of_day
    ? (timeOfDayMeta[gameTime.time_of_day] ?? timeOfDayMeta.day)
    : timeOfDayMeta.morning

  return (
    <div style={{ position: 'relative', minHeight: '100%' }}>
      {/* Атмосферный фон */}
      <AtmosphericBg />

      {/* Контент поверх фона */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        padding: '14px 14px 28px',
        maxWidth: '680px',
        margin: '0 auto',
      }}>

        {/* ── Шапка ── */}
        <header style={{ textAlign: 'center', marginBottom: '18px' }}>
          <h1 className="gold-text" style={{ fontSize: 'clamp(1.3rem, 5vw, 1.85rem)', marginBottom: '3px' }}>
            {player?.current_base_name || 'Рыболовная база'}
          </h1>
          <p style={{ color: '#8b6d3f', fontSize: '0.78rem', marginBottom: '8px' }}>
            Добро пожаловать,{' '}
            <strong style={{ color: '#a8894e' }}>{player?.nickname}</strong>
          </p>

          {/* Виджет времени */}
          {gameTime && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 14px',
              borderRadius: '20px',
              background: 'rgba(10,16,32,0.7)',
              border: '1px solid rgba(120,152,184,0.22)',
              fontSize: '0.72rem',
              color: '#7898b8',
            }}>
              <span>{todMeta.icon}</span>
              <span>{todMeta.label}</span>
              <span style={{ opacity: 0.4 }}>|</span>
              <span>⏰ {String(gameTime.hour).padStart(2, '0')}:00</span>
              <span style={{ opacity: 0.4 }}>|</span>
              <span>📅 День {gameTime.day}</span>
            </div>
          )}
        </header>

        {/* ── Секция 1: Рыбалка ── */}
        <section style={{ marginBottom: '16px' }}>
          <SectionLabel>Рыбалка</SectionLabel>

          {/* Главная CTA */}
          <div style={{ marginBottom: '10px' }}>
            <PrimaryFishingButton navigate={navigate} />
          </div>

          {/* Рюкзак + Магазин */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {coreItems.map(item => (
              <MenuCard key={item.path} item={item} navigate={navigate} />
            ))}
          </div>
        </section>

        {/* ── Секция 2: Соревнования ── */}
        <section style={{ marginBottom: '16px' }}>
          <SectionLabel>Соревнования</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {socialItems.map(item => (
              <MenuCard key={item.path} item={item} navigate={navigate} />
            ))}
          </div>
        </section>

        {/* ── Секция 3: Прочее ── */}
        <section>
          <SectionLabel>Прочее</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {miscItems.map(item => (
              <SmallCard key={item.path} item={item} navigate={navigate} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
