import api from './client'

export async function getInventory() {
  return api.get('/player/inventory/')
}

export async function getPlayerRods() {
  const { data } = await api.get('/player/rods/')
  return data
}

export async function getCreel() {
  const { data } = await api.get('/player/creel/')
  return data
}

export async function assembleRod(params: {
  rod_type_id: number
  reel_id?: number
  line_id?: number
  hook_id?: number
  float_tackle_id?: number
  lure_id?: number
  bait_id?: number
  depth_setting?: number
  retrieve_speed?: number
  clip_distance?: number
}) {
  const { data } = await api.post('/fishing/assemble-rod/', params)
  return data
}

export async function renameRod(rodId: number, customName: string) {
  const { data } = await api.patch(`/player/rods/${rodId}/rename/`, { custom_name: customName })
  return data
}

export async function updateRodSettings(
  rodId: number,
  settings: { depth_setting?: number; retrieve_speed?: number; clip_distance?: number },
) {
  const { data } = await api.patch(`/player/rods/${rodId}/settings/`, settings)
  return data
}

export async function changeTackle(
  rodId: number,
  changes: { hook_id?: number | null; float_tackle_id?: number | null; lure_id?: number | null; bait_id?: number | null },
) {
  const { data } = await api.patch(`/player/rods/${rodId}/tackle/`, changes)
  return data
}

export async function eat(foodId: number) {
  const { data } = await api.post('/player/eat/', { food_id: foodId })
  return data
}

export async function getBases() {
  const { data } = await api.get('/bases/')
  return data
}

export async function getLocations(baseId: number) {
  const { data } = await api.get(`/bases/${baseId}/locations/`)
  return data
}

export async function enterLocation(locationId: number) {
  const { data } = await api.post(`/locations/${locationId}/enter/`)
  return data
}

export async function leaveLocation(locationId: number) {
  const { data } = await api.post(`/locations/${locationId}/leave/`)
  return data
}

export async function travelToBase(baseId: number) {
  const { data } = await api.post(`/bases/${baseId}/travel/`)
  return data
}
