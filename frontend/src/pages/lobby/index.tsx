import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button, Avatar, Spin, Typography, Card, message } from 'antd';
import { UserOutlined, CopyOutlined } from '@ant-design/icons';
import { useAppSelector } from '@/shared/hooks/redux';
import {
  selectSessionId,
  selectGroupName,
} from '@/entities/session/model/activeSessionSelectors';
import { selectTasks, selectFocusDuration, selectBreakDuration, selectIsPrivate } from '@/entities/session/model/selectors';
import { sessionsApi, getErrorMessage } from '@/shared/api';
import { useMaxWebApp } from '@/shared/hooks/useMaxWebApp';
import { useWebSocketEvent } from '@/shared/hooks/useWebSocket';
import { useAuth } from '@/app/store';
import type { Session, SessionParticipant } from '@/shared/api';
import './styles.css';

const { Title, Text, Paragraph } = Typography;

export function LobbyPage() {
  const navigate = useNavigate();
  const { sessionId: routeSessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const { isMaxEnvironment } = useMaxWebApp();
  
  const reduxSessionId = useAppSelector(selectSessionId);
  const groupName = useAppSelector(selectGroupName);
  const isPrivate = useAppSelector(selectIsPrivate);
  const tasks = useAppSelector(selectTasks);
  const focusDuration = useAppSelector(selectFocusDuration);
  const breakDuration = useAppSelector(selectBreakDuration);

  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<SessionParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);

  const sessionId = routeSessionId || reduxSessionId;

  // Load session data from API
  useEffect(() => {
    if (!sessionId) {
      navigate('/session-setup');
      return;
    }

    const loadSession = async () => {
      if (!isMaxEnvironment) {
        // Mock data for dev mode
        setParticipants([
          { userId: '1', userName: 'Давид', avatarUrl: '', isReady: true, joinedAt: new Date().toISOString() },
          { userId: '2', userName: 'Мария', avatarUrl: '', isReady: true, joinedAt: new Date().toISOString() },
          { userId: '3', userName: 'Тимур', avatarUrl: '', isReady: false, joinedAt: new Date().toISOString() },
        ]);
        setIsLoading(false);
        return;
      }

      try {
        const response = await sessionsApi.getSessionById(sessionId);
        setSession(response.session);
        setParticipants(response.session.participants);
        
        // Check if current user is ready
        const currentUserParticipant = response.session.participants.find(
          (p: SessionParticipant) => p.userId === user?.id
        );
        setIsReady(currentUserParticipant?.isReady ?? false);
      } catch (error) {
        console.error('[LobbyPage] Failed to load session:', error);
        message.error(`Ошибка загрузки сессии: ${getErrorMessage(error)}`);
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();

    // Poll for updates every 3 seconds as fallback
    const pollInterval = setInterval(loadSession, 5000);

    return () => clearInterval(pollInterval);
  }, [sessionId, navigate, isMaxEnvironment, user]);

  // WebSocket real-time updates
  useWebSocketEvent<Session>('session_updated', useCallback((data) => {
    console.log('[LobbyPage] 📡 Session updated via WebSocket:', data);
    if (data.id === sessionId) {
      setSession(data);
      setParticipants(data.participants);
    }
  }, [sessionId]));

  useWebSocketEvent<{ sessionId: string; participant: SessionParticipant }>('participant_joined', useCallback((data) => {
    console.log('[LobbyPage] 📡 Participant joined:', data);
    if (data.sessionId === sessionId) {
      setParticipants((prev) => [...prev, data.participant]);
      message.info(`${data.participant.userName} присоединился!`);
    }
  }, [sessionId]));

  useWebSocketEvent<{ sessionId: string; userId: string; isReady: boolean }>('participant_ready', useCallback((data) => {
    console.log('[LobbyPage] 📡 Participant ready status changed:', data);
    if (data.sessionId === sessionId) {
      setParticipants((prev) =>
        prev.map((p) => (p.userId === data.userId ? { ...p, isReady: data.isReady } : p))
      );
    }
  }, [sessionId]));

  useWebSocketEvent<{ sessionId: string }>('session_started', useCallback((data) => {
    console.log('[LobbyPage] 📡 Session started via WebSocket');
    if (data.sessionId === sessionId) {
      message.success('Сессия началась!');
      navigate(`/focus-session/${sessionId}`);
    }
  }, [sessionId, navigate]));

  const allReady = participants.every(p => p.isReady);
  
  // Get bot username from environment or use default
  const botUsername = import.meta.env.VITE_MAX_BOT_USERNAME || 'synchronous';
  const inviteLink = session?.inviteLink || `https://max.ru/${botUsername}?startapp=session_${sessionId}`;

  useEffect(() => {
    // Redirect if no active session
    if (!sessionId) {
      navigate('/session-setup');
    }
  }, [sessionId, navigate]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    message.success('Ссылка скопирована!');
  };

  const handleShareLink = () => {
    if (isMaxEnvironment && window.WebApp) {
      // Use MAX openMaxLink to open link inside MAX app
      const shareUrl = `https://max.ru/${botUsername}?startapp=session_${sessionId}`;
      window.WebApp.openMaxLink(shareUrl);
    } else {
      // Fallback to copy
      handleCopyLink();
    }
  };

  const handleToggleReady = async () => {
    if (!sessionId || !isMaxEnvironment) {
      setIsReady(!isReady);
      return;
    }

    try {
      await sessionsApi.setReadyStatus(sessionId, !isReady);
      setIsReady(!isReady);
      message.success(isReady ? 'Вы не готовы' : 'Вы готовы!');
    } catch (error) {
      console.error('[LobbyPage] Failed to update ready status:', error);
      message.error(`Ошибка: ${getErrorMessage(error)}`);
    }
  };

  const handleStartSession = async () => {
    if (!sessionId) return;

    if (isMaxEnvironment) {
      try {
        await sessionsApi.startSession(sessionId);
        navigate(`/focus-session/${sessionId}`);
      } catch (error) {
        console.error('[LobbyPage] Failed to start session:', error);
        message.error(`Ошибка запуска: ${getErrorMessage(error)}`);
      }
    } else {
      navigate('/focus-session');
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="lobby-page">
      <div className="lobby-page__container">
        <Card className="lobby-page__info-card">
          <div className="lobby-page__header">
            <Title level={3} className="lobby-page__title">
              {groupName || 'Групповая сессия'}
            </Title>
            <Text type="secondary">
              {isPrivate ? '🔒 Приватная' : '🌐 Открытая'}
            </Text>
          </div>

          <div className="lobby-page__details">
            <div className="lobby-page__detail-item">
              <Text type="secondary">Задачи:</Text>
              <Text strong>{tasks.length}</Text>
            </div>
            <div className="lobby-page__detail-item">
              <Text type="secondary">Фокус:</Text>
              <Text strong>{focusDuration} мин</Text>
            </div>
            <div className="lobby-page__detail-item">
              <Text type="secondary">Перерыв:</Text>
              <Text strong>{breakDuration} мин</Text>
            </div>
          </div>
        </Card>

        {/* Participants Section */}
        <div className="lobby-page__section">
          <div className="lobby-page__section-header">
            <Title level={4}>Участники ({participants.length})</Title>
          </div>

          <div className="lobby-page__participants">
            {participants.map(participant => (
              <div key={participant.userId} className="lobby-page__participant">
                <Avatar
                  size={48}
                  src={participant.avatarUrl}
                  icon={<UserOutlined />}
                  className="lobby-page__participant-avatar"
                />
                <div className="lobby-page__participant-info">
                  <Text strong>{participant.userName}</Text>
                  {session?.creatorId === participant.userId && (
                    <Text type="secondary" className="lobby-page__creator-badge">
                      👑 Создатель
                    </Text>
                  )}
                </div>
                <div className="lobby-page__participant-status">
                  {participant.isReady ? (
                    <span className="lobby-page__status-ready">✓ Готов</span>
                  ) : (
                    <Spin size="small" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invite Section */}
        <Card className="lobby-page__invite-card">
          <Title level={5}>Пригласить друзей</Title>
          <Paragraph type="secondary" className="lobby-page__invite-text">
            Поделитесь ссылкой для присоединения к сессии
          </Paragraph>
          <div className="lobby-page__invite-actions">
            <Button
              icon={<CopyOutlined />}
              onClick={handleShareLink}
              type="primary"
              size="large"
              block
            >
              {isMaxEnvironment ? 'Пригласить' : 'Копировать ссылку'}
            </Button>
          </div>
        </Card>

        {/* Start Button */}
        <div className="lobby-page__actions">
          {/* Ready toggle for non-creator participants */}
          {user && session?.creatorId !== user.id && (
            <Button
              size="large"
              block
              onClick={handleToggleReady}
              type={isReady ? 'default' : 'primary'}
              style={{ marginBottom: '12px' }}
            >
              {isReady ? '✓ Я готов' : 'Отметить готовность'}
            </Button>
          )}

          {/* Start button for creator */}
          {user && session?.creatorId === user.id && (
            <Button
              type="primary"
              size="large"
              block
              onClick={handleStartSession}
              disabled={!allReady}
              className="lobby-page__start-btn"
            >
              {allReady ? 'Начать сессию' : 'Ожидание участников...'}
            </Button>
          )}
          
          {!allReady && (
            <Text type="secondary" className="lobby-page__wait-text">
              Дождитесь, пока все участники будут готовы
            </Text>
          )}
        </div>
      </div>
    </div>
  );
}