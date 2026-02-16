import api from './client'

// Разобрать удочку (возврат компонентов в инвентарь)
export async function disassembleRod(rodId: number) {
  const { data } = await api.post(`/player/rods/${rodId}/disassemble/`)
  return data as { status: string }
}

// Удалить удочку без возврата компонентов
export async function deleteRod(rodId: number) {
  const { data } = await api.delete(`/player/rods/${rodId}/delete/`)
  return data as { status: string }
}

// Экипировать удочку в слот (1, 2 или 3)
export async function equipRod(rodId: number, slot: 1 | 2 | 3) {
  const { data } = await api.post(`/player/rods/${rodId}/equip/`, { slot })
  return data as { status: string; slot: number; rod: any }
}

// Снять удочку из слота
export async function unequipRod(rodId: number) {
  const { data } = await api.post(`/player/rods/${rodId}/unequip/`)
  return data as { status: string }
}

// Получить список собранных удочек
export async function getRods() {
  const { data } = await api.get('/player/rods/')
  return data as { results: PlayerRod[] }
}

export interface PlayerRod {
  id: number
  rod_type: number
  rod_type_name: string
  rod_class: 'float' | 'spinning' | 'bottom'
  custom_name: string | null
  is_assembled: boolean
  is_ready: boolean
  reel: number | null
  line: number | null
  hook: number | null
  float_tackle: number | null
  lure: number | null
  bait: number | null
  bait_remaining: number
  depth_setting: number
  retrieve_speed: number
  durability_current: number
  durability_max: number
}
