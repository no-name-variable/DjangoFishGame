/**
 * Модальное окно пойманной рыбы — деревянная рамка, пергамент.
 */
import GameImage from '../ui/GameImage'
import { getFallbackUrl } from '../../utils/getAssetUrl'

interface CaughtFishModalProps {
  fish: string
  speciesImage?: string | null
  weight: number
  length: number
  rarity: string
  onKeep: () => void
  onRelease: () => void
}

const rarityColors: Record<string, string> = {
  common: 'text-wood-300',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  trophy: 'text-purple-400',
  legendary: 'text-yellow-400',
}

const rarityGlow: Record<string, string> = {
  common: '',
  uncommon: 'shadow-[0_0_10px_rgba(74,222,74,0.2)]',
  rare: 'shadow-[0_0_15px_rgba(74,148,255,0.3)]',
  trophy: 'shadow-[0_0_20px_rgba(168,85,247,0.3)]',
  legendary: 'shadow-[0_0_25px_rgba(234,179,8,0.4)]',
}

const rarityNames: Record<string, string> = {
  common: 'Обычная',
  uncommon: 'Необычная',
  rare: 'Редкая',
  trophy: 'Трофейная',
  legendary: 'Легендарная',
}

export default function CaughtFishModal({ fish, speciesImage, weight, length, rarity, onKeep, onRelease }: CaughtFishModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className={`game-frame max-w-md w-full mx-4 ${rarityGlow[rarity] || ''}`}>
        {/* Пергаментный фон */}
        <div
          className="p-6 text-center rounded-lg"
          style={{
            background: 'linear-gradient(135deg, #3a2512 0%, #4a3118 30%, #3a2512 60%, #4a3118 100%)',
          }}
        >
          <h2 className="gold-text text-2xl mb-1">Рыба поймана!</h2>
          <div className={`text-sm mb-4 font-serif ${rarityColors[rarity] || 'text-wood-400'}`}>
            {rarityNames[rarity] || rarity}
          </div>

          {/* Фото рыбы */}
          <div className="mb-4">
            <GameImage
              src={speciesImage || getFallbackUrl('fish')}
              fallback={getFallbackUrl('fish')}
              alt={fish}
              className="w-48 h-32 object-contain mx-auto drop-shadow-lg"
            />
          </div>

          {/* Информация о рыбе */}
          <div className="bg-forest-900/50 rounded-lg p-5 mb-4 border border-wood-700/30">
            <h3 className="font-serif text-2xl text-wood-100 mb-3">{fish}</h3>
            <div className="flex justify-center gap-8 text-lg">
              <div>
                <span className="text-wood-500 text-sm">Вес</span>
                <p className="text-wood-100 font-bold font-serif">{weight.toFixed(3)} кг</p>
              </div>
              <div className="w-px bg-wood-700/40" />
              <div>
                <span className="text-wood-500 text-sm">Длина</span>
                <p className="text-wood-100 font-bold font-serif">{length} см</p>
              </div>
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex gap-3">
            <button onClick={onKeep} className="btn btn-primary flex-1 py-2.5">
              В садок
            </button>
            <button onClick={onRelease} className="btn btn-secondary flex-1 py-2.5">
              Отпустить (+карма)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
