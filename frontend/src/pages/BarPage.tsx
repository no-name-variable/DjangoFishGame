/**
 * Бар — напитки, закуски из рыбы и барный чат.
 */
import { useEffect, useRef, useState } from 'react'
import { getBarDrinks, orderDrink, prepareSnack } from '../api/bar'
import { getCreel } from '../api/player'
import { usePlayerStore } from '../store/playerStore'
import ChatWindow from '../components/chat/ChatWindow'

/** Виджет радио radiobells */
function RadioWidget() {
  const containerRef = useRef<HTMLDivElement>(null)
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current || !containerRef.current) return
    loaded.current = true

    const el = containerRef.current

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.type = 'text/css'
    link.href = 'https://www.radiobells.com/script/style.css'
    el.appendChild(link)

    const configScript = document.createElement('script')
    configScript.type = 'text/javascript'
    configScript.textContent = `
      var rad_backcolor="#1a2e1a";
      var rad_logo="black";
      var rad_autoplay=false;
      var rad_width="responsive";
      var rad_width_px=280;
      var rad_stations=[
        ['https://ep256.hostingradio.ru:8052/europaplus256.mp3','Европа Плюс','europaplus'],
        ['https://radiorecord.hostingradio.ru/rr_main96.aacp','Радио Рекорд','radiorecord'],
        ['https://nashe1.hostingradio.ru/nashe-256','Наше Радио','nashe'],
        ['https://dfm.hostingradio.ru/dfm96.aacp','DFM','dfm'],
        ['https://retro.hostingradio.ru/retro256.mp3','Ретро FM','retrofm']
      ];
    `
    el.appendChild(configScript)

    const wrapper = document.createElement('div')
    wrapper.id = 'radiobells_container'
    el.appendChild(wrapper)

    const mainScript = document.createElement('script')
    mainScript.type = 'text/javascript'
    mainScript.src = 'https://www.radiobells.com/script/v2_1.js'
    mainScript.charset = 'UTF-8'
    el.appendChild(mainScript)
  }, [])

  return <div ref={containerRef} style={{ borderRadius: '10px', overflow: 'hidden' }} />
}

interface Drink {
  id: number
  name: string
  description: string
  price: string
  satiety: number
  image: string | null
}

interface CreelFish {
  id: number
  species_name: string
  species_id: number
  weight: number
  length: number
  is_sold: boolean
  is_released: boolean
}

const PREPARATIONS = [
  { value: 'dried', label: 'Сушёная', coeff: 8 },
  { value: 'smoked', label: 'Вяленая', coeff: 10 },
  { value: 'fried', label: 'Жареная', coeff: 12 },
] as const

export default function BarPage() {
  const updatePlayer = usePlayerStore((s) => s.updatePlayer)
  const [drinks, setDrinks] = useState<Drink[]>([])
  const [creel, setCreel] = useState<CreelFish[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [ordering, setOrdering] = useState<number | null>(null)
  const [selectedFish, setSelectedFish] = useState<number | null>(null)
  const [selectedPrep, setSelectedPrep] = useState<string>('fried')
  const [cooking, setCooking] = useState(false)
  const [members, setMembers] = useState<string[]>([])
  const [fishPage, setFishPage] = useState(0)

  const FISH_PER_PAGE = 5
  const totalFishPages = Math.ceil(creel.length / FISH_PER_PAGE)
  const pagedCreel = creel.slice(fishPage * FISH_PER_PAGE, (fishPage + 1) * FISH_PER_PAGE)

  const load = async () => {
    setLoading(true)
    try {
      const [drinksRes, creelData] = await Promise.all([
        getBarDrinks(),
        getCreel(),
      ])
      setDrinks(drinksRes.data)
      const fish = (creelData.results || creelData) as CreelFish[]
      setCreel(fish.filter((f) => !f.is_sold && !f.is_released))
    } catch {
      setMsg('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleOrder = async (drinkId: number) => {
    setOrdering(drinkId)
    try {
      const res = await orderDrink(drinkId)
      const d = res.data
      setMsg(`${d.drink_name} — ${d.price.toFixed(2)}$, сытость +${d.satiety_gained}`)
      updatePlayer({ money: d.money, hunger: d.hunger })
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      setMsg(err?.response?.data?.error || 'Ошибка заказа')
    } finally {
      setOrdering(null)
    }
  }

  const handleCook = async () => {
    if (!selectedFish) return
    setCooking(true)
    try {
      const res = await prepareSnack(selectedFish, selectedPrep)
      const d = res.data
      setMsg(`${d.fish_name} (${d.weight.toFixed(2)} кг) — сытость +${d.satiety_gained}`)
      updatePlayer({ hunger: d.hunger })
      setSelectedFish(null)
      await load()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      setMsg(err?.response?.data?.error || 'Ошибка приготовления')
    } finally {
      setCooking(false)
    }
  }

  const barChannelId = 0

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#a8894e' }}>
        Загрузка...
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row lg:h-full gap-3 lg:gap-4 p-3 lg:p-4 max-w-[1100px] mx-auto">

      {/* ── Контент ── */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* Баннер */}
        <div
          style={{
            borderRadius: '12px',
            overflow: 'hidden',
            marginBottom: '14px',
            border: '2px solid rgba(212,168,74,0.35)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5), inset 0 0 30px rgba(0,0,0,0.2)',
          }}
        >
          <img
            src="/images/other_images/bar/bar.png"
            alt="Бар"
            className="w-full block rounded-[10px]"
          />
        </div>

        {/* Сообщение */}
        {msg && (
          <div
            className="wood-panel px-3 py-2 mb-3 text-xs sm:text-sm"
            style={{
              color: msg.includes('Ошибка') ? '#f87171' : '#4ade80',
              display: 'flex',
              gap: '6px',
              alignItems: 'center',
            }}
          >
            {msg}
            <button
              style={{ marginLeft: 'auto', color: '#a8894e' }}
              onClick={() => setMsg('')}
            >
              ✖
            </button>
          </div>
        )}

        {/* Напитки */}
        <section style={{ marginBottom: '16px' }}>
          <h2 className="font-serif text-sm text-wood-300 mb-2 pb-1" style={{ borderBottom: '1px solid rgba(92,61,30,0.3)' }}>
            Напитки
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {drinks.map((drink) => (
              <div
                key={drink.id}
                className="card flex flex-col items-center gap-1 p-2 sm:p-3 text-center"
              >
                <span className="text-xl sm:text-2xl">🍺</span>
                <span className="font-serif text-xs sm:text-sm text-wood-200 leading-tight">
                  {drink.name}
                </span>
                <span className="text-[0.6rem] sm:text-xs text-wood-300 hidden sm:block">
                  {drink.description}
                </span>
                <div className="flex gap-1 text-[0.6rem] sm:text-xs text-wood-400">
                  <span>{drink.price}$</span>
                  <span>+{drink.satiety}</span>
                </div>
                <button
                  className="btn btn-action text-[0.65rem] sm:text-xs w-full"
                  style={{ minHeight: '26px' }}
                  onClick={() => handleOrder(drink.id)}
                  disabled={ordering === drink.id}
                >
                  {ordering === drink.id ? '...' : 'Заказать'}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Закуска */}
        <section>
          <h2 className="font-serif text-sm text-wood-300 mb-2 pb-1" style={{ borderBottom: '1px solid rgba(92,61,30,0.3)' }}>
            Закуска из рыбы
          </h2>

          {creel.length === 0 ? (
            <p className="text-wood-300 text-xs sm:text-sm text-center py-4">
              В садке нет рыбы для приготовления
            </p>
          ) : (
            <>
              <div className="space-y-1 mb-2">
                {pagedCreel.map((fish) => {
                  const isSelected = selectedFish === fish.id
                  return (
                    <button
                      key={fish.id}
                      onClick={() => setSelectedFish(isSelected ? null : fish.id)}
                      className="card w-full flex justify-between items-center px-3 py-2 cursor-pointer"
                      style={{
                        border: isSelected
                          ? '1px solid rgba(212,168,74,0.6)'
                          : '1px solid rgba(74,49,24,0.4)',
                        background: isSelected ? 'rgba(42,60,42,0.5)' : undefined,
                      }}
                    >
                      <span className="text-wood-200 text-xs sm:text-sm">{fish.species_name}</span>
                      <span className="text-wood-400 text-[0.65rem] sm:text-xs">{fish.weight.toFixed(2)} кг</span>
                    </button>
                  )
                })}
              </div>

              {/* Пагинация */}
              {totalFishPages > 1 && (
                <div className="flex items-center justify-center gap-3 mb-2">
                  <button
                    onClick={() => setFishPage((p) => Math.max(0, p - 1))}
                    disabled={fishPage === 0}
                    className="px-2 py-0.5 rounded text-xs"
                    style={{
                      border: '1px solid rgba(74,49,24,0.4)',
                      background: 'rgba(13,31,13,0.5)',
                      color: fishPage === 0 ? '#5c3d1e' : '#8b6d3f',
                    }}
                  >
                    &lt;
                  </button>
                  <span className="text-[0.65rem] sm:text-xs text-wood-400">
                    {fishPage + 1} / {totalFishPages} ({creel.length} шт.)
                  </span>
                  <button
                    onClick={() => setFishPage((p) => Math.min(totalFishPages - 1, p + 1))}
                    disabled={fishPage >= totalFishPages - 1}
                    className="px-2 py-0.5 rounded text-xs"
                    style={{
                      border: '1px solid rgba(74,49,24,0.4)',
                      background: 'rgba(13,31,13,0.5)',
                      color: fishPage >= totalFishPages - 1 ? '#5c3d1e' : '#8b6d3f',
                    }}
                  >
                    &gt;
                  </button>
                </div>
              )}

              {selectedFish && (
                <div className="card flex items-center gap-2 p-2 sm:p-3 flex-wrap">
                  <span className="text-wood-400 text-xs">Способ:</span>
                  {PREPARATIONS.map((p) => {
                    const fish = creel.find((f) => f.id === selectedFish)
                    const satiety = fish ? Math.floor(fish.weight * p.coeff) : 0
                    return (
                      <button
                        key={p.value}
                        onClick={() => setSelectedPrep(p.value)}
                        className="px-2 py-1 rounded text-[0.65rem] sm:text-xs"
                        style={{
                          border: selectedPrep === p.value
                            ? '1px solid rgba(212,168,74,0.6)'
                            : '1px solid rgba(74,49,24,0.4)',
                          background: selectedPrep === p.value
                            ? 'rgba(42,60,42,0.5)'
                            : 'rgba(13,31,13,0.5)',
                          color: selectedPrep === p.value ? '#d4c5a9' : '#8b6d3f',
                          cursor: 'pointer',
                        }}
                      >
                        {p.label} (+{satiety})
                      </button>
                    )
                  })}
                  <button
                    className="btn btn-action text-xs ml-auto"
                    style={{ minHeight: '28px' }}
                    onClick={handleCook}
                    disabled={cooking}
                  >
                    {cooking ? '...' : 'Приготовить'}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* ── Сайдбар: радио + чат ── */}
      <aside className="w-full lg:w-[300px] flex-shrink-0 flex flex-col gap-2 lg:min-h-0">
        <RadioWidget />

        <h2 className="font-serif text-sm text-wood-300 pb-1" style={{ borderBottom: '1px solid rgba(92,61,30,0.3)' }}>
          Барный чат
        </h2>

        {/* Участники */}
        {members.length > 0 && (
          <div className="flex flex-wrap gap-1.5 p-2 rounded-lg" style={{ background: 'rgba(13,31,13,0.5)', border: '1px solid rgba(74,49,24,0.3)' }}>
            <span className="text-wood-300 text-[0.6rem] w-full">
              В баре ({members.length}):
            </span>
            {members.map((name) => (
              <span
                key={name}
                className="text-wood-200 text-[0.65rem] px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(42,60,42,0.5)', border: '1px solid rgba(92,61,30,0.3)' }}
              >
                {name}
              </span>
            ))}
          </div>
        )}

        <ChatWindow
          channelType="bar"
          channelId={barChannelId}
          className="h-64 lg:flex-1 lg:h-auto lg:min-h-0"
          onMembersChange={setMembers}
        />
      </aside>
    </div>
  )
}
