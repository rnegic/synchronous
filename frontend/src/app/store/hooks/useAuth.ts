/**
 * Auth Hooks
 * Convenient hooks for authentication in React components
 */

import { useSelector, useDispatch } from 'react-redux';
import { useCallback, useEffect } from 'react';
import type { AppDispatch } from '@/app/store';
import {
  selectAuth,
  selectUser,
  selectIsAuthenticated,
  selectAuthLoading,
  selectAuthError,
  loginThunk,
  logoutThunk,
  checkAuthThunk,
  refreshUserThunk,
  clearError,
} from '@/app/store/slices/authSlice';

// ============================================================================
// Main Auth Hook
// ============================================================================

/**
 * Main authentication hook
 * Provides auth state and actions
 */
export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const auth = useSelector(selectAuth);

  const login = useCallback(
    (maxToken: string, deviceId: string) => {
      return dispatch(loginThunk({ maxToken, deviceId }));
    },
    [dispatch]
  );

  const logout = useCallback(() => {
    return dispatch(logoutThunk());
  }, [dispatch]);

  const checkAuth = useCallback(() => {
    return dispatch(checkAuthThunk());
  }, [dispatch]);

  const refreshUser = useCallback(() => {
    return dispatch(refreshUserThunk());
  }, [dispatch]);

  const clearAuthError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  return {
    ...auth,
    login,
    logout,
    checkAuth,
    refreshUser,
    clearError: clearAuthError,
  };
};

// ============================================================================
// Specific Selectors
// ============================================================================

/**
 * Get current user
 */
export const useUser = () => {
  return useSelector(selectUser);
};

/**
 * Check if user is authenticated
 */
export const useIsAuthenticated = () => {
  return useSelector(selectIsAuthenticated);
};

/**
 * Check if auth operation is loading
 */
export const useAuthLoading = () => {
  return useSelector(selectAuthLoading);
};

/**
 * Get auth error message
 */
export const useAuthError = () => {
  return useSelector(selectAuthError);
};

// ============================================================================
// App Initialization Hook
// ============================================================================

/**
 * Hook to check authentication on app mount
 * Use in root App component
 */
export const useAuthInit = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Only check auth if not already authenticated and not loading
    if (!isAuthenticated && !isLoading) {
      dispatch(checkAuthThunk());
    }
  }, [dispatch, isAuthenticated, isLoading]);

  return { isAuthenticated, isLoading };
};
