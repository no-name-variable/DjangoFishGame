/**
 * API барахолки.
 */
import api from './client'

export const getListings = (itemType?: string) =>
  api.get('/bazaar/', { params: itemType ? { item_type: itemType } : {} })
export const getMyListings = () => api.get('/bazaar/my/')
export const createListing = (itemType: string, itemId: number, quantity: number, price: number) =>
  api.post('/bazaar/create/', { item_type: itemType, item_id: itemId, quantity, price })
export const buyListing = (id: number) => api.post(`/bazaar/${id}/buy/`)
export const cancelListing = (id: number) => api.post(`/bazaar/${id}/cancel/`)
