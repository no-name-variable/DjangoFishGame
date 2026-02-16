/**
 * API рекордов и достижений.
 */
import api from './client'

export const getRecords = () => api.get('/records/')
export const getRecordsBySpecies = (speciesId: number) => api.get(`/records/species/${speciesId}/`)
export const getAchievements = () => api.get('/achievements/')
export const getPlayerAchievements = () => api.get('/player/achievements/')
export const getPlayerJournal = () => api.get('/player/journal/')
