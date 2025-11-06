import { Card, Avatar, Button, Typography } from 'antd';
import { UserOutlined, ArrowRightOutlined } from '@ant-design/icons';
import type { Session } from '@/shared/types';
import './SessionCard.css';

const { Text } = Typography;

interface SessionCardProps {
  session: Session;
  onJoin?: (sessionId: string) => void;
}

export const SessionCard = ({ session, onJoin }: SessionCardProps) => {
  const handleJoin = () => {
    onJoin?.(session.id);
  };

  const pastelColors = [
    'linear-gradient(135deg, #b4ddf9 0%, #e0f4ff 100%)',
    'linear-gradient(135deg, #cfc1f2 0%, #f0ebff 100%)',
    'linear-gradient(135deg, #fde8c9 0%, #fff5e1 100%)',
    'linear-gradient(135deg, #e0ebdd 0%, #f2f8f0 100%)',
    'linear-gradient(135deg, #ebe2fd 0%, #f7f3ff 100%)',
  ];
  
  const backgroundGradient = pastelColors[parseInt(session.id) % pastelColors.length];

  return (
    <Card
      className="session-card"
      style={{ background: backgroundGradient }}
      bordered={false}
    >
      <div className="session-card__content">
        <div className="session-card__left">
          <Avatar.Group maxCount={3} size="default" className="session-card__avatars">
            {session.participants.map((user) => (
              <Avatar
                key={user.id}
                src={user.avatar}
                icon={<UserOutlined />}
                style={{ border: '2px solid white' }}
              >
                {user.name[0]}
              </Avatar>
            ))}
          </Avatar.Group>
          <Text className="session-card__name" strong>
            {session.name}
          </Text>
          <Text type="secondary" className="session-card__count">
            {session.participants.length} участник{session.participants.length === 1 ? '' : session.participants.length < 5 ? 'а' : 'ов'}
          </Text>
        </div>
        <div className="session-card__right">
          <Button
            type="primary"
            shape="circle"
            size="middle"
            icon={<ArrowRightOutlined />}
            onClick={handleJoin}
            className="session-card__button"
          />
        </div>
      </div>
    </Card>
  );
};
