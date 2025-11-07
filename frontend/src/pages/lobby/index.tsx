import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button, Avatar, Spin, Typography, Card, message } from 'antd';
import { UserOutlined, CopyOutlined } from '@ant-design/icons';
import { useAppSelector } from '@/shared/hooks/redux';
import {
  selectSessionId,
  selectGroupName,
} from '@/entities/session/model/activeSessionSelectors';
import { selectTasks, selectFocusDuration, selectBreakDuration, selectIsPrivate } from '@/entities/session/model/selectors';
import './styles.css';

const { Title, Text, Paragraph } = Typography;

export function LobbyPage() {
  const navigate = useNavigate();
  
  const sessionId = useAppSelector(selectSessionId);
  const groupName = useAppSelector(selectGroupName);
  const isPrivate = useAppSelector(selectIsPrivate);
  const tasks = useAppSelector(selectTasks);
  const focusDuration = useAppSelector(selectFocusDuration);
  const breakDuration = useAppSelector(selectBreakDuration);

  // Mock participants (later from Redux/API)
  const participants = [
    { id: '1', name: 'Давид', avatarUrl: '', isReady: true, isCreator: true },
    { id: '2', name: 'Мария', avatarUrl: '', isReady: true, isCreator: false },
    { id: '3', name: 'Тимур', avatarUrl: '', isReady: false, isCreator: false },
  ];

  const allReady = participants.every(p => p.isReady);
  const inviteLink = `https://max.ru/synchronous/session/${sessionId || 'abc123'}`; // Mock link

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

  const handleStartSession = () => {
    navigate('/focus-session');
  };

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
              <div key={participant.id} className="lobby-page__participant">
                <Avatar
                  size={48}
                  src={participant.avatarUrl}
                  icon={<UserOutlined />}
                  className="lobby-page__participant-avatar"
                />
                <div className="lobby-page__participant-info">
                  <Text strong>{participant.name}</Text>
                  {participant.isCreator && (
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
          <div className="lobby-page__invite-link">
            <Text code className="lobby-page__link-text">
              {inviteLink}
            </Text>
            <Button
              icon={<CopyOutlined />}
              onClick={handleCopyLink}
              type="primary"
            >
              Копировать
            </Button>
          </div>
        </Card>

        {/* Start Button */}
        <div className="lobby-page__actions">
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