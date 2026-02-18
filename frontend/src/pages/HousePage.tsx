/**
 * Дом рыбака — самогонный аппарат, ингредиенты, рецепты и варка.
 */
import { useEffect, useState } from 'react'
import { getBuffs, getBrewingSessions, getIngredients, getParts, getRecipes } from '../api/home'
import ApparatusSection from '../components/home/ApparatusSection'
import BrewingSection from '../components/home/BrewingSection'
import IngredientsSection from '../components/home/IngredientsSection'
import RecipesSection from '../components/home/RecipesSection'

export default function HousePage() {
  const [partsData, setPartsData] = useState<{ parts: never[]; collected: number; total: number; is_complete: boolean }>({
    parts: [], collected: 0, total: 0, is_complete: false,
  })
  const [ingredients, setIngredients] = useState([])
  const [recipes, setRecipes] = useState([])
  const [sessions, setSessions] = useState([])
  const [buffs, setBuffs] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([getParts(), getIngredients(), getRecipes(), getBrewingSessions(), getBuffs()])
      .then(([pRes, iRes, rRes, sRes, bRes]) => {
        setPartsData(pRes.data)
        setIngredients(iRes.data)
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
          <button style={{ marginLeft: 'auto', color: '#5c3d1e' }} onClick={() => setMessage('')}>{'\u2716'}</button>
        </div>
      )}

      <ApparatusSection
        parts={partsData.parts}
        collected={partsData.collected}
        total={partsData.total}
        isComplete={partsData.is_complete}
      />

      <IngredientsSection
        ingredients={ingredients}
        onUpdate={load}
        onMessage={handleMessage}
      />

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
