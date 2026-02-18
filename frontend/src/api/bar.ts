/**
 * API бара — напитки и закуски.
 */
import api from './client'

export const getBarDrinks = () => api.get('/bar/drinks/')

export const orderDrink = (drinkId: number) =>
  api.post('/bar/order/', { drink_id: drinkId })

export const prepareSnack = (fishId: number, preparation: string) =>
  api.post('/bar/snack/', { fish_id: fishId, preparation })
