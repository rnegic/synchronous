/**
 * API Client Configuration
 *
 * - Base URL points to production API
 * - Credentials included for http-only cookies (secure token storage)
 * - Automatic 401 handling (backend refreshes tokens via cookies)
 * - NO localStorage - tokens stored in http-only cookies only
 * - Error handling and logging
 */

import axios, { AxiosError } from 'axios'; 
import type { InternalAxiosRequestConfig } from 'axios';

// Extend Axios types to include custom properties
declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    skipAuthRefresh?: boolean;
  }
  export interface AxiosRequestConfig {
    skipAuthRefresh?: boolean;
  }
}

// ============================================================================
// Constants
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://focus-sync.ru/api/v1';
const REQUEST_TIMEOUT = 30000; // 30 seconds

// ============================================================================
// Axios Instance
// ============================================================================

/**
 * Main API client with http-only cookie authentication
 *
 * SECURITY:
 * - Tokens are stored in http-only cookies by backend
 * - Cookies are automatically sent with every request
 * - XSS attacks cannot access tokens (no localStorage/sessionStorage)
 * - CSRF protection via sameSite cookie attribute
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies in cross-origin requests
});

// ============================================================================
// Request Interceptor
// ============================================================================

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // No need to manually add Authorization header
    // Cookies are automatically sent by browser when withCredentials: true

    // Log request in development
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        data: config.data,
      });
    }

    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// ============================================================================
// Response Interceptor
// ============================================================================

let isRefreshing = false;
let refreshSubscribers: ((success: boolean) => void)[] = [];

/**
 * Subscribe to token refresh completion
 */
const subscribeTokenRefresh = (callback: (success: boolean) => void) => {
  refreshSubscribers.push(callback);
};

/**
 * Notify all subscribers when token refresh completes
 */
const onTokenRefreshed = (success: boolean) => {
  refreshSubscribers.forEach((callback) => callback(success));
  refreshSubscribers = [];
};

apiClient.interceptors.response.use(
  (response) => {
    // Log response in development
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      });
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { 
      _retry?: boolean;
      skipAuthRefresh?: boolean;
    };

    // Skip auth refresh for specific endpoints to prevent infinite loops
    const shouldSkipRefresh = 
      originalRequest.skipAuthRefresh ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/login');

    // Handle 401 Unauthorized - backend will refresh via http-only cookie
    if (error.response?.status === 401 && !originalRequest._retry && !shouldSkipRefresh) {
      if (isRefreshing) {
        // Wait for token refresh to complete
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((success: boolean) => {
            if (success) {
              resolve(apiClient(originalRequest));
            } else {
              reject(error);
            }
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call refresh endpoint - backend reads refresh token from http-only cookie
        // and sets new access token cookie in response
        await apiClient.post('/auth/refresh');

        // Notify subscribers that refresh succeeded
        onTokenRefreshed(true);

        // Retry original request with new cookie
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - user needs to re-login
        onTokenRefreshed(false);
        
        // Clear any auth state - don't redirect, let app handle it
        isRefreshing = false;
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Log error in development
    if (import.meta.env.DEV) {
      console.error('[API Response Error]', {
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
      });
    }

    return Promise.reject(error);
  }
);

// ============================================================================
// Error Helpers
// ============================================================================

export interface ApiErrorResponse {
  error: string;
  code: string;
  message: string;
}

/**
 * Extract error message from API error response
 */
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiErrorResponse | undefined;
    return apiError?.message || error.message || 'Произошла ошибка';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Произошла неизвестная ошибка';
};

/**
 * Check if error is network error
 */
export const isNetworkError = (error: unknown): boolean => {
  if (axios.isAxiosError(error)) {
    return !error.response && error.code === 'ERR_NETWORK';
  }
  return false;
};
