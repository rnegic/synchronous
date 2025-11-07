import { Drawer } from 'antd';
import { useNavigate } from 'react-router';
import { useAppDispatch } from '@/shared/hooks/redux';
import { startSession } from '@/entities/session/model/activeSessionSlice';
import { SessionSetupForm } from '@/features/session-create';
import type { SessionMode } from '@/shared/types';
import './styles.css';

export function SessionSetupPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const handleClose = () => {
    navigate('/');
  };

  const handleSubmit = (data: {
    tasks: string[];
    mode: SessionMode;
    groupName?: string;
    isPrivate?: boolean;
    focusDuration: number;
    breakDuration: number;
  }) => {
    console.log('Session data:', data);
    
    // Generate session ID
    const sessionId = `session-${Date.now()}`;
    
    // Initialize active session in Redux
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
    
    // Navigate based on mode
    if (data.mode === 'solo') {
      navigate('/focus-session');
    } else {
      navigate('/lobby');
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