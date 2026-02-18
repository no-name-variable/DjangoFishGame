import api from './client'

export async function cast(rodId: number, pointX: number, pointY: number) {
  const { data } = await api.post('/fishing/cast/', {
    rod_id: rodId,
    point_x: pointX,
    point_y: pointY,
  })
  return data as { status: string; session_id: number; slot: number }
}

export async function getStatus() {
  const { data } = await api.get('/fishing/status/')
  return data as {
    sessions: SessionData[]
    fights: Record<string, FightData>
    game_time?: { hour: number; day: number; time_of_day: string }
  }
}

export async function strike(sessionId: number) {
  const { data } = await api.post('/fishing/strike/', { session_id: sessionId })
  return data
}

export async function reelIn(sessionId: number) {
  const { data } = await api.post('/fishing/reel-in/', { session_id: sessionId })
  return data
}

export async function pullRod(sessionId: number) {
  const { data } = await api.post('/fishing/pull/', { session_id: sessionId })
  return data
}

export async function keepFish(sessionId: number) {
  const { data } = await api.post('/fishing/keep/', { session_id: sessionId })
  return data
}

export async function releaseFish(sessionId: number) {
  const { data } = await api.post('/fishing/release/', { session_id: sessionId })
  return data
}

export async function retrieveRod(sessionId: number) {
  const { data } = await api.post('/fishing/retrieve/', { session_id: sessionId })
  return data as { status: string }
}

export async function updateRetrieve(sessionId: number, isRetrieving: boolean) {
  const { data } = await api.post('/fishing/update-retrieve/', {
    session_id: sessionId,
    is_retrieving: isRetrieving,
  })
  return data as { status: string; is_retrieving: boolean }
}

export async function changeBait(sessionId: number, baitId: number) {
  const { data } = await api.post('/fishing/change-bait/', {
    session_id: sessionId,
    bait_id: baitId,
  })
  return data as {
    status: string
    session_id: number
    new_bait: string
    bait_remaining: number
  }
}

export async function getGameTime() {
  const { data } = await api.get('/fishing/time/')
  return data
}

export interface SessionData {
  id: number
  state: 'idle' | 'waiting' | 'nibble' | 'bite' | 'fighting' | 'caught'
  slot: number
  location: number
  location_name: string
  rod_id: number
  rod_name: string
  rod_class: 'float' | 'spinning' | 'bottom'
  retrieve_speed: number
  is_retrieving: boolean
  retrieve_progress: number
  cast_x: number
  cast_y: number
  cast_time: string | null
  bite_time: string | null
  hooked_species_name: string | null
  hooked_weight: number | null
  hooked_length: number | null
  hooked_rarity: string | null
  hooked_species_image: string | null
}

export interface FightData {
  session_id: number
  line_tension: number
  distance: number
  rod_durability: number
  fish_strength: number
}
