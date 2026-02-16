/**
 * Главное меню базы в стиле РР3.
 */
import { useNavigate } from 'react-router-dom'
import { usePlayerStore } from '../store/playerStore'

const menuItems = [
  { label: 'На рыбалку', path: '/locations', icon: '\u{1F3A3}' },
  { label: 'Магазин снастей', path: '/shop', icon: '\u{1F6D2}' },
  { label: 'Рюкзак', path: '/inventory', icon: '\u{1F392}' },
  { label: 'Квесты', path: '/quests', icon: '\u{1F4DC}' },
  { label: 'Турниры', path: '/tournaments', icon: '\u{2694}' },
  { label: 'Команда', path: '/team', icon: '\u{1F46B}' },
  { label: 'Газета', path: '/newspaper', icon: '\u{1F4F0}' },
  { label: 'Зелья', path: '/potions', icon: '\u{1F9EA}' },
  { label: 'Карта мира', path: '/world-map', icon: '\u{1F5FA}' },
  { label: 'Барахолка', path: '/bazaar', icon: '\u{1F3F7}' },
  { label: 'Рекорды', path: '/records', icon: '\u{1F3C6}' },
  { label: 'Профиль', path: '/profile', icon: '\u{1F464}' },
]

export default function BasePage() {
  const player = usePlayerStore((s) => s.player)
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-6">
      <h1 className="gold-text text-3xl mb-1">
        {player?.current_base_name || 'Рыболовная база'}
      </h1>
      <p className="text-wood-500 text-sm mb-6">
        Добро пожаловать, {player?.nickname}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 w-full max-w-3xl">
        {menuItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="wood-panel hover:border-gold/40 transition-all text-center py-5 px-3 group"
          >
            <span className="text-3xl block mb-2 group-hover:scale-110 transition-transform">
              {item.icon}
            </span>
            <span className="font-serif text-sm text-wood-200 group-hover:text-gold transition-colors">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
