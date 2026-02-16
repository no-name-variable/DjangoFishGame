/**
 * API команд.
 */
import api from './client'

export const getTeams = () => api.get('/teams/')
export const getTeam = (id: number) => api.get(`/teams/${id}/`)
export const getMyTeam = () => api.get('/teams/my/')
export const createTeam = (name: string, description?: string) => api.post('/teams/create/', { name, description })
export const joinTeam = (id: number) => api.post(`/teams/${id}/join/`)
export const leaveTeam = () => api.post('/teams/leave/')
