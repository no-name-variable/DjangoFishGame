/**
 * API турниров.
 */
import api from './client'

export const getTournaments = () => api.get('/tournaments/')
export const getTournament = (id: number) => api.get(`/tournaments/${id}/`)
export const joinTournament = (tournamentId: number) => api.post('/tournaments/join/', { tournament_id: tournamentId })
export const getTournamentResults = (id: number) => api.get(`/tournaments/${id}/results/`)
