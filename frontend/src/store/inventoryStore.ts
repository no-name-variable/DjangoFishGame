/**
 * Стейт инвентаря.
 */
import { create } from 'zustand'

interface InventoryItem {
  id: number
  item_type: string
  object_id: number
  item_name: string
  item_image: string | null
  quantity: number
}

interface PlayerRod {
  id: number
  rod_type: number
  rod_type_name: string
  display_name: string
  custom_name: string
  rod_class: 'float' | 'spinning' | 'bottom'
  reel: number | null
  reel_name: string | null
  line: number | null
  line_name: string | null
  hook: number | null
  hook_name: string | null
  float_tackle: number | null
  float_name: string | null
  lure: number | null
  lure_name: string | null
  bait: number | null
  bait_name: string | null
  bait_remaining: number
  durability_current: number
  durability_max: number
  is_assembled: boolean
  is_ready: boolean
  depth_setting: number
  retrieve_speed: number
}

interface CaughtFish {
  id: number
  species: number
  species_name: string
  species_rarity: string
  species_image: string | null
  weight: number
  length: number
  sell_price: number
  experience_reward: number
  caught_at: string
}

interface InventoryStoreState {
  items: InventoryItem[]
  rods: PlayerRod[]
  creel: CaughtFish[]
  setItems: (items: InventoryItem[]) => void
  setRods: (rods: PlayerRod[]) => void
  setCreel: (creel: CaughtFish[]) => void
}

export const useInventoryStore = create<InventoryStoreState>((set) => ({
  items: [],
  rods: [],
  creel: [],

  setItems: (items) => set({ items }),
  setRods: (rods) => set({ rods }),
  setCreel: (creel) => set({ creel }),
}))
