/**
 * ActiveSessionCard widget
 * Displays user's currently active session with quick access
 */

import { memo, useMemo, useState, useEffect } from 'react';
import { Card, Button, Avatar, Flex, Typography, Tag } from 'antd';
import { ClockCircleOutlined, PauseCircleOutlined, TeamOutlined, RocketOutlined } from '@ant-design/icons';
import type { Session } from '@/shared/types';
import { formatRemainingTime } from '../lib/formatRemainingTime';
import './ActiveSessionCard.css';

const { Title, Text } = Typography;

interface ActiveSessionCardProps {
  session: Session;
  onJoin: (sessionId: string) => void;
}

/**
 * ActiveSessionCard component
 * Shows prominent card with active session info and timer
 */
export const ActiveSessionCard = memo<ActiveSessionCardProps>(({ session, onJoin }) => {
  // Real-time timer update
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    if (session.status !== 'active') {
      return;
    }

    setCurrentTime(Date.now());

    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [session.status]);

  const remainingSeconds = useMemo(
    () => {
      if (session.status !== 'active') {
        if (typeof session.remainingSeconds === 'number') {
          return Math.max(session.remainingSeconds, 0);
        }
        return session.focusDuration * 60;
      }

      if (!session.startedAt) {
        if (typeof session.remainingSeconds === 'number') {
          return Math.max(session.remainingSeconds, 0);
        }
        return session.focusDuration * 60;
      }

      const startTime = new Date(session.startedAt).getTime();
      const elapsed = Math.floor((currentTime - startTime) / 1000);

      const totalDuration = session.focusDuration * 60;
      const remaining = totalDuration - elapsed;

      return remaining > 0 ? remaining : 0;
    },
    [session, currentTime]
  );

  const remainingTimeText = formatRemainingTime(remainingSeconds);
  const isGroupSession = session.participants.length > 1;

  const statusConfig = {
    active: {
      label: 'Активна',
      color: 'success' as const,
      icon: <ClockCircleOutlined />,
    },
    paused: {
      label: 'На паузе',
      color: 'warning' as const,
      icon: <PauseCircleOutlined />,
    },
    pending: {
      label: 'В ожидании',
      color: 'processing' as const,
      icon: <ClockCircleOutlined />,
    },
    completed: {
      label: 'Завершена',
      color: 'default' as const,
      icon: <ClockCircleOutlined />,
    },
  };

  const tagConfig = statusConfig[session.status] ?? statusConfig.pending;

  return (
    <Card
      className="active-session-card"
      bordered={false}
      styles={{
        body: { padding: '24px' }
      }}
    >
      <Flex vertical gap={16}>
        {/* Header with session name and status */}
        <Flex justify="space-between" align="center">
          <div>
            <Title level={4} className="active-session-card__title">
              {session.name}
            </Title>
            {session.isPrivate && (
              <Tag color="purple" className="active-session-card__tag">
                Приватная
              </Tag>
            )}
          </div>
          <Tag
            color={tagConfig.color}
            icon={tagConfig.icon}
            className="active-session-card__status"
          >
            {tagConfig.label}
          </Tag>
        </Flex>

        {/* Timer and participants info */}
        <Flex gap={24} wrap="wrap">
          {/* Remaining time */}
          <Flex align="center" gap={8} className="active-session-card__info">
            <ClockCircleOutlined className="active-session-card__icon" />
            <div>
              <Text type="secondary" className="active-session-card__label">
                Осталось времени
              </Text>
              <div className="active-session-card__timer">
                {remainingTimeText}
              </div>
            </div>
          </Flex>

          {/* Participants */}
          {isGroupSession && (
            <Flex align="center" gap={8} className="active-session-card__info">
              <TeamOutlined className="active-session-card__icon" />
              <div>
                <Text type="secondary" className="active-session-card__label">
                  Участники
                </Text>
                <div className="active-session-card__participants">
                  <Avatar.Group
                    maxCount={5}
                    size="small"
                    maxStyle={{
                      color: 'var(--color-primary)',
                      backgroundColor: 'var(--color-background-soft)',
                    }}
                  >
                    {session.participants.map((participant) => (
                      <Avatar
                        key={participant.id}
                        src={participant.avatar}
                        alt={participant.name}
                      >
                        {participant.name?.charAt(0).toUpperCase() || '?'}
                      </Avatar>
                    ))}
                  </Avatar.Group>
                </div>
              </div>
            </Flex>
          )}
        </Flex>

        {/* Action button */}
        <Button
          type="primary"
          size="large"
          icon={<RocketOutlined />}
          onClick={() => onJoin(session.id)}
          className="active-session-card__button"
          block
        >
          Вернуться к сессии
        </Button>
      </Flex>
    </Card>
  );
});

ActiveSessionCard.displayName = 'ActiveSessionCard';
