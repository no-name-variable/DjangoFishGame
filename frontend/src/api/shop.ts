import api from './client'

export async function getShopCategory(category: string) {
  const { data } = await api.get(`/shop/${category}/`)
  return data
}

export async function buyItem(itemType: string, itemId: number, quantity = 1) {
  const { data } = await api.post('/shop/buy/', {
    item_type: itemType,
    item_id: itemId,
    quantity,
  })
  return data
}

export async function sellFish(fishIds: number[]) {
  const { data } = await api.post('/shop/sell-fish/', { fish_ids: fishIds })
  return data
}

export async function getFishSpecies() {
  const { data } = await api.get('/shop/fish/')
  return data
}

export async function repairRod(rodId: number) {
  const { data } = await api.post('/shop/repair-rod/', { rod_id: rodId })
  return data as { status: string; rod_id: number; durability: number; cost: number; money_left: number }
}
