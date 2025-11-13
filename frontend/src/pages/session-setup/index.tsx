import { Drawer, message } from 'antd';
import { useNavigate } from 'react-router';
import { useAppDispatch } from '@/shared/hooks/redux';
import { startSession, setInviteLink } from '@/entities/session/model/activeSessionSlice';
import { SessionSetupForm } from '@/features/session-create';
import { sessionsApi, getErrorMessage } from '@/shared/api';
import { useMaxWebApp } from '@/shared/hooks/useMaxWebApp';
import type { SessionMode } from '@/shared/types';
import './styles.css';

export function SessionSetupPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isMaxEnvironment } = useMaxWebApp();

  const handleClose = () => {
    navigate('/');
  };

  const handleSubmit = async (data: {
    tasks: string[];
    mode: SessionMode;
    groupName?: string;
    isPrivate?: boolean;
    focusDuration: number;
    breakDuration: number;
  }) => {
    console.log('[SessionSetup] Creating session:', data);

    try {
      // Create session via API if in MAX environment
      if (isMaxEnvironment) {
        const sessionResponse = await sessionsApi.createSession({
          mode: data.mode,
          tasks: data.tasks,
          focusDuration: data.focusDuration,
          breakDuration: data.breakDuration,
          groupName: data.groupName,
          isPrivate: data.isPrivate ?? false,
        });

        console.log('[SessionSetup] Session created:', sessionResponse.session);
        
        const { session } = sessionResponse;

        // Initialize active session in Redux with real data
        dispatch(startSession({
          sessionId: session.id,
          mode: session.mode,
          groupName: session.groupName || 'Групповая сессия',
          focusDuration: session.focusDuration,
          breakDuration: session.breakDuration,
          tasks: session.tasks.map(task => ({
            id: task.id,
            title: task.title,
            completed: task.completed,
            createdAt: task.createdAt,
          })),
        }));
        if (session.inviteLink) {
          dispatch(setInviteLink(session.inviteLink));
        }
        
        // Navigate based on mode
        if (session.mode === 'solo') {
          navigate('/focus-session');
        } else {
          navigate(`/lobby/${session.id}`);
        }
      } else {
        // Fallback to mock session for dev mode
        console.warn('[SessionSetup] Dev mode - using mock session');
        const sessionId = `session-${Date.now()}`;
        
        dispatch(startSession({
          sessionId,
          mode: data.mode,
          groupName: data.groupName || 'Групповая сессия',
          focusDuration: data.focusDuration,
          breakDuration: data.breakDuration,
          tasks: data.tasks.map((title, index) => ({
            id: `task-${index + 1}`,
            title,
            completed: false,
            createdAt: new Date().toISOString(),
          })),
        }));
        
        if (data.mode === 'solo') {
          navigate('/focus-session');
        } else {
          navigate('/lobby');
        }
      }
    } catch (error) {
      console.error('[SessionSetup] Failed to create session:', error);
      message.error(`Ошибка создания сессии: ${getErrorMessage(error)}`);
    }
  };

  return (
    <Drawer
      open={true}
      onClose={handleClose}
      placement="bottom"
      height="90vh"
      className="session-setup-drawer"
      styles={{
        body: { padding: 0 },
        wrapper: { maxWidth: '768px', margin: '0 auto' },
      }}
      closeIcon={null}
    >
      <div className="session-setup-drawer__handle" />
      <SessionSetupForm onSubmit={handleSubmit} />
    </Drawer>
  );
}