import { useState, useEffect } from 'react';
import { Button, Tabs, Spin, message } from 'antd';
import { useNavigate, useParams } from 'react-router';
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
import { sessionsApi, messagesApi, leaderboardApi } from '@/shared/api';
import { useMaxWebApp } from '@/shared/hooks/useMaxWebApp';
import { useAuth } from '@/app/store';
import type { Task } from '@/shared/types';
import type { SessionReport, LeaderboardEntry as ApiLeaderboardEntry, Message } from '@/shared/api';
import './styles.css';

// Leaderboard component expects different type
interface ComponentLeaderboardEntry {
  user: {
    id: string;
    name: string;
    avatar: string;
  };
  tasksCompleted: number;
  focusTime: number;
  score: number;
}

/**
 * Session Report Page
 * Shows session results with stats, leaderboard, and chat
 */
export function SessionReportPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { sessionId } = useParams<{ sessionId: string }>();
  const { isMaxEnvironment } = useMaxWebApp();
  const { user } = useAuth();

  const isGroupMode = useAppSelector(selectIsGroupMode);
  const localTasks = useAppSelector(selectSessionTasks) as Task[];
  const currentCycle = useAppSelector(selectCurrentCycle);

  const [report, setReport] = useState<SessionReport | null>(null);
  const [leaderboard, setLeaderboard] = useState<ApiLeaderboardEntry[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('chat'); // По умолчанию открываем вкладку "Чат"

  // Load session report data
  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }

    const loadReportData = async () => {
      // Dev mode: skip API calls, use local Redux state
      if (!isMaxEnvironment) {
        setIsLoading(false);
        return;
      }

      // Production: load report data from API
      try {
        // Сначала получаем информацию о сессии, чтобы проверить статус
        const sessionResponse = await sessionsApi.getSessionById(sessionId);
        const session = sessionResponse.session;
        
        // Если сессия уже завершена, получаем отчет из данных сессии
        // Если нет - завершаем сессию
        let reportData: SessionReport;
        if (session.status === 'completed') {
          // Сессия уже завершена, формируем отчет из данных сессии
          const completedTasks = session.tasks.filter(t => t.completed).length;
          const cycles = currentCycle || 1; // Используем currentCycle из Redux
          reportData = {
            sessionId: session.id,
            tasksCompleted: completedTasks,
            tasksTotal: session.tasks.length,
            focusTime: session.focusDuration * cycles,
            breakTime: session.breakDuration * cycles,
            cyclesCompleted: cycles,
            completedAt: session.completedAt || new Date().toISOString(),
            participants: session.participants.map(p => ({
              userId: p.userId,
              userName: p.userName,
              avatarUrl: p.avatarUrl,
              tasksCompleted: 0, // TODO: получить из статистики
              focusTime: 0, // TODO: получить из статистики
            })),
          };
        } else {
          // Сессия еще не завершена, завершаем её
          const reportResponse = await sessionsApi.completeSession(sessionId);
          reportData = reportResponse.report;
        }
        
        setReport(reportData);

        // Load session leaderboard (for group sessions)
        if (isGroupMode) {
          const leaderboardResponse = await leaderboardApi.getSessionLeaderboard(sessionId);
          setLeaderboard(leaderboardResponse.leaderboard);
        }

        // Load chat messages (для всех типов сессий)
        try {
          const messagesResponse = await messagesApi.getMessages(sessionId);
          setMessages(messagesResponse.messages);
        } catch (error) {
          console.error('[SessionReport] Failed to load messages:', error);
          // Не критично, продолжаем работу
        }
      } catch (error) {
        console.error('[SessionReport] Failed to load report:', error);
        message.error('Не удалось загрузить отчёт сессии');
      } finally {
        setIsLoading(false);
      }
    };

    loadReportData();
  }, [sessionId, isGroupMode, isMaxEnvironment, navigate]);

  // Calculate stats from report or fallback to local data
  const tasksCompleted = report?.tasksCompleted ?? localTasks.filter((t) => t.completed).length;
  const tasksTotal = report?.tasksTotal ?? localTasks.length;
  const focusTime = report?.focusTime ?? currentCycle * 25;
  const breakTime = report?.breakTime ?? currentCycle * 5;

  // Transform API leaderboard entries to component format
  const leaderboardEntries: ComponentLeaderboardEntry[] = (
    report?.participants || leaderboard
  ).map((p) => ({
    user: {
      id: p.userId,
      name: p.userName,
      avatar: p.avatarUrl,
    },
    tasksCompleted: p.tasksCompleted,
    focusTime: p.focusTime,
    score: 'score' in p ? (p as ApiLeaderboardEntry).score : p.tasksCompleted * 100 + p.focusTime,
  }));

  // Transform API messages to component format
  const chatMessages = messages.map((msg) => ({
    id: msg.id,
    userId: msg.userId,
    userName: msg.userName,
    avatar: msg.avatarUrl,
    text: msg.text,
    createdAt: msg.createdAt,
  }));

  const handleGoHome = () => {
    dispatch(resetSessionSetup());
    navigate('/');
  };

  const handleSendMessage = (text: string) => {
    console.log('[SessionReport] Send message:', text);
    // TODO: Will be implemented in next iteration with messagesApi.sendMessage()
    message.info('Отправка сообщений будет доступна в следующей версии');
  };

  const handleUpgrade = () => {
    console.log('[SessionReport] Upgrade to Pro clicked');
    // TODO: Implement upgrade flow
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Spin size="large" />
      </div>
    );
  }

  const tabItems = [
    {
      key: 'chat',
      label: '💬 Чат',
      children: (
        <ChatWidget
          messages={chatMessages}
          currentUserId={user?.id || ''}
          onSendMessage={handleSendMessage}
        />
      ),
    },
  ];

  // Добавляем вкладку лидерборда только для групповых сессий
  if (isGroupMode && leaderboardEntries.length > 0) {
    tabItems.unshift({
      key: 'leaderboard',
      label: '🏆 Лидерборд',
      children: <Leaderboard entries={leaderboardEntries} />,
    });
  }

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

        {/* Session Tabs (Chat always available, Leaderboard for group sessions) */}
        <div className="session-report-page__tabs">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            defaultActiveKey="chat"
            items={tabItems}
            size="large"
            className="session-report-page__tabs-component"
          />
        </div>

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
