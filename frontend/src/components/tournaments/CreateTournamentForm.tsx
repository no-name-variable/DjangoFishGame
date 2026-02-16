/**
 * Форма создания турнира.
 */
import { useState, useEffect } from 'react'
import { createTournament } from '../../api/tournaments'
import { getFishSpecies } from '../../api/shop'
import { getLocations } from '../../api/world'

interface Props {
  onSuccess: () => void
  onCancel: () => void
}

export default function CreateTournamentForm({ onSuccess, onCancel }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tournamentType, setTournamentType] = useState<'individual' | 'team'>('individual')
  const [scoring, setScoring] = useState<'weight' | 'count' | 'specific_fish'>('weight')
  const [targetSpecies, setTargetSpecies] = useState<number | null>(null)
  const [targetLocation, setTargetLocation] = useState<number | null>(null)
  const [entryFee, setEntryFee] = useState(0)
  const [prizeMoney, setPrizeMoney] = useState(0)
  const [prizeExp, setPrizeExp] = useState(0)
  const [prizeKarma, setPrizeKarma] = useState(0)
  const [minRank, setMinRank] = useState(1)
  const [maxParticipants, setMaxParticipants] = useState(50)
  const [duration, setDuration] = useState(2) // часы

  const [fishSpecies, setFishSpecies] = useState<Array<{ id: number; name_ru: string }>>([])
  const [locations, setLocations] = useState<Array<{ id: number; name: string }>>([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getFishSpecies().then((res) => setFishSpecies(res.data.results || res.data)).catch(() => {})
    getLocations().then((res) => setLocations(res.data.results || res.data)).catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Укажите название турнира')
      return
    }

    const now = new Date()
    const startTime = new Date(now.getTime() + 5 * 60000) // Начало через 5 минут
    const endTime = new Date(startTime.getTime() + duration * 3600000)

    const data = {
      name,
      description,
      tournament_type: tournamentType,
      scoring,
      target_species: scoring === 'specific_fish' ? targetSpecies : null,
      target_location: targetLocation,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      entry_fee: entryFee,
      prize_money: prizeMoney,
      prize_experience: prizeExp,
      prize_karma: prizeKarma,
      min_rank: minRank,
      max_participants: maxParticipants,
    }

    setSubmitting(true)
    try {
      await createTournament(data)
      onSuccess()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Ошибка создания турнира')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="card-large">
      <h2 className="gold-text text-base mb-3">Создать турнир</h2>

      {error && <div className="text-red-400 text-xs mb-2">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-2">
        <div>
          <label className="text-wood-300 text-xs block mb-1">Название *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="game-input text-xs py-1"
            placeholder="Турнир на карася"
            required
          />
        </div>

        <div>
          <label className="text-wood-300 text-xs block mb-1">Описание</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="game-input text-xs py-1 h-16 resize-none"
            placeholder="Ловим карася на пруду"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-wood-300 text-xs block mb-1">Тип</label>
            <select
              value={tournamentType}
              onChange={(e) => setTournamentType(e.target.value as any)}
              className="game-input text-xs py-1"
            >
              <option value="individual">Индивидуальный</option>
              <option value="team">Командный</option>
            </select>
          </div>

          <div>
            <label className="text-wood-300 text-xs block mb-1">Подсчёт</label>
            <select
              value={scoring}
              onChange={(e) => setScoring(e.target.value as any)}
              className="game-input text-xs py-1"
            >
              <option value="weight">По весу</option>
              <option value="count">По количеству</option>
              <option value="specific_fish">По виду рыбы</option>
            </select>
          </div>
        </div>

        {scoring === 'specific_fish' && (
          <div>
            <label className="text-wood-300 text-xs block mb-1">Целевая рыба *</label>
            <select
              value={targetSpecies || ''}
              onChange={(e) => setTargetSpecies(Number(e.target.value) || null)}
              className="game-input text-xs py-1"
              required
            >
              <option value="">Выберите рыбу</option>
              {fishSpecies.map((fish) => (
                <option key={fish.id} value={fish.id}>{fish.name_ru}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="text-wood-300 text-xs block mb-1">Целевая локация (опционально)</label>
          <select
            value={targetLocation || ''}
            onChange={(e) => setTargetLocation(Number(e.target.value) || null)}
            className="game-input text-xs py-1"
          >
            <option value="">Любая локация</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-wood-300 text-xs block mb-1">Длительность (часов)</label>
            <input
              type="number"
              min="1"
              max="24"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="game-input text-xs py-1"
            />
          </div>

          <div>
            <label className="text-wood-300 text-xs block mb-1">Макс. участников</label>
            <input
              type="number"
              min="2"
              max="500"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(Number(e.target.value))}
              className="game-input text-xs py-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-wood-300 text-xs block mb-1">Вступительный взнос ($)</label>
            <input
              type="number"
              min="0"
              value={entryFee}
              onChange={(e) => setEntryFee(Number(e.target.value))}
              className="game-input text-xs py-1"
            />
          </div>

          <div>
            <label className="text-wood-300 text-xs block mb-1">Минимальный разряд</label>
            <input
              type="number"
              min="1"
              max="10"
              value={minRank}
              onChange={(e) => setMinRank(Number(e.target.value))}
              className="game-input text-xs py-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-wood-300 text-xs block mb-1">Приз ($)</label>
            <input
              type="number"
              min="0"
              value={prizeMoney}
              onChange={(e) => setPrizeMoney(Number(e.target.value))}
              className="game-input text-xs py-1"
            />
          </div>

          <div>
            <label className="text-wood-300 text-xs block mb-1">Опыт</label>
            <input
              type="number"
              min="0"
              value={prizeExp}
              onChange={(e) => setPrizeExp(Number(e.target.value))}
              className="game-input text-xs py-1"
            />
          </div>

          <div>
            <label className="text-wood-300 text-xs block mb-1">Карма</label>
            <input
              type="number"
              min="0"
              value={prizeKarma}
              onChange={(e) => setPrizeKarma(Number(e.target.value))}
              className="game-input text-xs py-1"
            />
          </div>
        </div>

        <div className="text-wood-500 text-[10px] py-1">
          💰 Стоимость создания: 100$ | Минимальный разряд: 3
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary text-xs flex-1"
          >
            {submitting ? 'Создание...' : 'Создать турнир'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary text-xs"
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  )
}
