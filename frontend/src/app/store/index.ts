import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import sessionSetupReducer from '@/entities/session/model/sessionSetupSlice';
import activeSessionReducer from '@/entities/session/model/activeSessionSlice';

/**
 * Root Redux store configuration
 * Central state management for the application
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,
    sessionSetup: sessionSetupReducer,
    activeSession: activeSessionReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export hooks
export * from './hooks';
