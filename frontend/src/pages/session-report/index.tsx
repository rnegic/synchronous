import { Button, Tabs } from 'antd';
import { useNavigate } from 'react-router';
import { HomeOutlined } from '@ant-design/icons';
import { useAppSelector, useAppDispatch } from '@/shared/hooks/redux';
import {
  selectIsGroupMode,
  selectSessionTasks,
  selectCurrentCycle,
} from '@/entities/session/model/activeSessionSelectors';
import { resetSessionSetup } from '@/entities/session/model/sessionSetupSlice';
import { SessionStats } from '@/widgets/session-stats/ui';
import { Leaderboard } from '@/widgets/leaderboard/ui';
import { ChatWidget } from '@/widgets/chat/ui';
import { AIReportTeaser } from '@/features/ai-assistant/ui';
import { mockUsers } from '@/shared/lib/mockData';
import type { Task } from '@/shared/types';
import './styles.css';

/**
 * Session Report Page
 * Shows session results with stats, leaderboard, and chat
 */
export function SessionReportPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const isGroupMode = useAppSelector(selectIsGroupMode);
  const tasks = useAppSelector(selectSessionTasks) as Task[];
  const currentCycle = useAppSelector(selectCurrentCycle);

  // Calculate stats
  const tasksCompleted = tasks.filter((t) => t.completed).length;
  const tasksTotal = tasks.length;
  const focusTime = currentCycle * 25; // Mock
  const breakTime = currentCycle * 5; // Mock

  // Mock leaderboard data
  const leaderboardEntries = [
    {
      user: mockUsers[0],
      tasksCompleted: 5,
      focusTime: 75,
      score: 450,
    },
    {
      user: mockUsers[1],
      tasksCompleted: 4,
      focusTime: 60,
      score: 380,
    },
    {
      user: mockUsers[2],
      tasksCompleted: 3,
      focusTime: 50,
      score: 320,
    },
  ];

  // Mock chat messages
  const chatMessages = [
    {
      id: '1',
      userId: mockUsers[1].id,
      userName: mockUsers[1].name,
      avatar: mockUsers[1].avatar,
      text: 'Отличная сессия! 🔥',
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      userId: mockUsers[0].id,
      userName: mockUsers[0].name,
      avatar: mockUsers[0].avatar,
      text: 'Спасибо! Продуктивно поработали 💪',
      createdAt: new Date().toISOString(),
    },
  ];

  const handleGoHome = () => {
    dispatch(resetSessionSetup());
    navigate('/');
  };

  const handleSendMessage = (text: string) => {
    console.log('Send message:', text);
    // TODO: Implement message sending
  };

  const handleUpgrade = () => {
    console.log('Upgrade to Pro clicked');
    // TODO: Implement upgrade flow
  };

  const tabItems = [
    {
      key: 'leaderboard',
      label: '🏆 Лидерборд',
      children: <Leaderboard entries={leaderboardEntries} />,
    },
    {
      key: 'chat',
      label: '💬 Чат',
      children: (
        <ChatWidget
          messages={chatMessages}
          currentUserId={mockUsers[0].id}
          onSendMessage={handleSendMessage}
        />
      ),
    },
  ];

  return (
    <div className="session-report-page">
      <div className="session-report-page__container">
        {/* Session Statistics */}
        <SessionStats
          tasksCompleted={tasksCompleted}
          tasksTotal={tasksTotal}
          focusTime={focusTime}
          breakTime={breakTime}
          cyclesCompleted={currentCycle}
        />

        {/* Group Session Tabs */}
        {isGroupMode && (
          <div className="session-report-page__tabs">
            <Tabs
              defaultActiveKey="leaderboard"
              items={tabItems}
              size="large"
              className="session-report-page__tabs-component"
            />
          </div>
        )}

        {/* AI Report Teaser */}
        <AIReportTeaser onUpgrade={handleUpgrade} />

        {/* Home Button */}
        <Button
          type="default"
          size="large"
          block
          icon={<HomeOutlined />}
          onClick={handleGoHome}
          className="session-report-page__home-btn"
        >
          Вернуться на главную
        </Button>
      </div>
    </div>
  );
}
