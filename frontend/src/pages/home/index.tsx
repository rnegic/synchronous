import { useState, useEffect } from 'react';
import { Typography, List, Empty, Flex, Button, Spin, message } from 'antd';
import { useNavigate } from 'react-router';
import { RocketOutlined } from '@ant-design/icons';
import { OnboardingCarousel, SessionCard } from '@/shared/ui';
import { onboardingSteps, mockSessions } from '@/shared/lib/mockData';
import { useMaxWebApp } from '@/shared/hooks/useMaxWebApp';
import { sessionsApi } from '@/shared/api';
import type { Session as ApiSession } from '@/shared/api';
import type { Session, User } from '@/shared/types';
import './styles.css';

const { Title, Text } = Typography;

export function HomePage() {
  const navigate = useNavigate();
  const { isMaxEnvironment, isReady } = useMaxWebApp();
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch active public sessions
  useEffect(() => {
    // Wait for MAX WebApp to initialize before deciding what to show
    if (!isReady) {
      return;
    }

    const fetchActiveSessions = async () => {
      // Dev mode: use mock data immediately
      if (!isMaxEnvironment) {
        console.log('[HomePage] Using mock data');
        setActiveSessions(mockSessions);
        setIsLoading(false);
        return;
      }

      // Production: load real data from API
      try {
        const response = await sessionsApi.getPublicSessions(1, 10);
        
        // Transform API sessions to UI format
        const sessions: Session[] = response.sessions.map((s: ApiSession) => {
          const participants: User[] = s.participants.map(p => ({
            id: p.userId,
            name: p.userName,
            avatar: p.avatarUrl,
          }));

          return {
            id: s.id,
            name: s.groupName || 'Групповая сессия',
            isPrivate: s.isPrivate,
            participants,
            maxParticipants: 10, // Default
            focusDuration: s.focusDuration,
            breakDuration: s.breakDuration,
            status: s.status === 'active' ? 'active' : 'waiting',
            createdAt: s.createdAt,
            startedAt: s.startedAt || undefined,
            tasks: s.tasks,
          };
        });

        setActiveSessions(sessions);
      } catch (error) {
        console.error('[HomePage] Failed to load sessions:', error);
        message.error('Не удалось загрузить список сессий');
        // Show empty list on error
        setActiveSessions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActiveSessions();
  }, [isMaxEnvironment, isReady]);

  const handleStartFocus = () => {
    navigate('/session-setup');
  };

  const handleJoinSession = (sessionId: string) => {
    navigate(`/lobby/${sessionId}`);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      <div className="home-page">
        <section className="home-page__section">
          <Title level={2} className="home-page__section-title">
            Как это работает
          </Title>
          <OnboardingCarousel steps={onboardingSteps} />
        </section>

        <section className="home-page__section">
          <Flex vertical={true} style={{ width: '100%', marginBottom: '16px' }}>
            <Title level={2} className="home-page__section-title">
              Присоединяйтесь к другим
            </Title>
            <Text type="secondary">
              Активные публичные сессии прямо сейчас
            </Text>
          </Flex>

          {activeSessions.length > 0 ? (
            <List
              dataSource={activeSessions}
              renderItem={(session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onJoin={handleJoinSession}
                />
              )}
              className="home-page__sessions-list"
            />
          ) : (
            <Empty
              description="Сейчас нет открытых сессий. Станьте первым, кто начнет!"
              className="home-page__empty"
            />
          )}
        </section>

        <div className="home-page__cta">
          <Button
            type="primary"
            size="large"
            icon={<RocketOutlined />}
            onClick={handleStartFocus}
            className="home-page__cta-button"
            block
          >
            Начать фокус
          </Button>
        </div>
      </div>
    </>
  );
}
