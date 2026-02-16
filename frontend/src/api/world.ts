/**
 * API мира — базы и путешествия.
 */
import api from './client'

export const getBases = () => api.get('/bases/')
export const travelToBase = (baseId: number) => api.post(`/bases/${baseId}/travel/`)
export const getLocations = () => api.get('/locations/')
