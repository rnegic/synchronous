import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { SessionMode } from '@/shared/types';

interface SessionSetupState {
  tasks: string[];
  currentTask: string;
  mode: SessionMode;
  groupName: string;
  isPrivate: boolean;
  focusDuration: number;
  breakDuration: number;
}

const initialState: SessionSetupState = {
  tasks: [],
  currentTask: '',
  mode: 'solo',
  groupName: '',
  isPrivate: false,
  focusDuration: 25,
  breakDuration: 5,
};

/**
 * Redux slice for session setup state management
 * Handles all form state for creating new focus sessions
 */
const sessionSetupSlice = createSlice({
  name: 'sessionSetup',
  initialState,
  reducers: {
    setCurrentTask: (state, action: PayloadAction<string>) => {
      state.currentTask = action.payload;
    },
    addTask: (state) => {
      if (state.currentTask.trim()) {
        state.tasks.push(state.currentTask.trim());
        state.currentTask = '';
      }
    },
    removeTask: (state, action: PayloadAction<number>) => {
      state.tasks = state.tasks.filter((_, index) => index !== action.payload);
    },
    setMode: (state, action: PayloadAction<SessionMode>) => {
      state.mode = action.payload;
    },
    setGroupName: (state, action: PayloadAction<string>) => {
      state.groupName = action.payload;
    },
    setIsPrivate: (state, action: PayloadAction<boolean>) => {
      state.isPrivate = action.payload;
    },
    setFocusDuration: (state, action: PayloadAction<number>) => {
      state.focusDuration = action.payload;
    },
    setBreakDuration: (state, action: PayloadAction<number>) => {
      state.breakDuration = action.payload;
    },
    hydrateSessionSetup: (state, action: PayloadAction<Partial<Omit<SessionSetupState, 'currentTask'>>>) => {
      return {
        ...state,
        ...action.payload,
        currentTask: '',
      };
    },
    resetSessionSetup: () => initialState,
  },
});

export const {
  setCurrentTask,
  addTask,
  removeTask,
  setMode,
  setGroupName,
  setIsPrivate,
  setFocusDuration,
  setBreakDuration,
  resetSessionSetup,
  hydrateSessionSetup,
} = sessionSetupSlice.actions;

export default sessionSetupSlice.reducer;
