/**
 * Leaderboard API
 * Endpoints for session and global leaderboards
 */

import { apiClient } from './client';
import type { LeaderboardResponse, LeaderboardPeriod } from './types';

// ============================================================================
// Leaderboard Endpoints
// ============================================================================

/**
 * Get leaderboard for specific session
 * @param sessionId - Session UUID
 * @returns Ranked list of participants
 */
export const getSessionLeaderboard = async (
  sessionId: string
): Promise<LeaderboardResponse> => {
  const response = await apiClient.get<LeaderboardResponse>(
    `/sessions/${sessionId}/leaderboard`
  );
  return response.data;
};

/**
 * Get global leaderboard
 * @param period - Time period (day/week/month/all)
 * @param limit - Number of entries (default: 50)
 * @returns Ranked list of top users
 */
export const getGlobalLeaderboard = async (
  period: LeaderboardPeriod = 'week',
  limit: number = 50
): Promise<LeaderboardResponse> => {
  const response = await apiClient.get<LeaderboardResponse>('/leaderboard/global', {
    params: { period, limit },
  });
  return response.data;
};
