import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { message } from 'antd';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux';
import { ProgressTracker } from '@/widgets/progress-tracker/ui';
import { Timer } from '@/widgets/timer/ui';
import { TaskList } from '@/features/task-list/ui';
import { InviteFriends } from '@/features/invite-friends/ui';
import {
  selectSessionId,
  selectIsGroupMode,
  selectIsCompleted,
} from '@/entities/session/model/activeSessionSelectors';
import {
  selectTasks,
  selectMode,
  selectGroupName,
  selectFocusDuration,
  selectBreakDuration,
} from '@/entities/session/model/selectors';
import { startSession, addParticipant } from '@/entities/session/model/activeSessionSlice';
import { sessionsApi, getErrorMessage } from '@/shared/api';
import { useMaxWebApp } from '@/shared/hooks/useMaxWebApp';
import type { User, Task } from '@/shared/types';
import './styles.css';

export function FocusSessionPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { sessionId: routeSessionId } = useParams<{ sessionId: string }>();
  const { isMaxEnvironment } = useMaxWebApp();
  //@ts-expect-error
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  
  // Session setup state
  const setupTasks = useAppSelector(selectTasks);
  const mode = useAppSelector(selectMode);
  const groupName = useAppSelector(selectGroupName);
  const focusDuration = useAppSelector(selectFocusDuration);
  const breakDuration = useAppSelector(selectBreakDuration);
  
  // Active session state
  const reduxSessionId = useAppSelector(selectSessionId);
  const isGroupMode = useAppSelector(selectIsGroupMode);
  const isCompleted = useAppSelector(selectIsCompleted);
  
  const sessionId = routeSessionId || reduxSessionId;

  // Load session from backend if coming from route params
  useEffect(() => {
    if (routeSessionId && isMaxEnvironment && !reduxSessionId) {
      const loadSession = async () => {
        setIsLoadingSession(true);
        try {
          const response = await sessionsApi.getSessionById(routeSessionId);
          const { session } = response;
          
          // Initialize Redux with backend data
          dispatch(startSession({
            sessionId: session.id,
            mode: session.mode,
            groupName: session.groupName,
            focusDuration: session.focusDuration,
            breakDuration: session.breakDuration,
            tasks: session.tasks.map(task => ({
              id: task.id,
              title: task.title,
              completed: task.completed,
              createdAt: task.createdAt,
            })),
          }));
        } catch (error) {
          console.error('[FocusSession] Failed to load session:', error);
          message.error(`Ошибка загрузки сессии: ${getErrorMessage(error)}`);
          navigate('/');
        } finally {
          setIsLoadingSession(false);
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
  
  // Redirect to report when session is completed
  useEffect(() => {
    if (isCompleted && sessionId) {
      message.success('Сессия завершена! Отличная работа! 🎉');
      
      // Complete session on backend if in MAX environment
      if (isMaxEnvironment) {
        sessionsApi.completeSession(sessionId).catch(error => {
          console.error('[FocusSession] Failed to complete session:', error);
        });
      }
      
      setTimeout(() => {
        navigate(`/session-report/${sessionId}`);
      }, 1000);
    }
  }, [isCompleted, sessionId, navigate, isMaxEnvironment]);
  
  // Redirect to home if no session data
  if (!sessionId && setupTasks.length === 0) {
    setTimeout(() => {
      navigate('/');
    }, 0);
    return null;
  }
  
  const handleInviteFriends = (users: User[]) => {
    users.forEach(user => {
      dispatch(addParticipant(user));
    });
  };
  
  return (
    <div className="focus-session-page">
      <div className="focus-session-page__container">
        <ProgressTracker />
        
        <div className="focus-session-page__main">
          <Timer />
        </div>
        
        <div className="focus-session-page__bottom">
          <TaskList />
          
          {isGroupMode && (
            <div className="focus-session-page__invite">
              <InviteFriends onInvite={handleInviteFriends} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
