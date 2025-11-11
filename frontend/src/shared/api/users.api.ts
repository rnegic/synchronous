/**
 * Users API
 * Endpoints for user profile and contacts management
 */

import { apiClient } from './client';
import type { UserProfileResponse, ContactsResponse } from './types';

// ============================================================================
// User Endpoints
// ============================================================================

/**
 * Get current user profile with statistics
 * @param skipAuthRefresh - Skip automatic token refresh on 401 (for auth check)
 * @returns User profile data
 */
export const getMyProfile = async (skipAuthRefresh = false): Promise<UserProfileResponse> => {
  const response = await apiClient.get<UserProfileResponse>('/users/me', {
    skipAuthRefresh,
  });
  return response.data;
};

/**
 * Get user contacts from Max Messenger for invitations
 * @returns List of contacts with registration status
 */
export const getContacts = async (): Promise<ContactsResponse> => {
  const response = await apiClient.get<ContactsResponse>('/users/contacts');
  return response.data;
};
