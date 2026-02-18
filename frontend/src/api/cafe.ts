/**
 * API кафе — заказы рыбы на локациях.
 */
import api from './client'

export const getCafeOrders = () => api.get('/cafe/orders/')

export const deliverFish = (orderId: number, fishIds: number[]) =>
  api.post('/cafe/deliver/', { order_id: orderId, fish_ids: fishIds })
