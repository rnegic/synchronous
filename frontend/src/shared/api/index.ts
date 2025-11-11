/**
 * API Module Exports
 * Centralized export point for all API functionality
 */

// Client and utilities
export { apiClient, getErrorMessage, isNetworkError } from './client';

// API methods
export * as authApi from './auth.api';
export * as usersApi from './users.api';
export * as sessionsApi from './sessions.api';
export * as tasksApi from './tasks.api';
export * as messagesApi from './messages.api';
export * as leaderboardApi from './leaderboard.api';

// Types
export type * from './types';
