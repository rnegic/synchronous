import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Task, User } from '@/shared/types';
import { sessionsApi, tasksApi } from '@/shared/api';

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
  { status: 'active' },
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
      return { status: 'active' };
    }
    return { status: 'active' };
  }
);

/**
 * Toggle pause/resume with backend sync
 */
export const togglePauseAsync = createAsyncThunk<
  { newStatus: 'running' | 'paused' | 'pending' },
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
      return { newStatus: 'running' };
    }

    // Toggle pause/resume on backend
    if (status === 'running') {
      const res = await sessionsApi.pauseSession(sessionId);
      return { newStatus: res.session.status === 'paused' ? 'paused' : 'running' };
    }
    if (status === 'paused') {
      const res = await sessionsApi.resumeSession(sessionId);
      return { newStatus: res.session.status === 'active' ? 'running' : 'paused' };
    }
    return { newStatus: 'pending' };
  }
);

/**
 * Complete session on backend
 */
export const completeSessionAsync = createAsyncThunk<
  { completed: true },
  { isMaxEnvironment: boolean },
  { state: { activeSession: ActiveSessionState } }
>(
  'activeSession/completeSessionAsync',
  async ({ isMaxEnvironment }, { getState }) => {
    const { sessionId } = getState().activeSession;
    
    console.log('[completeSessionAsync] Starting', { sessionId, isMaxEnvironment });
    
    if (!sessionId) {
      console.error('[completeSessionAsync] No sessionId found');
      throw new Error('No active session');
    }

    // Only call API in production (MAX environment)
    if (isMaxEnvironment) {
      console.log('[completeSessionAsync] Calling API to complete session', { sessionId });
      try {
        const result = await sessionsApi.completeSession(sessionId);
        console.log('[completeSessionAsync] API call successful', result);
      } catch (error) {
        console.error('[completeSessionAsync] API call failed', error);
        throw error;
      }
    } else {
      console.log('[completeSessionAsync] Dev mode - completing locally');
    }
    
    console.log('[completeSessionAsync] Completed successfully');
    return { completed: true };
  }
);

/**
 * Toggle task completion with backend sync
 */
export const toggleTaskAsync = createAsyncThunk<
  { task: { id: string; completed: boolean } },
  { taskId: string; isMaxEnvironment: boolean },
  { state: { activeSession: ActiveSessionState } }
>(
  'activeSession/toggleTaskAsync',
  async ({ taskId, isMaxEnvironment }, { getState }) => {
    const { sessionId, tasks } = getState().activeSession;
    
    if (!sessionId) {
      throw new Error('No active session');
    }

    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const newCompleted = !task.completed;

    // Only call API in production (MAX environment)
    if (isMaxEnvironment) {
      await tasksApi.updateTask(sessionId, taskId, newCompleted);
    } else {
      console.log('[toggleTaskAsync] Dev mode - updating locally');
    }
    
    return { task: { id: taskId, completed: newCompleted } };
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
      status?: SessionStatus;
      phase?: SessionPhase;
      remainingTime?: number;
      currentCycle?: number;
      isStarted?: boolean;
    }>) => {
      const {
        sessionId,
        mode,
        groupName,
        focusDuration,
        breakDuration,
        tasks,
        participants,
        status,
        phase,
        remainingTime,
        currentCycle,
        isStarted,
      } = action.payload;

      const resolvedPhase: SessionPhase = phase ?? 'focus';
      const totalSeconds = (resolvedPhase === 'focus' ? focusDuration : breakDuration) * 60;
      const nextStatus: SessionStatus = status ?? 'pending';
      const nextRemaining = Math.min(
        totalSeconds,
        Math.max(0, remainingTime ?? totalSeconds)
      );

      state.sessionId = sessionId;
      state.mode = mode;
      state.groupName = groupName;
      state.focusDuration = focusDuration;
      state.breakDuration = breakDuration;
      state.totalTime = totalSeconds;
      state.remainingTime = nextRemaining;
      state.tasks = tasks;
      state.participants = participants || [];
      state.phase = resolvedPhase;
      state.status = nextStatus;
      state.currentCycle = currentCycle ?? 1;
      state.isStarted = isStarted ?? (nextStatus !== 'pending');
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
      // Toggle pause - set status based on API result (no optimistic flip)
      .addCase(togglePauseAsync.fulfilled, (state, action) => {
        const next = action.payload.newStatus;
        if (next === 'running') {
          state.status = 'running';
          state.isStarted = true;
        } else if (next === 'paused') {
          state.status = 'paused';
          state.isStarted = true;
        } else if (next === 'pending') {
          state.status = 'pending';
        }
      })
      .addCase(togglePauseAsync.rejected, (_state, action) => {
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
      })
      // Toggle task
      .addCase(toggleTaskAsync.fulfilled, (state, action) => {
        const task = state.tasks.find(t => t.id === action.payload.task.id);
        if (task) {
          task.completed = action.payload.task.completed;
        }
      })
      .addCase(toggleTaskAsync.rejected, (_state, action) => {
        console.error('[toggleTaskAsync] Failed:', action.error);
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
