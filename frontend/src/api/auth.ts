import api from './client'

export async function login(username: string, password: string) {
  const { data } = await api.post('/auth/login/', { username, password })
  return data as { access: string; refresh: string }
}

export async function register(username: string, password: string, nickname: string) {
  const { data } = await api.post('/auth/register/', { username, password, nickname })
  return data
}

export async function getProfile() {
  const { data } = await api.get('/auth/profile/')
  return data
}
