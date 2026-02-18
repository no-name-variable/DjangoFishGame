/**
 * API дома рыбака — самогонный аппарат.
 */
import api from './client'

export const getParts = () => api.get('/home/parts/')
export const getIngredients = () => api.get('/home/ingredients/')
export const buyIngredient = (ingredientId: number, quantity: number = 1) =>
  api.post('/home/ingredients/buy/', { ingredient_id: ingredientId, quantity })
export const getRecipes = () => api.get('/home/recipes/')
export const startBrewing = (recipeId: number) => api.post('/home/brew/', { recipe_id: recipeId })
export const getBrewingSessions = () => api.get('/home/brewing/')
export const collectMoonshine = (sessionId: number) => api.post('/home/collect/', { session_id: sessionId })
export const getBuffs = () => api.get('/home/buffs/')
