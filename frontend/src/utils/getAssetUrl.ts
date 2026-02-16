/**
 * Утилиты для получения URL ассетов игры.
 * Изображения лежат в public/images/, файлы названы по pk.
 */

/** Категория снасти → поддиректория и расширение */
const CATEGORY_MAP: Record<string, { dir: string; ext: string }> = {
  rodtype:     { dir: 'rods',        ext: 'jpg' },
  reel:        { dir: 'reels',       ext: 'png' },
  line:        { dir: 'lines',       ext: 'png' },
  hook:        { dir: 'hooks',       ext: 'png' },
  floattackle: { dir: 'floats',      ext: 'bmp' },
  lure:        { dir: 'lures',       ext: 'jpg' },
  bait:        { dir: 'baits',       ext: 'png' },
  groundbait:  { dir: 'groundbaits', ext: 'jpg' },
  flavoring:   { dir: 'flavorings',  ext: 'jpg' },
  food:        { dir: 'food',        ext: 'png' },
}

/** Baits 3,4 имеют jpg вместо png */
const BAIT_JPG_IDS = new Set([3, 4])

/** URL изображения рыбы по pk */
export function getFishImageUrl(fishId: number): string {
  return `/images/fish/${fishId}.png`
}

/** URL сцены локации по pk */
export function getLocationImageUrl(locationId: number): string {
  return `/images/locations/${locationId}.jpg`
}

/** URL индекса базы по pk */
export function getBaseImageUrl(baseId: number): string {
  return `/images/locations/base_${baseId}.jpg`
}

/** URL предмета инвентаря / магазина по типу и pk */
export function getItemImageUrl(itemType: string, itemId: number): string {
  const cat = CATEGORY_MAP[itemType]
  if (!cat) return '/images/fallback/tackle.svg'
  let ext = cat.ext
  if (itemType === 'bait' && BAIT_JPG_IDS.has(itemId)) ext = 'jpg'
  return `/images/${cat.dir}/${itemId}.${ext}`
}

/** Маппинг name_ru → pk для рыб (бэкенд не возвращает pk при поимке) */
const FISH_NAME_ID: Record<string, number> = {
  'Окунь': 1, 'Плотва': 2, 'Карась': 3, 'Лещ': 4, 'Густера': 5,
  'Уклейка': 6, 'Ёрш': 7, 'Пескарь': 8, 'Краснопёрка': 9, 'Линь': 10,
  'Карп': 11, 'Голавль': 12, 'Язь': 13, 'Жерех': 14, 'Судак': 15,
  'Щука': 16, 'Налим': 17, 'Сом': 18, 'Стерлядь': 19, 'Сазан': 20,
  'Толстолобик': 21, 'Белый амур': 22, 'Форель': 23, 'Таймень': 24, 'Осётр': 25,
  'Сазан (ахтубинский)': 26, 'Сом (ахтубинский)': 27, 'Жерех (ахтубинский)': 28,
  'Берш': 29, 'Чехонь': 30, 'Линь (ахтубинский)': 31,
  'Краснопёрка (ахтубинская)': 32, 'Белоглазка': 33, 'Синец': 34,
  'Густера (ахтубинская)': 35, 'Сиг': 36, 'Палия': 37, 'Ряпушка': 38,
  'Хариус': 39, 'Корюшка': 40, 'Налим (ладожский)': 41,
  'Форель (ладожская)': 42, 'Кумжа': 43, 'Минога': 44, 'Лосось (ладожский)': 45,
}

/** URL изображения рыбы по имени */
export function getFishImageByName(name: string): string {
  const id = FISH_NAME_ID[name]
  return id ? getFishImageUrl(id) : '/images/fallback/fish.svg'
}

/** Убирает origin из абсолютных URL, оставляя только pathname. */
export function normalizeMediaUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      return new URL(url).pathname
    } catch {
      return url
    }
  }
  return url
}

/** Fallback URL по категории */
export function getFallbackUrl(type: 'fish' | 'tackle' | 'location'): string {
  return `/images/fallback/${type}.svg`
}
