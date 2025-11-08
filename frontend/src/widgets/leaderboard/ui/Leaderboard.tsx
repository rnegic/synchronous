import { Card, Avatar, Typography } from 'antd';
import { TrophyOutlined, UserOutlined } from '@ant-design/icons';
import type { User } from '@/shared/types';
import './Leaderboard.css';

const { Title, Text } = Typography;

interface LeaderboardEntry {
  user: User;
  tasksCompleted: number;
  focusTime: number; // in minutes
  score: number;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

/**
 * Leaderboard Widget
 * Displays ranked participants with their stats
 */
export const Leaderboard = ({ entries }: LeaderboardProps) => {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `${rank}`;
    }
  };

  const getRankClass = (rank: number) => {
    if (rank === 1) return 'leaderboard__entry--gold';
    if (rank === 2) return 'leaderboard__entry--silver';
    if (rank === 3) return 'leaderboard__entry--bronze';
    return '';
  };

  return (
    <Card className="leaderboard">
      <div className="leaderboard__header">
        <TrophyOutlined className="leaderboard__trophy-icon" />
        <Title level={4} className="leaderboard__title">
          Таблица лидеров
        </Title>
      </div>

      <div className="leaderboard__list">
        {entries.map((entry, index) => {
          const rank = index + 1;
          return (
            <div
              key={entry.user.id}
              className={`leaderboard__entry ${getRankClass(rank)}`}
            >
              <div className="leaderboard__rank">
                {getRankIcon(rank)}
              </div>

              <Avatar
                size={48}
                src={entry.user.avatar}
                icon={<UserOutlined />}
                className="leaderboard__avatar"
              />

              <div className="leaderboard__user-info">
                <Text strong className="leaderboard__user-name">
                  {entry.user.name}
                </Text>
                <div className="leaderboard__stats">
                  <Text type="secondary" className="leaderboard__stat">
                    {entry.tasksCompleted} задач
                  </Text>
                  <span className="leaderboard__separator">•</span>
                  <Text type="secondary" className="leaderboard__stat">
                    {entry.focusTime} мин
                  </Text>
                </div>
              </div>

              <div className="leaderboard__score">
                <Text strong className="leaderboard__score-value">
                  {entry.score}
                </Text>
                <Text type="secondary" className="leaderboard__score-label">
                  баллов
                </Text>
              </div>
            </div>
          );
        })}
      </div>

      {entries.length === 0 && (
        <div className="leaderboard__empty">
          <Text type="secondary">Нет данных для отображения</Text>
        </div>
      )}
    </Card>
  );
};
