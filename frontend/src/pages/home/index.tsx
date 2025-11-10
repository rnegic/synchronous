import { useState } from 'react';
import { Typography, List, Empty, Flex, Button } from 'antd';
import { useNavigate } from 'react-router';
import { RocketOutlined } from '@ant-design/icons';
import { OnboardingCarousel, SessionCard } from '@/shared/ui';
import { onboardingSteps, mockSessions } from '@/shared/lib/mockData';
import './styles.css';

const { Title, Text } = Typography;

export function HomePage() {
  const navigate = useNavigate();
  const [activeSessions] = useState(mockSessions);

  const handleStartFocus = () => {
    navigate('/session-setup');
  };

  const handleJoinSession = (sessionId: string) => {
    navigate(`/lobby/${sessionId}`);
  };

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
