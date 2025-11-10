import type { RootState } from '@/app/store';

/**
 * Selectors for session setup state
 */
export const selectSessionSetup = (state: RootState) => state.sessionSetup;
export const selectTasks = (state: RootState) => state.sessionSetup.tasks;
export const selectCurrentTask = (state: RootState) => state.sessionSetup.currentTask;
export const selectMode = (state: RootState) => state.sessionSetup.mode;
export const selectGroupName = (state: RootState) => state.sessionSetup.groupName;
export const selectIsPrivate = (state: RootState) => state.sessionSetup.isPrivate;
export const selectFocusDuration = (state: RootState) => state.sessionSetup.focusDuration;
export const selectBreakDuration = (state: RootState) => state.sessionSetup.breakDuration;
export const selectCanSubmit = (state: RootState) => state.sessionSetup.tasks.length > 0;