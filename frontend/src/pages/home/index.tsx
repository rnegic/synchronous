import { useState, useEffect, useMemo } from 'react';
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
import { useAppSelector } from '@/shared/hooks/redux';
import {
  selectSessionId as selectActiveSessionId,
  selectStatus as selectActiveSessionStatus,
  selectRemainingTime as selectActiveSessionRemainingTime,
} from '@/entities/session/model/activeSessionSelectors';
import './styles.css';

const { Title, Text } = Typography;

const mapSessionStatus = (status: ApiSession['status']): Session['status'] => {
  switch (status) {
    case 'active':
      return 'active';
    case 'paused':
      return 'paused';
    case 'completed':
      return 'completed';
    default:
      return 'pending';
  }
};

const calculateRemainingSeconds = (session: ApiSession): number => {
  if (!session.startedAt) {
    return session.focusDuration * 60;
  }

  const startTime = new Date(session.startedAt).getTime();
  const elapsed = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
  const totalDuration = session.focusDuration * 60;
  return Math.max(totalDuration - elapsed, 0);
};

export function HomePage() {
  const navigate = useNavigate();
  const { isMaxEnvironment, isReady } = useMaxWebApp();
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const activeSessionId = useAppSelector(selectActiveSessionId);
  const activeSessionStatus = useAppSelector(selectActiveSessionStatus);
  const activeSessionRemainingTime = useAppSelector(selectActiveSessionRemainingTime);

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
            status: mapSessionStatus(s.status),
            createdAt: s.createdAt,
            startedAt: s.startedAt || undefined,
            remainingSeconds: calculateRemainingSeconds(s),
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
            status: mapSessionStatus(s.status),
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
    navigate(`/focus-session/${sessionId}`);
  };

  const resolvedActiveSession = useMemo(() => {
    if (!activeSession) {
      return null;
    }

    if (activeSessionId && activeSession.id === activeSessionId && activeSessionStatus === 'paused') {
      return {
        ...activeSession,
        status: 'paused' as const,
        remainingSeconds: activeSessionRemainingTime,
      };
    }

    return activeSession;
  }, [activeSession, activeSessionId, activeSessionStatus, activeSessionRemainingTime]);

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
        {resolvedActiveSession && (
          <section className="home-page__section">
            <Title level={2} className="home-page__section-title" style={{ marginBottom: '16px' }}>
              Моя активная сессия
            </Title>
            <ActiveSessionCard
              session={resolvedActiveSession}
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
