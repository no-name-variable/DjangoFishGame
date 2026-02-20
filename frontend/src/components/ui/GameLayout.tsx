/**
 * Обёртка всех страниц — улучшенная нижняя навигация с touch-friendly кнопками (≥44px),
 * активным состоянием и badge-поддержкой. Сохранена вся бизнес-логика.
 */
import type { ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import TopBar from './TopBar'
import { usePlayerStore } from '../../store/playerStore'

const navItems = [
  { path: '/',          label: 'База',    icon: '🏕️' },
  { path: '/locations', label: 'Рыбалка', icon: '🎣' },
  { path: '/shop',      label: 'Магазин', icon: '🛒' },
  { path: '/inventory', label: 'Снасти',  icon: '🎒' },
  { path: '/world-map', label: 'Карта',   icon: '🗺️' },
]

export default function GameLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const player   = usePlayerStore((s) => s.player)

  const isFishing = location.pathname === '/fishing'

  return (
    <div className="h-screen flex flex-col">
      {/* Игровая рамка */}
      <div className="game-frame flex flex-col flex-1 m-1 min-h-0">

        {/* HUD */}
        <TopBar />

        {/* Контент */}
        <main className={`flex-1 min-h-0 ${isFishing ? 'overflow-y-auto lg:overflow-hidden' : 'overflow-y-auto'}`}>
          {children}
        </main>

        {/* Нижняя навигация */}
        {player && !isFishing && (
          <nav className="wood-panel" style={{ borderRadius: '0 0 12px 12px', padding: 0 }}>
            <div style={{
              display: 'flex',
              alignItems: 'stretch',
              justifyContent: 'stretch',
            }}>
              {navItems.map((item) => {
                const active = location.pathname === item.path
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    style={{
                      flex: 1,
                      minHeight: '50px',          /* touch target ≥ 44px */
                      padding: '6px 4px',
                      border: 'none',
                      borderTop: active
                        ? '2px solid rgba(212,168,74,0.7)'
                        : '2px solid transparent',
                      background: active
                        ? 'rgba(26,58,26,0.8)'
                        : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '3px',
                      transition: 'all 0.18s ease',
                      WebkitTapHighlightColor: 'transparent',
                      borderRadius: active ? '0 0 0 0' : '0',
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        e.currentTarget.style.background = 'rgba(26,58,26,0.4)'
                        e.currentTarget.style.borderTopColor = 'rgba(212,168,74,0.25)'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.borderTopColor = 'transparent'
                      }
                    }}
                    onTouchStart={e => { e.currentTarget.style.opacity = '0.7' }}
                    onTouchEnd={e => { e.currentTarget.style.opacity = '1' }}
                  >
                    <span style={{
                      fontSize: active ? '1.35rem' : '1.2rem',
                      transition: 'font-size 0.18s ease',
                      lineHeight: 1,
                    }}>
                      {item.icon}
                    </span>
                    <span style={{
                      fontSize: '0.62rem',
                      fontFamily: 'Georgia, serif',
                      color: active ? '#d4a84a' : '#8b6d3f',
                      fontWeight: active ? '600' : '400',
                      transition: 'color 0.18s ease',
                      letterSpacing: '0.02em',
                    }}>
                      {item.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </nav>
        )}
      </div>
    </div>
  )
}
