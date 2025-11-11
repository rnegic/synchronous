/**
 * Messages API
 * Endpoints for Max Messenger chat integration
 * 
 * IMPORTANT: Messages are stored in Max API, not in our database.
 * Use Max SDK/Widget for optimal chat experience.
 */

import { apiClient } from './client';
import type { MessagesResponse, MessageResponse, SendMessageRequest } from './types';

// ============================================================================
// Message Endpoints
// ============================================================================

/**
 * Get messages from Max chat for session
 * @param sessionId - Session UUID
 * @param before - Get messages before this timestamp (Unix ms)
 * @param limit - Number of messages to fetch (default: 50)
 * @returns List of messages from Max API
 */
export const getMessages = async (
  sessionId: string,
  before?: string,
  limit: number = 50
): Promise<MessagesResponse> => {
  const params: Record<string, string | number> = { limit };
  if (before) {
    params.before = before;
  }

  const response = await apiClient.get<MessagesResponse>(
    `/sessions/${sessionId}/messages`,
    { params }
  );
  return response.data;
};

/**
 * Send message to Max chat for session
 * @param sessionId - Session UUID
 * @param text - Message text
 * @returns Sent message from Max API
 */
export const sendMessage = async (
  sessionId: string,
  text: string
): Promise<MessageResponse> => {
  const payload: SendMessageRequest = { text };
  const response = await apiClient.post<MessageResponse>(
    `/sessions/${sessionId}/messages`,
    payload
  );
  return response.data;
};
