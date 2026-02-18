/**
 * API дома рыбака — самогонный аппарат.
 */
import api from './client'

export const getParts = () => api.get('/home/parts/')
export const getRecipes = () => api.get('/home/recipes/')
export const startBrewing = (recipeId: number) => api.post('/home/brew/', { recipe_id: recipeId })
export const getBrewingSessions = () => api.get('/home/brewing/')
export const collectMoonshine = (sessionId: number) => api.post('/home/collect/', { session_id: sessionId })
export const getBuffs = () => api.get('/home/buffs/')
