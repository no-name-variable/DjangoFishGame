/**
 * Бар — напитки, закуски из рыбы и барный чат.
 */
import { useEffect, useRef, useState } from 'react'
import { getBarDrinks, orderDrink, prepareSnack } from '../api/bar'
import { getCreel } from '../api/player'
import { usePlayerStore } from '../store/playerStore'
import ChatWindow from '../components/chat/ChatWindow'

/** Виджет радио radiobells, встроенный через iframe-подобный подход */
function RadioWidget() {
  const containerRef = useRef<HTMLDivElement>(null)
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current || !containerRef.current) return
    loaded.current = true

    const el = containerRef.current

    // Стили виджета
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.type = 'text/css'
    link.href = 'https://www.radiobells.com/script/style.css'
    el.appendChild(link)

    // Конфиг
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

    // Контейнер виджета
    const wrapper = document.createElement('div')
    wrapper.id = 'radiobells_container'
    el.appendChild(wrapper)

    // Скрипт виджета
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
  const player = usePlayerStore((s) => s.player)
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

  const baseId = player?.current_base ?? 0

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#5c3d1e' }}>
        Загрузка...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', gap: '16px', padding: '14px', maxWidth: '1100px', margin: '0 auto' }}>

      {/* ── Левая колонка: контент как было ── */}
      <main className="p-0 max-w-4xl" style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
        {/* Баннер бара */}
        <div
          style={{
            borderRadius: '12px',
            overflow: 'hidden',
            marginBottom: '16px',
            border: '2px solid rgba(212,168,74,0.35)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5), inset 0 0 30px rgba(0,0,0,0.2)',
          }}
        >
          <img
            src="/images/other_images/bar/bar.png"
            alt="Бар"
            style={{ width: '100%', display: 'block', borderRadius: '10px' }}
          />
        </div>

        {/* Сообщение */}
        {msg && (
          <div
            className="wood-panel px-3 py-2 mb-3 text-sm"
            style={{
              color: msg.includes('Ошибка') ? '#f87171' : '#4ade80',
              display: 'flex',
              gap: '6px',
              alignItems: 'center',
            }}
          >
            {msg}
            <button
              style={{ marginLeft: 'auto', color: '#5c3d1e' }}
              onClick={() => setMsg('')}
            >
              ✖
            </button>
          </div>
        )}

        {/* Напитки */}
        <section style={{ marginBottom: '20px' }}>
          <h2
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '0.9rem',
              color: '#8b6d3f',
              marginBottom: '10px',
              paddingBottom: '4px',
              borderBottom: '1px solid rgba(92,61,30,0.3)',
            }}
          >
            Напитки
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
            {drinks.map((drink) => (
              <div
                key={drink.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '12px 8px',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: '2rem' }}>🍺</span>
                <span
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '0.8rem',
                    color: '#d4c5a9',
                    lineHeight: 1.2,
                  }}
                >
                  {drink.name}
                </span>
                <span style={{ fontSize: '0.65rem', color: '#5c3d1e' }}>
                  {drink.description}
                </span>
                <div style={{ display: 'flex', gap: '8px', fontSize: '0.7rem', color: '#8b6d3f' }}>
                  <span>{drink.price}$</span>
                  <span>+{drink.satiety} сыт.</span>
                </div>
                <button
                  className="btn btn-action text-xs"
                  style={{ minWidth: '80px', minHeight: '28px' }}
                  onClick={() => handleOrder(drink.id)}
                  disabled={ordering === drink.id}
                >
                  {ordering === drink.id ? '...' : 'Заказать'}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Закуска из рыбы */}
        <section>
          <h2
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '0.9rem',
              color: '#8b6d3f',
              marginBottom: '10px',
              paddingBottom: '4px',
              borderBottom: '1px solid rgba(92,61,30,0.3)',
            }}
          >
            Закуска из рыбы
          </h2>

          {creel.length === 0 ? (
            <p style={{ color: '#5c3d1e', fontSize: '0.8rem', textAlign: 'center', padding: '16px' }}>
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
                      className="card"
                      style={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        border: isSelected
                          ? '1px solid rgba(212,168,74,0.6)'
                          : '1px solid rgba(74,49,24,0.4)',
                        background: isSelected
                          ? 'rgba(42,60,42,0.5)'
                          : undefined,
                      }}
                    >
                      <span style={{ color: '#d4c5a9', fontSize: '0.8rem' }}>
                        {fish.species_name}
                      </span>
                      <span style={{ color: '#8b6d3f', fontSize: '0.7rem' }}>
                        {fish.weight.toFixed(2)} кг
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Пагинация */}
              {totalFishPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
                  <button
                    onClick={() => setFishPage((p) => Math.max(0, p - 1))}
                    disabled={fishPage === 0}
                    style={{
                      padding: '2px 10px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      cursor: fishPage === 0 ? 'default' : 'pointer',
                      border: '1px solid rgba(74,49,24,0.4)',
                      background: 'rgba(13,31,13,0.5)',
                      color: fishPage === 0 ? '#3a2a14' : '#8b6d3f',
                    }}
                  >
                    &lt;
                  </button>
                  <span style={{ fontSize: '0.7rem', color: '#8b6d3f' }}>
                    {fishPage + 1} / {totalFishPages} ({creel.length} шт.)
                  </span>
                  <button
                    onClick={() => setFishPage((p) => Math.min(totalFishPages - 1, p + 1))}
                    disabled={fishPage >= totalFishPages - 1}
                    style={{
                      padding: '2px 10px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      cursor: fishPage >= totalFishPages - 1 ? 'default' : 'pointer',
                      border: '1px solid rgba(74,49,24,0.4)',
                      background: 'rgba(13,31,13,0.5)',
                      color: fishPage >= totalFishPages - 1 ? '#3a2a14' : '#8b6d3f',
                    }}
                  >
                    &gt;
                  </button>
                </div>
              )}

              {selectedFish && (
                <div
                  className="card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ color: '#8b6d3f', fontSize: '0.75rem' }}>Способ:</span>
                  {PREPARATIONS.map((p) => {
                    const fish = creel.find((f) => f.id === selectedFish)
                    const satiety = fish ? Math.floor(fish.weight * p.coeff) : 0
                    return (
                      <button
                        key={p.value}
                        onClick={() => setSelectedPrep(p.value)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          border: selectedPrep === p.value
                            ? '1px solid rgba(212,168,74,0.6)'
                            : '1px solid rgba(74,49,24,0.4)',
                          background: selectedPrep === p.value
                            ? 'rgba(42,60,42,0.5)'
                            : 'rgba(13,31,13,0.5)',
                          color: selectedPrep === p.value ? '#d4c5a9' : '#8b6d3f',
                        }}
                      >
                        {p.label} (+{satiety})
                      </button>
                    )
                  })}
                  <button
                    className="btn btn-action text-xs"
                    style={{ minHeight: '28px', marginLeft: 'auto' }}
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

      {/* ── Правая колонка: чат на всю высоту ── */}
      <aside
        style={{
          width: '300px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {/* Радио */}
        <RadioWidget />

        <h2
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '0.9rem',
            color: '#8b6d3f',
            paddingBottom: '4px',
            borderBottom: '1px solid rgba(92,61,30,0.3)',
          }}
        >
          Барный чат
        </h2>

        {/* Участники в баре */}
        {members.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              padding: '6px 10px',
              borderRadius: '8px',
              background: 'rgba(13,31,13,0.5)',
              border: '1px solid rgba(74,49,24,0.3)',
            }}
          >
            <span style={{ color: '#5c3d1e', fontSize: '0.65rem', width: '100%' }}>
              В баре ({members.length}):
            </span>
            {members.map((name) => (
              <span
                key={name}
                style={{
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: 'rgba(42,60,42,0.5)',
                  border: '1px solid rgba(92,61,30,0.3)',
                  fontSize: '0.7rem',
                  color: '#d4c5a9',
                }}
              >
                {name}
              </span>
            ))}
          </div>
        )}

        <ChatWindow
          channelType="bar"
          channelId={baseId}
          className="flex-1 min-h-0"
          onMembersChange={setMembers}
        />
      </aside>
    </div>
  )
}
