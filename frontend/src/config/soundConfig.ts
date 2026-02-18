/**
 * Конфигурация звуков — маппинг событий на файлы.
 * Массив = случайный выбор из вариантов при воспроизведении.
 */

/** Ключ события → путь или массив путей (для рандомного выбора) */
export const SOUND_MAP: Record<string, string | string[]> = {
  // Рыбалка — заброс
  cast: [
    '/sounds/fishing/cast/splash1.mp3',
    '/sounds/fishing/cast/splash2.mp3',
    '/sounds/fishing/cast/splash3.mp3',
    '/sounds/fishing/cast/splash4.mp3',
    '/sounds/fishing/cast/splash5.mp3',
    '/sounds/fishing/cast/splash6.mp3',
    '/sounds/fishing/cast/splash7.mp3',
  ],
  cast_float: '/sounds/fishing/cast-type/down_popl.mp3',
  cast_lure: '/sounds/fishing/cast-type/down_bles.mp3',
  cast_feeder: '/sounds/fishing/cast-type/down_fider.mp3',

  // Рыбалка — катушка/подмотка
  reel: [
    '/sounds/fishing/reel/brake1.mp3',
    '/sounds/fishing/reel/brake2.mp3',
    '/sounds/fishing/reel/brake3.mp3',
    '/sounds/fishing/reel/brake4.mp3',
    '/sounds/fishing/reel/brake5.mp3',
  ],
  pull: '/sounds/fishing/reel/brake_bg.mp3',
  reel_medium: '/sounds/fishing/reel/brake_md.mp3',
  reel_light: '/sounds/fishing/reel/brake_sm.mp3',

  // Рыбалка — поклёвка
  nibble: '/sounds/fishing/bite/prik.mp3',
  bite: '/sounds/fishing/bite/popl.mp3',

  // Рыбалка — подсечка / вылов
  strike: '/sounds/fishing/catch/zabr.mp3',
  catch: '/sounds/fishing/catch/pluh.mp3',

  // Рыбалка — обрыв/поломка
  line_break: '/sounds/fishing/break/leskaobr.mp3',
  break: '/sounds/fishing/break/brkat.mp3',

  // UI
  click: '/sounds/ui/click.mp3',
  pip: '/sounds/ui/pip.mp3',
  message: '/sounds/ui/message.mp3',
  alert: '/sounds/ui/alert.mp3',
  frmshow: '/sounds/ui/frmshow.mp3',
  open_store: '/sounds/ui/open_store.mp3',
  open_items: '/sounds/ui/open_items.mp3',
  open_pack: '/sounds/ui/open_pack.mp3',
  open_corf: '/sounds/ui/open_corf.mp3',

  // Игрок
  eat: '/sounds/player/eat.mp3',
  drink: '/sounds/player/drink.mp3',
  equip: '/sounds/player/setdev.mp3',
  unequip: '/sounds/player/remdev.mp3',
  repair: '/sounds/player/repair.mp3',
  craft: '/sounds/player/mix.mp3',
  put_pack: '/sounds/player/put_pack.mp3',

  // Магазин
  buy: '/sounds/shop/kassa.mp3',
  coin: '/sounds/shop/coin.mp3',
  sell_fish: '/sounds/shop/sellfish.mp3',

  // События
  levelup: '/sounds/events/levelup.mp3',
  bonus: '/sounds/events/bonus.mp3',
  record: '/sounds/events/rec.mp3',
  rune: '/sounds/events/rune.mp3',
  quest_complete: '/sounds/events/ring.mp3',
}

/** Дневные клипы природы */
const DAY_CLIPS = [
  '/sounds/ambience/day/7.mp3',
  '/sounds/ambience/day/09.mp3',
  '/sounds/ambience/day/011.mp3',
  '/sounds/ambience/day/12.mp3',
  '/sounds/ambience/day/015.mp3',
  '/sounds/ambience/day/018.mp3',
  '/sounds/ambience/day/019.mp3',
  '/sounds/ambience/day/21.mp3',
  '/sounds/ambience/day/22.mp3',
  '/sounds/ambience/day/25.mp3',
  '/sounds/ambience/day/32.mp3',
  '/sounds/ambience/day/66.mp3',
  '/sounds/ambience/day/74.mp3',
  '/sounds/ambience/day/77.mp3',
  '/sounds/ambience/day/85.mp3',
]

/** Ночные клипы природы */
const NIGHT_CLIPS = [
  '/sounds/ambience/night/2.mp3',
  '/sounds/ambience/night/3.mp3',
  '/sounds/ambience/night/5.mp3',
  '/sounds/ambience/night/6.mp3',
  '/sounds/ambience/night/8.mp3',
  '/sounds/ambience/night/10.mp3',
  '/sounds/ambience/night/18.mp3',
  '/sounds/ambience/night/19.mp3',
  '/sounds/ambience/night/133.mp3',
  '/sounds/ambience/night/234.mp3',
  '/sounds/ambience/night/553.mp3',
  '/sounds/ambience/night/6364.mp3',
]

/** Короткие лупы фона */
const DAY_LOOPS = [
  '/sounds/ambience/day/fon8.mp3',
  '/sounds/ambience/day/fon11.mp3',
  '/sounds/ambience/day/fon12.mp3',
]

interface AmbienceSet {
  loops: string[]
  clips: string[]
}

/**
 * Эмбиент по фазам суток.
 * - loops — зацикленные короткие фоны
 * - clips — периодические природные звуки
 */
export const AMBIENCE_MAP: Record<string, AmbienceSet> = {
  dawn:     { loops: DAY_LOOPS, clips: DAY_CLIPS },
  morning:  { loops: DAY_LOOPS, clips: DAY_CLIPS },
  day:      { loops: DAY_LOOPS, clips: DAY_CLIPS },
  evening:  { loops: DAY_LOOPS, clips: [...DAY_CLIPS.slice(0, 5), ...NIGHT_CLIPS.slice(0, 4)] },
  night:    { loops: [],        clips: NIGHT_CLIPS },
  midnight: { loops: [],        clips: NIGHT_CLIPS },
}
