/**
 * API зелий.
 */
import api from './client'

export const getPotions = () => api.get('/potions/')
export const getMyStars = () => api.get('/potions/stars/')
export const getActivePotions = () => api.get('/potions/active/')
export const craftPotion = (potionId: number) => api.post('/potions/craft/', { potion_id: potionId })
