/**
 * API мира — базы и путешествия.
 */
import api from './client'

export interface LocationPlayer {
  id: number
  nickname: string
  rank: number
  rank_title: string
}

export const getBases = () => api.get('/bases/')
export const travelToBase = (baseId: number) => api.post(`/bases/${baseId}/travel/`)
export const getLocations = () => api.get('/locations/')
export const getLocationPlayers = (locationId: number) =>
  api.get<LocationPlayer[]>(`/locations/${locationId}/players/`)
