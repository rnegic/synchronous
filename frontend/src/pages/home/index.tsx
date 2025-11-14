import { useState, useEffect } from 'react';
import { Typography, List, Empty, Flex, Button, Spin, message } from 'antd';
import { useNavigate } from 'react-router';
import { RocketOutlined } from '@ant-design/icons';
import { OnboardingCarousel, SessionCard } from '@/shared/ui';
import { ActiveSessionCard } from '@/widgets/active-session-card';
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
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user's active session and public sessions
  useEffect(() => {
    // Wait for MAX WebApp to initialize before deciding what to show
    if (!isReady) {
      return;
    }

    const fetchData = async () => {
      // Dev mode: use mock data immediately
      if (!isMaxEnvironment) {
        console.log('[HomePage] Using mock data');
        setActiveSessions(mockSessions);
        setActiveSession(null); // No active session in dev mode
        setIsLoading(false);
        return;
      }

      // Production: load real data from API
      try {
        // Fetch user's active session and public sessions in parallel
        const [activeSessionResponse, publicSessionsResponse] = await Promise.all([
          sessionsApi.getActiveSession().catch(() => null),
          sessionsApi.getPublicSessions(1, 10)
        ]);

        // Transform active session if exists
        if (activeSessionResponse) {
          const s = activeSessionResponse;
          const participants: User[] = s.participants.map(p => ({
            id: p.userId,
            name: p.userName,
            avatar: p.avatarUrl,
          }));

          setActiveSession({
            id: s.id,
            name: s.groupName || 'Моя сессия',
            isPrivate: s.isPrivate,
            participants,
            maxParticipants: 10,
            focusDuration: s.focusDuration,
            breakDuration: s.breakDuration,
            status: s.status === 'active' ? 'active' : 'waiting',
            createdAt: s.createdAt,
            startedAt: s.startedAt || undefined,
            tasks: s.tasks,
          });
        }
        
        // Transform public sessions
        const sessions: Session[] = publicSessionsResponse.sessions.map((s: ApiSession) => {
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
            maxParticipants: 10,
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
        setActiveSessions([]);
        setActiveSession(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isMaxEnvironment, isReady]);

  const handleStartFocus = () => {
    navigate('/session-setup');
  };

  const handleJoinSession = (sessionId: string) => {
    navigate(`/lobby/${sessionId}`);
  };

  const handleJoinActiveSession = (sessionId: string) => {
    // Navigate directly to focus screen for active session
    navigate(`/focus/${sessionId}`);
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

        {/* Active session block - only shown when user has active session */}
        {activeSession && (
          <section className="home-page__section">
            <Title level={2} className="home-page__section-title" style={{ marginBottom: '16px' }}>
              Моя активная сессия
            </Title>
            <ActiveSessionCard
              session={activeSession}
              onJoin={handleJoinActiveSession}
            />
          </section>
        )}

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
