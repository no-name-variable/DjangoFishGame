/**
 * Кафе — заказы рыбы на локациях с премиальной оплатой.
 */
import { useEffect, useState } from 'react'
import { getCafeOrders, deliverFish } from '../api/cafe'
import { getCreel } from '../api/player'
import GameImage from '../components/ui/GameImage'
import { getFallbackUrl } from '../utils/getAssetUrl'

interface CafeOrder {
  id: number
  location: number
  location_name: string
  species: number
  species_name: string
  species_image: string | null
  quantity_required: number
  min_weight_grams: number
  reward_per_fish: string
  reward_total: string
  is_active: boolean
  expires_at: string
  quantity_delivered: number
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

export default function CafePage() {
  const [orders, setOrders] = useState<CafeOrder[]>([])
  const [creel, setCreel] = useState<CreelFish[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [delivering, setDelivering] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [ordersRes, creelRes] = await Promise.all([
        getCafeOrders(),
        getCreel(),
      ])
      setOrders(ordersRes.data.results || ordersRes.data)
      const fish = (creelRes.results || creelRes) as CreelFish[]
      setCreel(fish.filter((f) => !f.is_sold && !f.is_released))
    } catch {
      setMsg('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleDeliver = async (order: CafeOrder) => {
    const minWeightKg = order.min_weight_grams / 1000
    const suitable = creel.filter(
      (f) => f.species_id === order.species && f.weight >= minWeightKg,
    )
    if (suitable.length === 0) {
      setMsg('Нет подходящей рыбы в садке')
      return
    }

    const remaining = order.quantity_required - order.quantity_delivered
    const toDeliver = suitable.slice(0, remaining)

    setDelivering(order.id)
    try {
      const res = await deliverFish(order.id, toDeliver.map((f) => f.id))
      const d = res.data
      setMsg(
        `Сдано ${d.fish_delivered} шт. — заработано ${d.money_earned.toFixed(2)}$`,
      )
      await load()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      setMsg(err?.response?.data?.error || 'Ошибка сдачи рыбы')
    } finally {
      setDelivering(null)
    }
  }

  const getTimeLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now()
    if (diff <= 0) return 'Истёк'
    const hours = Math.floor(diff / 3600000)
    const mins = Math.floor((diff % 3600000) / 60000)
    return `${hours}ч ${mins}м`
  }

  const getSuitableCount = (order: CafeOrder) => {
    const minWeightKg = order.min_weight_grams / 1000
    return creel.filter(
      (f) => f.species_id === order.species && f.weight >= minWeightKg,
    ).length
  }

  // Группировка по локации
  const grouped = orders.reduce<Record<string, CafeOrder[]>>((acc, o) => {
    if (!acc[o.location_name]) acc[o.location_name] = []
    acc[o.location_name].push(o)
    return acc
  }, {})

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="gold-text text-xl mb-4">Кафе</h1>

      {msg && (
        <div
          className="wood-panel px-3 py-2 mb-3 text-sm"
          style={{
            color: msg.includes('заработано') ? '#4ade80' : '#f87171',
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

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#a8894e' }}>
          Загрузка заказов...
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#a8894e' }}>
          <p style={{ fontSize: '0.85rem' }}>Нет активных заказов</p>
        </div>
      ) : (
        Object.entries(grouped).map(([locationName, locationOrders]) => (
          <div key={locationName} style={{ marginBottom: '20px' }}>
            <h2
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '0.9rem',
                color: '#8b6d3f',
                marginBottom: '8px',
                paddingBottom: '4px',
                borderBottom: '1px solid rgba(92,61,30,0.3)',
              }}
            >
              {locationName}
            </h2>

            <div className="space-y-2">
              {locationOrders.map((order) => {
                const progress = order.quantity_delivered / order.quantity_required
                const isCompleted = order.quantity_delivered >= order.quantity_required
                const suitableCount = getSuitableCount(order)
                const remaining = order.quantity_required - order.quantity_delivered

                return (
                  <div key={order.id} className="card flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
                    {/* Верх: рыба + инфо */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="shrink-0" style={{
                        width: '48px', height: '48px',
                        background: 'rgba(13,31,13,0.5)', borderRadius: '8px',
                        border: '1px solid rgba(74,49,24,0.4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px',
                      }}>
                        <GameImage
                          src={order.species_image || getFallbackUrl('fish')}
                          fallback={getFallbackUrl('fish')}
                          alt={order.species_name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-serif text-sm text-wood-200 mb-0.5">{order.species_name}</h3>
                        <p className="text-[0.65rem] text-wood-400 mb-1">
                          {order.quantity_required} шт. от{' '}
                          {order.min_weight_grams >= 1000
                            ? `${(order.min_weight_grams / 1000).toFixed(1)} кг`
                            : `${order.min_weight_grams} г`}
                        </p>
                        {/* Прогресс-бар */}
                        <div style={{
                          height: '6px', borderRadius: '3px',
                          background: 'rgba(13,31,13,0.5)', overflow: 'hidden', marginBottom: '3px',
                        }}>
                          <div style={{
                            height: '100%', width: `${Math.min(100, progress * 100)}%`,
                            background: isCompleted
                              ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                              : 'linear-gradient(90deg, #d4a84a, #b8922e)',
                            borderRadius: '3px', transition: 'width 0.3s ease',
                          }} />
                        </div>
                        <div className="flex justify-between text-[0.6rem]">
                          <span style={{ color: isCompleted ? '#4ade80' : '#8b6d3f' }}>
                            {order.quantity_delivered}/{order.quantity_required}
                            {isCompleted && ' Выполнено'}
                          </span>
                          <span className="text-wood-400">{getTimeLeft(order.expires_at)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Награда + кнопка */}
                    <div className="flex items-center sm:flex-col sm:items-end gap-2 shrink-0">
                      <span className="gold-text font-serif text-sm font-bold">{order.reward_total}$</span>
                      {!isCompleted && (
                        <button
                          className="btn btn-action text-xs"
                          style={{ minHeight: '32px', minWidth: '72px' }}
                          onClick={() => handleDeliver(order)}
                          disabled={delivering === order.id || suitableCount === 0}
                        >
                          {delivering === order.id
                            ? '...'
                            : suitableCount > 0
                              ? `Сдать (${Math.min(suitableCount, remaining)})`
                              : 'Нет рыбы'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
