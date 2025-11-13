import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Task, User } from '@/shared/types';
import { sessionsApi } from '@/shared/api';

export type SessionPhase = 'focus' | 'break';
export type SessionStatus = 'pending' | 'running' | 'paused' | 'completed';

export interface ActiveSessionState {
  // Session metadata
  sessionId: string | null;
  mode: 'solo' | 'group';
  groupName?: string;
  
  // Timer state
  phase: SessionPhase;
  status: SessionStatus;
  remainingTime: number; // seconds
  totalTime: number; // seconds for current phase
  focusDuration: number; // minutes
  breakDuration: number; // minutes
  currentCycle: number; // which pomodoro cycle
  
  // Tasks
  tasks: Task[];
  
  // Participants (for group mode)
  participants: User[];
  inviteLink?: string;
  
  // Backend sync
  isStarted: boolean; // Tracks if session was started on backend
}

const initialState: ActiveSessionState = {
  sessionId: null,
  mode: 'solo',
  phase: 'focus',
  status: 'pending',
  remainingTime: 1500, // 25 minutes default
  totalTime: 1500,
  focusDuration: 25,
  breakDuration: 5,
  currentCycle: 1,
  tasks: [],
  participants: [],
  isStarted: false,
};

// ============================================================================
// Async Thunks
// ============================================================================

/**
 * Start session on backend (solo mode auto-starts)
 */
export const startSessionAsync = createAsyncThunk<
  void,
  void,
  { state: { activeSession: ActiveSessionState } }
>(
  'activeSession/startSessionAsync',
  async (_, { getState }) => {
    const { sessionId, mode } = getState().activeSession;
    
    if (!sessionId) {
      throw new Error('No active session');
    }

    // Solo sessions start immediately, group sessions start when creator clicks start
    if (mode === 'solo') {
      await sessionsApi.startSession(sessionId);
    }
  }
);

/**
 * Toggle pause/resume with backend sync
 */
export const togglePauseAsync = createAsyncThunk<
  void,
  void,
  { state: { activeSession: ActiveSessionState } }
>(
  'activeSession/togglePauseAsync',
  async (_, { getState, dispatch }) => {
    const { sessionId, status, isStarted, mode } = getState().activeSession;
    
    if (!sessionId) {
      throw new Error('No active session');
    }

    // Auto-start solo session if not started yet
    if (!isStarted && mode === 'solo') {
      await dispatch(startSessionAsync()).unwrap();
      return;
    }

    // Toggle pause/resume on backend
    if (status === 'running') {
      await sessionsApi.pauseSession(sessionId);
    } else if (status === 'paused') {
      await sessionsApi.resumeSession(sessionId);
    }
  }
);

/**
 * Complete session on backend
 */
export const completeSessionAsync = createAsyncThunk<
  void,
  void,
  { state: { activeSession: ActiveSessionState } }
>(
  'activeSession/completeSessionAsync',
  async (_, { getState }) => {
    const { sessionId } = getState().activeSession;
    
    if (!sessionId) {
      throw new Error('No active session');
    }

    await sessionsApi.completeSession(sessionId);
  }
);

// ============================================================================
// Slice
// ============================================================================

const activeSessionSlice = createSlice({
  name: 'activeSession',
  initialState,
  reducers: {
    // Initialize session
    startSession: (state, action: PayloadAction<{
      sessionId: string;
      mode: 'solo' | 'group';
      groupName?: string;
      focusDuration: number;
      breakDuration: number;
      tasks: Task[];
      participants?: User[];
    }>) => {
      state.sessionId = action.payload.sessionId;
      state.mode = action.payload.mode;
      state.groupName = action.payload.groupName;
      state.focusDuration = action.payload.focusDuration;
      state.breakDuration = action.payload.breakDuration;
      state.totalTime = action.payload.focusDuration * 60;
      state.remainingTime = action.payload.focusDuration * 60;
      state.tasks = action.payload.tasks;
      state.participants = action.payload.participants || [];
      state.phase = 'focus';
      state.status = 'pending';
      state.currentCycle = 1;
      state.isStarted = false;
    },
    
    // Timer controls
    togglePause: (state) => {
      state.status = state.status === 'running' ? 'paused' : 'running';
    },
    
    tick: (state) => {
      if (state.status === 'running' && state.remainingTime > 0) {
        state.remainingTime -= 1;
      }
    },
    
    // Phase management
    switchPhase: (state) => {
      if (state.phase === 'focus') {
        state.phase = 'break';
        state.totalTime = state.breakDuration * 60;
        state.remainingTime = state.breakDuration * 60;
      } else {
        state.phase = 'focus';
        state.totalTime = state.focusDuration * 60;
        state.remainingTime = state.focusDuration * 60;
        state.currentCycle += 1;
      }
    },
    
    skipPhase: (state) => {
      if (state.phase === 'focus') {
        state.phase = 'break';
        state.totalTime = state.breakDuration * 60;
        state.remainingTime = state.breakDuration * 60;
      } else {
        state.phase = 'focus';
        state.totalTime = state.focusDuration * 60;
        state.remainingTime = state.focusDuration * 60;
        state.currentCycle += 1;
      }
    },
    
    // Task management
    toggleTask: (state, action: PayloadAction<string>) => {
      const task = state.tasks.find(t => t.id === action.payload);
      if (task) {
        task.completed = !task.completed;
      }
    },
    
    // Participants management
    addParticipant: (state, action: PayloadAction<User>) => {
      if (!state.participants.find(p => p.id === action.payload.id)) {
        state.participants.push(action.payload);
      }
    },
    
    removeParticipant: (state, action: PayloadAction<string>) => {
      state.participants = state.participants.filter(p => p.id !== action.payload);
    },
    
    setInviteLink: (state, action: PayloadAction<string>) => {
      state.inviteLink = action.payload;
    },
    
    // End session
    completeSession: (state) => {
      state.status = 'completed';
    },
    
    resetSession: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Start session
      .addCase(startSessionAsync.fulfilled, (state) => {
        state.isStarted = true;
        state.status = 'running';
      })
      .addCase(startSessionAsync.rejected, (state, action) => {
        console.error('[startSessionAsync] Failed:', action.error);
        state.status = 'pending';
      })
      // Toggle pause
      .addCase(togglePauseAsync.pending, (state) => {
        // Optimistically update UI
        if (state.status === 'pending' && !state.isStarted) {
          state.status = 'running';
        } else if (state.status === 'running') {
          state.status = 'paused';
        } else if (state.status === 'paused') {
          state.status = 'running';
        }
      })
      .addCase(togglePauseAsync.fulfilled, (state) => {
        // Mark as started after first toggle
        if (!state.isStarted) {
          state.isStarted = true;
        }
      })
      .addCase(togglePauseAsync.rejected, (state, action) => {
        // Revert optimistic update
        if (state.status === 'running' && !state.isStarted) {
          state.status = 'pending';
        } else if (state.status === 'running') {
          state.status = 'paused';
        } else if (state.status === 'paused') {
          state.status = 'running';
        }
        console.error('[togglePauseAsync] Failed:', action.error);
      })
      // Complete session
      .addCase(completeSessionAsync.fulfilled, (state) => {
        state.status = 'completed';
      })
      .addCase(completeSessionAsync.rejected, (state, action) => {
        console.error('[completeSessionAsync] Failed:', action.error);
        // Still complete locally even if backend fails
        state.status = 'completed';
      });
  },
});

export const {
  startSession,
  togglePause,
  tick,
  switchPhase,
  skipPhase,
  toggleTask,
  addParticipant,
  removeParticipant,
  setInviteLink,
  completeSession,
  resetSession,
} = activeSessionSlice.actions;

export default activeSessionSlice.reducer;
