import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { message } from 'antd';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux';
import { ProgressTracker } from '@/widgets/progress-tracker/ui';
import { ParticipantsProgress } from '@/widgets/participants-progress/ui';
import { Timer } from '@/widgets/timer/ui';
import { TaskList } from '@/features/task-list/ui';
import {
  selectSessionId,
  selectIsCompleted,
  selectIsGroupMode,
  selectStatus,
  selectIsStarted,
} from '@/entities/session/model/activeSessionSelectors';
import {
  selectTasks,
  selectMode,
  selectGroupName,
  selectFocusDuration,
  selectBreakDuration,
} from '@/entities/session/model/selectors';
import { startSession, type SessionPhase, type SessionStatus } from '@/entities/session/model/activeSessionSlice';
import { sessionsApi, getErrorMessage } from '@/shared/api';
import type { ParticipantProgress, Session as ApiSession } from '@/shared/api';
import { useMaxWebApp } from '@/shared/hooks/useMaxWebApp';
import { useWebSocketEvent } from '@/shared/hooks/useWebSocket';
import type { Task } from '@/shared/types';
import './styles.css';

const mapSessionStatus = (status: ApiSession['status']): SessionStatus => {
  switch (status) {
    case 'active':
      return 'running';
    case 'paused':
      return 'paused';
    case 'completed':
      return 'completed';
    default:
      return 'pending';
  }
};

const derivePhaseState = (session: ApiSession): { phase: SessionPhase; remainingSeconds: number } => {
  const focusSeconds = session.focusDuration * 60;
  const breakSeconds = session.breakDuration * 60;
  const defaultPhase: SessionPhase = 'focus';
  const defaultRemaining = focusSeconds;

  if (!session.startedAt) {
    return { phase: defaultPhase, remainingSeconds: defaultRemaining };
  }

  const startTimestamp = new Date(session.startedAt).getTime();
  const elapsed = Math.max(0, Math.floor((Date.now() - startTimestamp) / 1000));
  const cycleLength = focusSeconds + Math.max(breakSeconds, 0);

  if (cycleLength <= 0) {
    return { phase: defaultPhase, remainingSeconds: defaultRemaining };
  }

  const cycleProgress = elapsed % cycleLength;

  if (cycleProgress < focusSeconds || breakSeconds === 0) {
    return {
      phase: 'focus',
      remainingSeconds: Math.max(focusSeconds - cycleProgress, 0),
    };
  }

  const breakProgress = cycleProgress - focusSeconds;
  return {
    phase: 'break',
    remainingSeconds: Math.max(breakSeconds - breakProgress, 0),
  };
};

export function FocusSessionPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { sessionId: routeSessionId } = useParams<{ sessionId: string }>();
  const { isMaxEnvironment } = useMaxWebApp();
  
  // Session setup state
  const setupTasks = useAppSelector(selectTasks);
  const mode = useAppSelector(selectMode);
  const groupName = useAppSelector(selectGroupName);
  const focusDuration = useAppSelector(selectFocusDuration);
  const breakDuration = useAppSelector(selectBreakDuration);
  
  // Active session state
  const reduxSessionId = useAppSelector(selectSessionId);
  const isCompleted = useAppSelector(selectIsCompleted);
  const isGroupMode = useAppSelector(selectIsGroupMode);
  const sessionStatus = useAppSelector(selectStatus);
  const isStarted = useAppSelector(selectIsStarted);
  
  const sessionId = routeSessionId || reduxSessionId;
  
  // Track participant progress for group sessions
  const [participantsProgress, setParticipantsProgress] = useState<ParticipantProgress[]>([]);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const isInitialLoadRef = useRef(true); // Track if this is first load
  
  // Use ref to prevent unnecessary re-renders from comparison
  const progressRef = useRef<ParticipantProgress[]>([]);
  
  // Helper: deep comparison for progress data
  const areProgressEqual = useCallback((a: ParticipantProgress[], b: ParticipantProgress[]): boolean => {
    if (a.length !== b.length) return false;
    
    return a.every((item, index) => {
      const other = b[index];
      return (
        item.userId === other.userId &&
        item.tasksCompleted === other.tasksCompleted &&
        item.tasksTotal === other.tasksTotal &&
        item.progressPercent === other.progressPercent
      );
    });
  }, []);

  // Load session from backend if coming from route params
  useEffect(() => {
    if (routeSessionId && isMaxEnvironment && !reduxSessionId) {
      const loadSession = async () => {
        try {
          const response = await sessionsApi.getSessionById(routeSessionId);
          const { session } = response;
          const normalizedStatus = mapSessionStatus(session.status);
          const { phase, remainingSeconds } = derivePhaseState(session);
          const hydratedParticipants = session.participants?.map(p => ({
            id: p.userId,
            name: p.userName,
            avatar: p.avatarUrl,
          })) || [];
          const backendTasks = session.tasks.map(task => ({
            id: task.id,
            title: task.title,
            completed: task.completed,
            createdAt: task.createdAt,
          }));
          const cycle = session.currentCycle && session.currentCycle > 0
            ? session.currentCycle
            : 1;
          
          // Initialize Redux with backend data
          dispatch(startSession({
            sessionId: session.id,
            mode: session.mode,
            groupName: session.groupName,
            focusDuration: session.focusDuration,
            breakDuration: session.breakDuration,
            tasks: backendTasks,
            participants: hydratedParticipants,
            status: normalizedStatus,
            phase,
            remainingTime: remainingSeconds,
            currentCycle: cycle,
            isStarted: normalizedStatus !== 'pending',
          }));
        } catch (error) {
          console.error('[FocusSession] Failed to load session:', error);
          message.error(`Ошибка загрузки сессии: ${getErrorMessage(error)}`);
          navigate('/');
        }
      };
      
      loadSession();
    }
  }, [routeSessionId, reduxSessionId, isMaxEnvironment, dispatch, navigate]);
  
  // Initialize session on mount if not already started
  useEffect(() => {
    if (!sessionId && setupTasks.length > 0) {
      // Convert task strings to Task objects
      const tasks: Task[] = setupTasks.map((taskTitle, index) => ({
        id: `task-${index + 1}`,
        title: taskTitle,
        completed: false,
        createdAt: new Date().toISOString(),
      }));
      
      // Start the session
      dispatch(startSession({
        sessionId: `session-${Date.now()}`,
        mode: mode,
        groupName: groupName,
        focusDuration: focusDuration,
        breakDuration: breakDuration,
        tasks: tasks,
        participants: mode === 'group' ? [] : undefined,
      }));
      
      message.success('Сессия начата! Удачи! 🎯');
    }
  }, [sessionId, setupTasks, mode, groupName, focusDuration, breakDuration, dispatch]);
  
  // Auto-start session on mount for real backend sessions
  useEffect(() => {
    if (
      sessionId &&
      reduxSessionId &&
      isMaxEnvironment &&
      sessionStatus === 'pending' &&
      !isStarted
    ) {
      import('@/entities/session/model/activeSessionSlice').then(({ startSessionAsync }) => {
        dispatch(startSessionAsync());
      });
    }
  }, [sessionId, reduxSessionId, isMaxEnvironment, sessionStatus, isStarted, dispatch]);
  
  // Load participants progress for group sessions
  useEffect(() => {
    if (!isGroupMode || !sessionId || !isMaxEnvironment) {
      return;
    }

    const loadProgress = async () => {
      // Show loader only on initial load, not on subsequent polls
      const isInitial = isInitialLoadRef.current;
      if (isInitial) {
        setIsLoadingProgress(true);
      }
      
      try {
        const response = await sessionsApi.getParticipantsProgress(sessionId);
        
        // Only update if data actually changed (prevent unnecessary re-renders)
        if (!areProgressEqual(progressRef.current, response.progress)) {
          console.log('[FocusSession] Progress updated:', response.progress);
          progressRef.current = response.progress;
          setParticipantsProgress(response.progress);
        }
      } catch (error) {
        console.error('[FocusSession] Failed to load participants progress:', error);
      } finally {
        if (isInitial) {
          setIsLoadingProgress(false);
          isInitialLoadRef.current = false;
        }
      }
    };

    loadProgress();

    // Poll for updates every 10 seconds
    const interval = setInterval(loadProgress, 10000);
    return () => clearInterval(interval);
  }, [isGroupMode, sessionId, isMaxEnvironment]);
  
  // Listen for task completion events from WebSocket for real-time updates
  useWebSocketEvent<{ sessionId: string; userId: string; taskId: string; completed: boolean }>(
    'task_updated',
    useCallback((data) => {
      if (data.sessionId === sessionId && isGroupMode && isMaxEnvironment) {
        // Reload progress when any participant completes a task (no loader - seamless update)
        sessionsApi.getParticipantsProgress(sessionId)
          .then(response => {
            if (!areProgressEqual(progressRef.current, response.progress)) {
              console.log('[FocusSession] Progress updated via WebSocket:', response.progress);
              progressRef.current = response.progress;
              setParticipantsProgress(response.progress);
            }
          })
          .catch(error => {
            console.error('[FocusSession] Failed to update progress:', error);
          });
      }
    }, [sessionId, isGroupMode, isMaxEnvironment, areProgressEqual])
  );
  
  // Redirect to report when session is completed
  useEffect(() => {
    if (isCompleted && sessionId) {
      message.success('Сессия завершена! Отличная работа! 🎉');
      
      setTimeout(() => {
        navigate(`/session-report/${sessionId}`);
      }, 1000);
    }
  }, [isCompleted, sessionId, navigate]);
  
  // Redirect to home if no session data
  if (!sessionId && setupTasks.length === 0) {
    setTimeout(() => {
      navigate('/');
    }, 0);
    return null;
  }
  
  return (
    <div className="focus-session-page">
      <div className="focus-session-page__container">
        <ProgressTracker />
        
        <div className="focus-session-page__main">
          <Timer />
        </div>
        
        <div className="focus-session-page__bottom">
          <TaskList />
        </div>
        
        {/* Show participants progress for group sessions */}
        {isGroupMode && (
          <ParticipantsProgress
            participants={participantsProgress}
            isLoading={isLoadingProgress}
          />
        )}
      </div>
    </div>
  );
}
