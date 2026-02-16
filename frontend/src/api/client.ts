/**
 * HTTP-клиент с JWT-интерцептором.
 */
import axios from 'axios'
import { usePlayerStore } from '../store/playerStore'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Добавляем JWT-токен к каждому запросу
api.interceptors.request.use((config) => {
  const token = usePlayerStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Обработка 401 — пробуем обновить токен
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const refreshToken = usePlayerStore.getState().refreshToken
      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/auth/refresh/', {
            refresh: refreshToken,
          })
          usePlayerStore.getState().setTokens(data.access, data.refresh)
          originalRequest.headers.Authorization = `Bearer ${data.access}`
          return api(originalRequest)
        } catch {
          usePlayerStore.getState().logout()
        }
      }
    }
    return Promise.reject(error)
  },
)

export default api
