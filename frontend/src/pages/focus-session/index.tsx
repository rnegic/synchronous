import { useEffect } from 'react';
import { useNavigate } from 'react-router';
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
import { resetSessionSetup } from '@/entities/session/model/sessionSetupSlice';
import type { User, Task } from '@/shared/types';
import './styles.css';

export function FocusSessionPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  
  // Session setup state
  const setupTasks = useAppSelector(selectTasks);
  const mode = useAppSelector(selectMode);
  const groupName = useAppSelector(selectGroupName);
  const focusDuration = useAppSelector(selectFocusDuration);
  const breakDuration = useAppSelector(selectBreakDuration);
  
  // Active session state
  const sessionId = useAppSelector(selectSessionId);
  const isGroupMode = useAppSelector(selectIsGroupMode);
  const isCompleted = useAppSelector(selectIsCompleted);
  
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
  
  // Redirect to home if session is completed
  useEffect(() => {
    if (isCompleted) {
      message.success('Сессия завершена! Отличная работа! 🎉');
      dispatch(resetSessionSetup());
      setTimeout(() => {
        navigate('/');
      }, 1500);
    }
  }, [isCompleted, dispatch, navigate]);
  
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
