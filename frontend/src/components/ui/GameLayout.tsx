/**
 * Обёртка всех страниц — рамка игрового окна в стиле РР3.
 */
import { useNavigate, useLocation } from 'react-router-dom'
import TopBar from './TopBar'
import { usePlayerStore } from '../../store/playerStore'

const navItems = [
  { path: '/', label: 'База', icon: '\u{1F3E0}' },
  { path: '/locations', label: 'Рыбалка', icon: '\u{1F3A3}' },
  { path: '/shop', label: 'Магазин', icon: '\u{1F6D2}' },
  { path: '/inventory', label: 'Снасти', icon: '\u{1F392}' },
  { path: '/world-map', label: 'Карта', icon: '\u{1F5FA}' },
]

export default function GameLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const player = usePlayerStore((s) => s.player)

  const isFishing = location.pathname === '/fishing'

  return (
    <div className="h-screen flex flex-col">
      {/* Верхняя рамка */}
      <div className="game-frame flex flex-col flex-1 m-1 min-h-0">
        {/* HUD */}
        <TopBar />

        {/* Контент */}
        <main className={`flex-1 min-h-0 ${isFishing ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {children}
        </main>

        {/* Нижняя навигация */}
        {player && !isFishing && (
          <nav className="wood-panel rounded-none rounded-b-lg">
            <div className="flex items-center justify-center gap-1 px-2 py-1.5">
              {navItems.map((item) => {
                const active = location.pathname === item.path
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded transition-all text-sm font-serif ${
                      active
                        ? 'bg-forest-700/80 text-gold border border-gold/30'
                        : 'text-wood-300 hover:text-gold hover:bg-forest-800/60 border border-transparent'
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
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
