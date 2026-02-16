/**
 * Страница входа / регистрации в стиле РР3.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, register, getProfile } from '../api/auth'
import { usePlayerStore } from '../store/playerStore'

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const setTokens = usePlayerStore((s) => s.setTokens)
  const setPlayer = usePlayerStore((s) => s.setPlayer)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isRegister) {
        await register(username, password, nickname)
      }
      const tokens = await login(username, password)
      setTokens(tokens.access, tokens.refresh)
      const profile = await getProfile()
      setPlayer(profile)
      navigate('/')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Ошибка. Проверьте данные.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: 'radial-gradient(ellipse at 50% 120%, #1a3a1a 0%, #0d1f0d 40%, #050d05 100%)',
      }}
    >
      {/* Декоративные элементы */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute bottom-0 left-0 right-0 h-32 opacity-20"
          style={{
            background: 'linear-gradient(to top, #1a2a4a, transparent)',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Заголовок */}
        <div className="text-center mb-6">
          <h1 className="gold-text text-4xl mb-1">Русская Рыбалка</h1>
          <div className="w-48 h-0.5 bg-gradient-to-r from-transparent via-gold/50 to-transparent mx-auto" />
        </div>

        {/* Форма в деревянной рамке */}
        <div className="wood-panel p-6">
          <h2 className="font-serif text-lg text-wood-200 text-center mb-4">
            {isRegister ? 'Регистрация' : 'Вход в игру'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-wood-400 mb-1 font-serif">Логин</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="game-input"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-wood-400 mb-1 font-serif">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="game-input"
                required
                minLength={6}
              />
            </div>

            {isRegister && (
              <div>
                <label className="block text-xs text-wood-400 mb-1 font-serif">Никнейм</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="game-input"
                  required
                />
              </div>
            )}

            {error && (
              <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/30 rounded px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-2.5 text-base"
            >
              {loading ? 'Загрузка...' : isRegister ? 'Зарегистрироваться' : 'Войти'}
            </button>

            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="w-full text-center text-sm text-wood-500 hover:text-gold transition-colors"
            >
              {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Регистрация'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
