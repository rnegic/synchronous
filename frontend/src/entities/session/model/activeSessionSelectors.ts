import type { RootState } from '@/app/store';

// Session info
export const selectSessionId = (state: RootState) => state.activeSession.sessionId;
export const selectSessionMode = (state: RootState) => state.activeSession.mode;
export const selectGroupName = (state: RootState) => state.activeSession.groupName;

// Timer state
export const selectPhase = (state: RootState) => state.activeSession.phase;
export const selectStatus = (state: RootState) => state.activeSession.status;
export const selectRemainingTime = (state: RootState) => state.activeSession.remainingTime;
export const selectTotalTime = (state: RootState) => state.activeSession.totalTime;
export const selectCurrentCycle = (state: RootState) => state.activeSession.currentCycle;

// Computed timer values
export const selectProgress = (state: RootState) => {
  const { remainingTime, totalTime } = state.activeSession;
  if (totalTime === 0) return 0;
  return ((totalTime - remainingTime) / totalTime) * 100;
};

export const selectFormattedTime = (state: RootState) => {
  const { remainingTime } = state.activeSession;
  const minutes = Math.floor(remainingTime / 60);
  const seconds = remainingTime % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Tasks
export const selectSessionTasks = (state: RootState) => state.activeSession.tasks;
export const selectCompletedTasksCount = (state: RootState) => 
  state.activeSession.tasks.filter(t => t.completed).length;
export const selectTotalTasksCount = (state: RootState) => state.activeSession.tasks.length;
export const selectTaskProgress = (state: RootState) => {
  const total = state.activeSession.tasks.length;
  if (total === 0) return 0;
  const completed = state.activeSession.tasks.filter(t => t.completed).length;
  return (completed / total) * 100;
};

// Participants
export const selectParticipants = (state: RootState) => state.activeSession.participants;
export const selectParticipantsCount = (state: RootState) => state.activeSession.participants.length;
export const selectInviteLink = (state: RootState) => state.activeSession.inviteLink;
export const selectIsStarted = (state: RootState) => state.activeSession.isStarted;

// Combined state checks
export const selectIsRunning = (state: RootState) => state.activeSession.status === 'running';
export const selectIsPaused = (state: RootState) => state.activeSession.status === 'paused';
export const selectIsCompleted = (state: RootState) => state.activeSession.status === 'completed';
export const selectIsFocusPhase = (state: RootState) => state.activeSession.phase === 'focus';
export const selectIsBreakPhase = (state: RootState) => state.activeSession.phase === 'break';
export const selectIsGroupMode = (state: RootState) => state.activeSession.mode === 'group';
