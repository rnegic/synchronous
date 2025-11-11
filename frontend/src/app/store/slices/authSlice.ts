/**
 * Authentication Slice
 * 
 * Manages user authentication state without storing tokens
 * Tokens are in http-only cookies managed by backend
 * 
 * State includes:
 * - user: Current user profile
 * - isAuthenticated: Authentication status
 * - loading: Async operation status
 * - error: Error messages
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { authApi, usersApi, getErrorMessage } from '@/shared/api';
import type { User } from '@/shared/api';

// ============================================================================
// Types
// ============================================================================

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface LoginPayload {
  initData: string; // MAX Bridge initData
  deviceId: string;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// ============================================================================
// Async Thunks
// ============================================================================

/**
 * Login with MAX initData
 * Backend sets http-only cookies for auth tokens
 */
export const loginThunk = createAsyncThunk(
  'auth/login',
  async (payload: LoginPayload, { rejectWithValue }) => {
    try {
      const response = await authApi.login(payload.initData, payload.deviceId);
      return response.user;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

/**
 * Logout current user
 * Backend clears http-only cookies
 */
export const logoutThunk = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authApi.logout();
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

/**
 * Check authentication status on app initialization
 * Attempts to fetch user profile - if succeeds, user is authenticated
 * Uses skipAuthRefresh to prevent infinite 401 loops
 */
export const checkAuthThunk = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    try {
      const response = await usersApi.getMyProfile(true); // Skip auth refresh
      return response;
    } catch (error) {
      // If request fails, user is not authenticated
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

/**
 * Refresh user profile data
 * Useful after profile updates
 */
export const refreshUserThunk = createAsyncThunk(
  'auth/refreshUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await usersApi.getMyProfile();
      return response;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// ============================================================================
// Slice
// ============================================================================

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Clear error message
     */
    clearError: (state) => {
      state.error = null;
    },
    
    /**
     * Clear authentication state (used when token refresh fails)
     */
    clearAuth: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });

    // Logout
    builder
      .addCase(logoutThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logoutThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        // Clear auth state even if logout request fails
        state.user = null;
        state.isAuthenticated = false;
      });

    // Check Auth
    builder
      .addCase(checkAuthThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(checkAuthThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(checkAuthThunk.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        // Don't set error for checkAuth - it's expected to fail when not authenticated
      });

    // Refresh User
    builder
      .addCase(refreshUserThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(refreshUserThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(refreshUserThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

// ============================================================================
// Actions & Reducer
// ============================================================================

export const { clearError, clearAuth } = authSlice.actions;
export default authSlice.reducer;

// ============================================================================
// Selectors
// ============================================================================

export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;
