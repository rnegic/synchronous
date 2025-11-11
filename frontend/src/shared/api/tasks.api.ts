/**
 * Tasks API
 * Endpoints for task management within sessions
 */

import { apiClient } from './client';
import type { UpdateTaskRequest, AddTaskRequest, TaskResponse } from './types';

// ============================================================================
// Task Endpoints
// ============================================================================

/**
 * Update task status (completed/incomplete)
 * @param sessionId - Session UUID
 * @param taskId - Task UUID
 * @param completed - New completion status
 * @returns Updated task
 */
export const updateTask = async (
  sessionId: string,
  taskId: string,
  completed: boolean
): Promise<TaskResponse> => {
  const payload: UpdateTaskRequest = { completed };
  const response = await apiClient.patch<TaskResponse>(
    `/sessions/${sessionId}/tasks/${taskId}`,
    payload
  );
  return response.data;
};

/**
 * Delete task from session
 * @param sessionId - Session UUID
 * @param taskId - Task UUID
 */
export const deleteTask = async (
  sessionId: string,
  taskId: string
): Promise<void> => {
  await apiClient.delete(`/sessions/${sessionId}/tasks/${taskId}`);
};

/**
 * Add new task to active session
 * @param sessionId - Session UUID
 * @param title - Task title
 * @returns Created task
 */
export const addTask = async (
  sessionId: string,
  title: string
): Promise<TaskResponse> => {
  const payload: AddTaskRequest = { title };
  const response = await apiClient.post<TaskResponse>(
    `/sessions/${sessionId}/tasks`,
    payload
  );
  return response.data;
};
