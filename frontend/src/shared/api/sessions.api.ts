/**
 * Sessions API
 * Endpoints for session lifecycle management
 */

import { apiClient } from './client';
import type {
  CreateSessionRequest,
  SessionResponse,
  SessionsHistoryResponse,
  Session,
  UpdateReadyRequest,
  SessionStartResponse,
  SessionReportResponse,
  ChatInfoResponse,
} from './types';

// ============================================================================
// Session Endpoints
// ============================================================================

/**
 * Create new focus session (solo or group)
 * @param sessionData - Session configuration
 * @returns Created session details
 */
export const createSession = async (
  sessionData: CreateSessionRequest
): Promise<SessionResponse> => {
  const response = await apiClient.post<SessionResponse>('/sessions', sessionData);
  return response.data;
};

/**
 * Get session history with pagination
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 10)
 * @returns Paginated list of completed sessions
 */
export const getSessionHistory = async (
  page: number = 1,
  limit: number = 10
): Promise<SessionsHistoryResponse> => {
  const response = await apiClient.get<SessionsHistoryResponse>('/sessions', {
    params: { page, limit },
  });
  return response.data;
};

/**
 * Get public active sessions
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 10)
 * @returns Paginated list of public active sessions
 */
export const getPublicSessions = async (
  page: number = 1,
  limit: number = 10
): Promise<SessionsHistoryResponse> => {
  const response = await apiClient.get<SessionsHistoryResponse>('/sessions/public', {
    params: { page, limit },
  });
  return response.data;
};

/**
 * Get currently active session
 * @returns Active session or null
 */
export const getActiveSession = async (): Promise<Session | null> => {
  const response = await apiClient.get<Session | null>('/sessions/active');
  return response.data;
};

/**
 * Get session by ID
 * @param sessionId - Session UUID
 * @returns Session details
 */
export const getSessionById = async (sessionId: string): Promise<SessionResponse> => {
  const response = await apiClient.get<SessionResponse>(`/sessions/${sessionId}`);
  return response.data;
};

/**
 * Join group session
 * @param sessionId - Session UUID
 * @returns Updated session with participant
 */
export const joinSession = async (sessionId: string): Promise<SessionResponse> => {
  const response = await apiClient.post<SessionResponse>(
    `/sessions/${sessionId}/join`
  );
  return response.data;
};

/**
 * Update participant ready status
 * @param sessionId - Session UUID
 * @param isReady - Ready status
 */
export const setReadyStatus = async (
  sessionId: string,
  isReady: boolean
): Promise<void> => {
  const payload: UpdateReadyRequest = { isReady };
  await apiClient.patch(`/sessions/${sessionId}/ready`, payload);
};

/**
 * Start session (creator only)
 * @param sessionId - Session UUID
 * @returns Updated session status
 */
export const startSession = async (
  sessionId: string
): Promise<SessionStartResponse> => {
  const response = await apiClient.post<SessionStartResponse>(
    `/sessions/${sessionId}/start`
  );
  return response.data;
};

/**
 * Pause active session
 * @param sessionId - Session UUID
 */
export const pauseSession = async (sessionId: string): Promise<void> => {
  await apiClient.post(`/sessions/${sessionId}/pause`);
};

/**
 * Resume paused session
 * @param sessionId - Session UUID
 */
export const resumeSession = async (sessionId: string): Promise<void> => {
  await apiClient.post(`/sessions/${sessionId}/resume`);
};

/**
 * Complete session and generate report
 * @param sessionId - Session UUID
 * @returns Session completion report
 */
export const completeSession = async (
  sessionId: string
): Promise<SessionReportResponse> => {
  const response = await apiClient.post<SessionReportResponse>(
    `/sessions/${sessionId}/complete`
  );
  return response.data;
};

/**
 * Get Max chat information for session
 * @param sessionId - Session UUID
 * @returns Chat details (chatId, link, etc.)
 */
export const getSessionChat = async (
  sessionId: string
): Promise<ChatInfoResponse> => {
  const response = await apiClient.get<ChatInfoResponse>(
    `/sessions/${sessionId}/chat`
  );
  return response.data;
};
