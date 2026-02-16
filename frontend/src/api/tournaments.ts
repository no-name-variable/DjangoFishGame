/**
 * API турниров.
 */
import api from './client'

export const getTournaments = () => api.get('/tournaments/')
export const getTournament = (id: number) => api.get(`/tournaments/${id}/`)
export const joinTournament = (tournamentId: number) => api.post('/tournaments/join/', { tournament_id: tournamentId })
export const getTournamentResults = (id: number) => api.get(`/tournaments/${id}/results/`)

export const createTournament = (data: {
  name: string
  description: string
  tournament_type: 'individual' | 'team'
  scoring: 'weight' | 'count' | 'specific_fish'
  target_species?: number | null
  target_location?: number | null
  start_time: string
  end_time: string
  entry_fee: number
  prize_money: number
  prize_experience: number
  prize_karma: number
  min_rank: number
  max_participants: number
}) => api.post('/tournaments/create/', data)
