/**
 * Authentication API
 * Endpoints for login, logout, and token refresh
 * 
 * SECURITY: Tokens are stored in http-only cookies by backend
 * Frontend does not handle tokens directly
 */

import { apiClient } from './client';
import axios from 'axios';
import type {
  LoginRequest,
  LoginResponse,
  RefreshTokenResponse,
} from './types';

// ============================================================================
// Auth Endpoints
// ============================================================================

/**
 * Login with MAX initData
 * Backend will set http-only cookies for access and refresh tokens
 * 
 * @param initData - MAX Bridge initData string (validated by backend)
 * @param deviceId - Unique device identifier
 * @returns User profile data (tokens are in cookies)
 */
export const login = async (
  initData: string,
  deviceId: string
): Promise<LoginResponse> => {
  console.log('[Auth API] 📤 Sending login request', {
    initDataLength: initData.length,
    initDataFull: initData, // 🔍 ПОЛНЫЙ initData для анализа
    deviceIdPreview: deviceId.substring(0, 50),
  });

  const payload: LoginRequest = {
    initData,
    deviceId,
  };

  try {
    const response = await apiClient.post<LoginResponse>('/auth/login', payload);

    console.log('[Auth API] ✅ Login successful', {
      user: response.data.user,
      cookiesReceived: document.cookie.includes('access_token'),
    });

    // Tokens are automatically stored in http-only cookies by backend
    // No need to manually store them
    return response.data;
  } catch (error) {
    console.error('[Auth API] ❌ Login failed', error);
    
    // Log detailed error information
    if (axios.isAxiosError(error)) {
      console.error('[Auth API] Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
      });
    }
    
    throw error;
  }
};

/**
 * Refresh access token using refresh token from http-only cookie
 * Backend reads refresh token from cookie and sets new access token cookie
 * 
 * @returns New access token (in cookie)
 */
export const refreshAccessToken = async (): Promise<RefreshTokenResponse> => {
  const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh');

  // New access token is automatically stored in http-only cookie by backend
  return response.data;
};

/**
 * Logout current user and clear cookies
 * Backend will clear http-only cookies
 */
export const logout = async (): Promise<void> => {
  await apiClient.post('/auth/logout');
  // Cookies are cleared by backend
};

/**
 * Check if user is authenticated
 * We can't access http-only cookies from JS, so we need to check via API call
 * or maintain auth state in Redux after login
 */
export const checkAuth = async (): Promise<boolean> => {
  try {
    // Try to get user profile - if succeeds, user is authenticated
    await apiClient.get('/users/me');
    return true;
  } catch {
    return false;
  }
};
