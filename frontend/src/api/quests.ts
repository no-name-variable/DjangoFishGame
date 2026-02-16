/**
 * API квестов.
 */
import api from './client'

export const getAvailableQuests = () => api.get('/quests/')
export const getPlayerQuests = () => api.get('/quests/my/')
export const acceptQuest = (questId: number) => api.post('/quests/accept/', { quest_id: questId })
export const claimQuestReward = (playerQuestId: number) => api.post(`/quests/${playerQuestId}/claim/`)
