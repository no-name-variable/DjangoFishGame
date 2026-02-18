/**
 * Модальное окно пойманной рыбы — деревянная рамка, пергамент, анимации.
 */
import GameImage from '../ui/GameImage'
import { getFallbackUrl } from '../../utils/getAssetUrl'

interface CaughtFishModalProps {
  fish: string
  speciesImage?: string | null
  weight: number
  length: number
  rarity: string
  error?: string | null
  onKeep: () => void
  onRelease: () => void
}

const RARITY_CFG: Record<string, {
  textColor: string
  bg: string
  border: string
  glow: string
  name: string
  icon: string
}> = {
  common:    { textColor: '#a8894e', bg: 'rgba(92,61,30,0.25)',    border: 'rgba(92,61,30,0.5)',      glow: 'none',                                     name: 'Обычная',     icon: '🐟' },
  uncommon:  { textColor: '#4ade80', bg: 'rgba(22,101,52,0.25)',   border: 'rgba(74,222,128,0.35)',   glow: '0 0 16px rgba(74,222,128,0.3)',             name: 'Необычная',   icon: '🐠' },
  rare:      { textColor: '#60a5fa', bg: 'rgba(29,78,216,0.2)',    border: 'rgba(96,165,250,0.4)',    glow: '0 0 20px rgba(96,165,250,0.35)',            name: 'Редкая',      icon: '💎' },
  trophy:    { textColor: '#c084fc', bg: 'rgba(107,33,168,0.2)',   border: 'rgba(192,132,252,0.4)',   glow: '0 0 28px rgba(192,132,252,0.4)',            name: 'Трофейная',   icon: '🏆' },
  legendary: { textColor: '#facc15', bg: 'rgba(120,53,15,0.3)',    border: 'rgba(250,204,21,0.5)',    glow: '0 0 36px rgba(250,204,21,0.5)',             name: 'Легендарная', icon: '⭐' },
}

export default function CaughtFishModal({ fish, speciesImage, weight, length, rarity, error, onKeep, onRelease }: CaughtFishModalProps) {
  const cfg = RARITY_CFG[rarity] ?? RARITY_CFG.common

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="max-w-sm w-full mx-4"
        style={{
          animation: 'modalIn 0.35s cubic-bezier(0.34, 1.36, 0.64, 1) both',
          borderRadius: '16px',
          overflow: 'hidden',
          border: `2px solid ${cfg.border}`,
          boxShadow: cfg.glow !== 'none' ? `${cfg.glow}, 0 24px 48px rgba(0,0,0,0.7)` : '0 24px 48px rgba(0,0,0,0.7)',
        }}
      >
        {/* Фон карточки */}
        <div style={{
          background: 'linear-gradient(160deg, #2d1a09 0%, #3d2410 35%, #2d1a09 70%, #3d2410 100%)',
          padding: '20px',
        }}>
          {/* Заголовок */}
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <div className="gold-text" style={{ fontSize: '1.4rem', fontFamily: 'Georgia, serif', letterSpacing: '0.05em' }}>
              Рыба поймана!
            </div>
          </div>

          {/* Badge редкости */}
          <div style={{ textAlign: 'center', marginBottom: '14px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '4px 14px', borderRadius: '20px',
              background: cfg.bg, border: `1px solid ${cfg.border}`,
              color: cfg.textColor, fontSize: '0.8rem', fontFamily: 'Georgia, serif',
              fontWeight: 'bold',
            }}>
              {cfg.icon} {cfg.name}
            </span>
          </div>

          {/* Фото рыбы */}
          <div style={{
            animation: 'catchPop 0.5s 0.1s cubic-bezier(0.34, 1.36, 0.64, 1) both',
            marginBottom: '14px',
            display: 'flex', justifyContent: 'center',
          }}>
            <div style={{
              background: `${cfg.bg}`,
              border: `1px solid ${cfg.border}`,
              borderRadius: '12px', padding: '10px',
              display: 'inline-block',
            }}>
              <GameImage
                src={speciesImage || getFallbackUrl('fish')}
                fallback={getFallbackUrl('fish')}
                alt={fish}
                className="w-40 h-28 object-contain block"
              />
            </div>
          </div>

          {/* Информация о рыбе */}
          <div style={{
            background: 'rgba(13,31,13,0.5)', borderRadius: '10px',
            padding: '14px', marginBottom: '14px',
            border: `1px solid ${cfg.border}`,
          }}>
            <h3 style={{
              fontFamily: 'Georgia, serif', fontSize: '1.15rem',
              color: '#d4c5a9', textAlign: 'center', marginBottom: '12px',
            }}>
              {fish}
            </h3>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '28px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: '#6b5030', marginBottom: '3px' }}>⚖️ Вес</div>
                <div className="gold-text" style={{ fontSize: '1.1rem', fontFamily: 'Georgia, serif', fontWeight: 'bold' }}>
                  {weight.toFixed(3)} кг
                </div>
              </div>
              <div style={{ width: '1px', background: 'rgba(92,61,30,0.4)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: '#6b5030', marginBottom: '3px' }}>📏 Длина</div>
                <div style={{ fontSize: '1.1rem', fontFamily: 'Georgia, serif', color: '#a8894e', fontWeight: 'bold' }}>
                  {length} см
                </div>
              </div>
            </div>
          </div>

          {/* Кнопки */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onKeep}
              className="btn btn-primary"
              style={{ flex: 1, minHeight: '44px', fontSize: '0.9rem' }}
            >
              🪣 В садок
            </button>
            <button
              onClick={onRelease}
              className="btn btn-secondary"
              style={{ flex: 1, minHeight: '44px', fontSize: '0.9rem' }}
            >
              🌊 Отпустить
            </button>
          </div>

          {/* Ошибка (напр. «Садок полон») */}
          {error && (
            <p style={{ textAlign: 'center', fontSize: '0.78rem', color: '#f87171', marginTop: '8px' }}>
              {error}
            </p>
          )}

          {/* Подсказка */}
          <p style={{ textAlign: 'center', fontSize: '0.6rem', color: '#4a3118', marginTop: '8px' }}>
            Отпустить = +карма
          </p>
        </div>
      </div>
    </div>
  )
}
