import { Drawer } from 'antd';
import { useNavigate } from 'react-router';
import { SessionSetupForm } from '@/features/session-create';
import type { SessionMode } from '@/shared/types';
import './styles.css';

export function SessionSetupPage() {
  const navigate = useNavigate();

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
    
    // Navigate based on mode
    if (data.mode === 'solo') {
      navigate('/focus-session/solo-123');
    } else {
      navigate('/lobby/group-123');
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