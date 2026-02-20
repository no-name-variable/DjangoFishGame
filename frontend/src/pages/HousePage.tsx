/**
 * Дом рыбака — самогонный аппарат, рецепты и варка.
 * Ингредиенты покупаются в магазине и хранятся в рюкзаке.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getBuffs, getBrewingSessions, getParts, getRecipes } from '../api/home'
import ApparatusSection from '../components/home/ApparatusSection'
import BrewingSection from '../components/home/BrewingSection'
import RecipesSection from '../components/home/RecipesSection'

export default function HousePage() {
  const [partsData, setPartsData] = useState<{ parts: never[]; collected: number; total: number; is_complete: boolean }>({
    parts: [], collected: 0, total: 0, is_complete: false,
  })
  const [recipes, setRecipes] = useState([])
  const [sessions, setSessions] = useState([])
  const [buffs, setBuffs] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    Promise.all([getParts(), getRecipes(), getBrewingSessions(), getBuffs()])
      .then(([pRes, rRes, sRes, bRes]) => {
        setPartsData(pRes.data)
        setRecipes(rRes.data)
        setSessions(sRes.data)
        setBuffs(bRes.data)
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleMessage = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(''), 4000)
  }

  if (loading) return (
    <div className="p-10 text-center text-wood-500 text-sm">
      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{'\uD83C\uDFE0'}</div>
      Загрузка...
    </div>
  )

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="gold-text text-xl mb-4">{'\uD83C\uDFE0'} Дом рыбака</h1>

      {message && (
        <div className="wood-panel px-3 py-2 mb-3 text-sm" style={{
          color: '#d4c5a9',
          display: 'flex', gap: '6px', alignItems: 'center',
        }}>
          {message}
          <button style={{ marginLeft: 'auto', color: '#a8894e' }} onClick={() => setMessage('')}>{'\u2716'}</button>
        </div>
      )}

      <ApparatusSection
        parts={partsData.parts}
        collected={partsData.collected}
        total={partsData.total}
        isComplete={partsData.is_complete}
      />

      {/* Подсказка: ингредиенты в магазине */}
      <div className="card mb-4" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderColor: 'rgba(234,179,8,0.2)',
      }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: '#d4c5a9', fontFamily: 'Georgia, serif' }}>
            Ингредиенты для самогона
          </div>
          <div style={{ fontSize: '0.68rem', color: '#a8894e' }}>
            Покупайте в магазине, хранятся в рюкзаке
          </div>
        </div>
        <button
          className="btn btn-action text-xs"
          style={{ minHeight: '32px', flexShrink: 0 }}
          onClick={() => navigate('/shop')}
        >
          {'\uD83D\uDED2'} В магазин
        </button>
      </div>

      <RecipesSection
        recipes={recipes}
        isApparatusComplete={partsData.is_complete}
        onUpdate={load}
        onMessage={handleMessage}
      />

      <BrewingSection
        sessions={sessions}
        buffs={buffs}
        onUpdate={load}
        onMessage={handleMessage}
      />
    </div>
  )
}
