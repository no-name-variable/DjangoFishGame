/**
 * Рюкзак — инвентарь, снасти, садок в стиле РР3.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getInventory, getPlayerRods, getCreel, renameRod, eat } from '../api/player'
import { sellFish } from '../api/shop'
import { getProfile } from '../api/auth'
import { usePlayerStore } from '../store/playerStore'
import { useInventoryStore } from '../store/inventoryStore'
import RodAssembly from '../components/inventory/RodAssembly'
import RodSlots from '../components/inventory/RodSlots'
import RodManagement from '../components/inventory/RodManagement'
import GameImage from '../components/ui/GameImage'
import { getFallbackUrl } from '../utils/getAssetUrl'

type Tab = 'inventory' | 'rods' | 'creel'

export default function InventoryPage() {
  const [tab, setTab] = useState<Tab>('inventory')
  const [message, setMessage] = useState('')
  const [assembling, setAssembling] = useState(false)
  const [editingRodId, setEditingRodId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const { items, rods, creel, setItems, setRods, setCreel } = useInventoryStore()
  const setPlayer = usePlayerStore((s) => s.setPlayer)
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [invRes, rodsData, creelData] = await Promise.all([
        getInventory(), getPlayerRods(), getCreel(),
      ])
      // getInventory возвращает response, остальные - data напрямую
      setItems(invRes.data.results || invRes.data)
      setRods(rodsData.results || rodsData)
      setCreel(creelData.results || creelData)
    } catch (err) {
      console.error('Inventory load error:', err)
      setMessage('Ошибка загрузки')
    }
  }

  const handleSellAll = async () => {
    if (creel.length === 0) return
    try {
      const ids = creel.map((f) => f.id)
      const result = await sellFish(ids)
      setMessage(`Продано ${result.fish_sold} рыб за ${result.money_earned} серебра`)
      setCreel([])
      const profile = await getProfile()
      setPlayer(profile)
    } catch {
      setMessage('Ошибка продажи')
    }
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'inventory', label: 'Предметы', icon: '\u{1F4E6}' },
    { key: 'rods', label: 'Снасти', icon: '\u{1F3A3}' },
    { key: 'creel', label: `Садок (${creel.length})`, icon: '\u{1F41F}' },
  ]

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="gold-text text-xl">Рюкзак</h1>
        <button onClick={() => navigate('/')} className="btn btn-secondary text-xs">
          Назад
        </button>
      </div>

      {message && (
        <div className="wood-panel px-3 py-2 mb-3 text-sm text-gold">{message}</div>
      )}

      {/* Слоты удочек */}
      <div className="mb-4">
        <RodSlots />
      </div>

      {/* Вкладки */}
      <div className="flex gap-1 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`game-tab ${tab === t.key ? 'game-tab-active' : 'game-tab-inactive'}`}
          >
            <span className="mr-1">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Предметы */}
      {tab === 'inventory' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {items.length === 0 && <p className="text-wood-500 text-sm col-span-3">Инвентарь пуст</p>}
          {items.map((item) => (
            <div key={item.id} className="card-large py-2 px-3">
              <div className="flex items-center gap-2 mb-1">
                <GameImage
                  src={item.item_image || getFallbackUrl('tackle')}
                  fallback={getFallbackUrl('tackle')}
                  alt={item.item_name}
                  className="w-8 h-8 object-contain flex-shrink-0"
                />
                <span className="text-wood-200 text-sm font-serif flex-1">{item.item_name}</span>
                <span className="text-wood-500 text-xs bg-forest-900/50 px-2 py-0.5 rounded">
                  x{item.quantity}
                </span>
              </div>
              {/* Кнопка "Съесть" для еды */}
              {item.item_type === 'food' && (
                <button
                  onClick={async () => {
                    try {
                      await eat(item.object_id)
                      setMessage('Вы перекусили!')
                      loadData()
                      const profile = await getProfile()
                      setPlayer(profile)
                    } catch {
                      setMessage('Ошибка')
                    }
                  }}
                  className="btn btn-primary text-[10px] w-full py-0.5 mt-1"
                >
                  🍴 Съесть
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Снасти */}
      {tab === 'rods' && (
        <div className="space-y-3">
          {!assembling && (
            <button onClick={() => setAssembling(true)} className="btn btn-primary mb-2">
              Собрать удочку
            </button>
          )}
          {assembling && (
            <RodAssembly
              items={items}
              onAssembled={() => {
                setAssembling(false)
                setMessage('Удочка собрана!')
                loadData()
              }}
              onCancel={() => setAssembling(false)}
            />
          )}
          {rods.length === 0 && !assembling && (
            <p className="text-wood-500 text-sm">Нет собранных снастей</p>
          )}
          {rods.map((rod) => (
            <div key={rod.id} className="card-large">
              <div className="flex justify-between items-center mb-2">
                {editingRodId === rod.id ? (
                  <form
                    className="flex gap-1 flex-1 mr-2"
                    onSubmit={async (e) => {
                      e.preventDefault()
                      try {
                        await renameRod(rod.id, editName)
                        setEditingRodId(null)
                        loadData()
                      } catch { setMessage('Ошибка переименования') }
                    }}
                  >
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={64}
                      placeholder={rod.rod_type_name}
                      className="game-input text-sm py-0.5 flex-1"
                      onKeyDown={(e) => { if (e.key === 'Escape') setEditingRodId(null) }}
                    />
                    <button type="submit" className="btn btn-primary text-xs px-2 py-0.5">OK</button>
                    <button type="button" onClick={() => setEditingRodId(null)} className="btn btn-secondary text-xs px-2 py-0.5">
                      Отмена
                    </button>
                  </form>
                ) : (
                  <h3
                    className="font-serif text-wood-200 text-sm cursor-pointer hover:text-gold transition-colors"
                    title="Нажмите для переименования"
                    onClick={() => { setEditingRodId(rod.id); setEditName(rod.custom_name || '') }}
                  >
                    {rod.display_name}
                  </h3>
                )}
                <span className={`badge ${rod.is_ready ? 'badge-green' : 'badge-red'} flex-shrink-0`}>
                  {rod.is_ready ? 'Готова' : 'Не собрана'}
                </span>
              </div>
              {rod.custom_name && (
                <div className="text-[10px] text-wood-600 -mt-1.5 mb-1">{rod.rod_type_name}</div>
              )}
              <div className="text-xs text-wood-500 grid grid-cols-2 gap-x-4 gap-y-0.5">
                <span>Класс: {rod.rod_class === 'float' ? 'Поплавочная' : rod.rod_class === 'spinning' ? 'Спиннинг' : 'Донная'}</span>
                <span>Прочность: <span className={rod.durability_current < 30 ? 'text-red-400' : 'text-green-400'}>{rod.durability_current}%</span></span>
                {rod.reel_name && <span>Катушка: {rod.reel_name}</span>}
                {rod.line_name && <span>Леска: {rod.line_name}</span>}
                {rod.hook_name && <span>Крючок: {rod.hook_name}</span>}
                {rod.float_name && <span>Поплавок: {rod.float_name}</span>}
                {rod.lure_name && <span>Приманка: {rod.lure_name}</span>}
                {rod.bait_name && <span>Наживка: {rod.bait_name} ({rod.bait_remaining})</span>}
                <span>Глубина: {rod.depth_setting}м</span>
                <span>Проводка: {rod.retrieve_speed}/10</span>
              </div>
              {/* Управление удочкой */}
              <RodManagement rod={rod} onUpdate={loadData} />
            </div>
          ))}
        </div>
      )}

      {/* Садок */}
      {tab === 'creel' && (
        <div>
          {creel.length > 0 && (
            <button onClick={handleSellAll} className="btn btn-primary mb-3">
              Продать весь улов
            </button>
          )}
          <div className="space-y-1.5">
            {creel.length === 0 && <p className="text-wood-500 text-sm">Садок пуст</p>}
            {creel.map((fish) => (
              <div key={fish.id} className="card-large flex items-center gap-3 py-2">
                <GameImage
                  src={fish.species_image || getFallbackUrl('fish')}
                  fallback={getFallbackUrl('fish')}
                  alt={fish.species_name}
                  className="w-10 h-8 object-contain flex-shrink-0"
                />
                <div className="flex-1">
                  <span className="text-wood-200 font-serif text-sm">{fish.species_name}</span>
                  <span className="text-wood-500 text-xs ml-2">
                    {fish.weight.toFixed(2)}кг / {fish.length}см
                  </span>
                </div>
                <span className="text-yellow-400 text-xs font-medium">
                  {fish.sell_price}$
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
