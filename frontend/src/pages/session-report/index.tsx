import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Button, Spin, message } from 'antd';
import { useNavigate, useParams } from 'react-router';
import {
  HomeOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
  RedoOutlined,
} from '@ant-design/icons';
import { useAppSelector, useAppDispatch } from '@/shared/hooks/redux';
import {
  selectIsGroupMode,
  selectSessionTasks,
  selectCurrentCycle,
} from '@/entities/session/model/activeSessionSelectors';
import { resetSessionSetup, hydrateSessionSetup } from '@/entities/session/model/sessionSetupSlice';
import { Leaderboard } from '@/widgets/leaderboard/ui';
import { AIReportTeaser } from '@/features/ai-assistant/ui';
import { sessionsApi, leaderboardApi } from '@/shared/api';
import { useMaxWebApp } from '@/shared/hooks/useMaxWebApp';
import type { Task, SessionMode } from '@/shared/types';
import type {
  SessionReport,
  LeaderboardEntry as ApiLeaderboardEntry,
  Session as ApiSession,
} from '@/shared/api';
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

interface SessionHistoryEntry {
  sessionId: string;
  completedAt: string;
  completionRate: number;
  tasksCompleted: number;
  tasksTotal: number;
  focusTime: number;
  breakTime: number;
  focusDuration: number;
  breakDuration: number;
  cyclesCompleted: number;
  mode: SessionMode;
  groupName?: string;
  isPrivate?: boolean;
  tasks: string[];
  source?: 'api' | 'local';
}

const HISTORY_STORAGE_KEY = 'focus-sync:session-history';
const HISTORY_LIMIT = 5;
const DEFAULT_FOCUS_MINUTES = 25;
const DEFAULT_BREAK_MINUTES = 5;

const normalizeHistoryEntry = (entry: Partial<SessionHistoryEntry>): SessionHistoryEntry => ({
  sessionId: entry.sessionId ?? `local-${Date.now()}`,
  completedAt: entry.completedAt ?? new Date().toISOString(),
  completionRate: entry.completionRate ?? 0,
  tasksCompleted: entry.tasksCompleted ?? 0,
  tasksTotal: entry.tasksTotal ?? 0,
  focusTime:
    entry.focusTime ??
    entry.focusDuration ??
    (entry.cyclesCompleted ? entry.cyclesCompleted * DEFAULT_FOCUS_MINUTES : DEFAULT_FOCUS_MINUTES),
  breakTime:
    entry.breakTime ??
    entry.breakDuration ??
    (entry.cyclesCompleted ? entry.cyclesCompleted * DEFAULT_BREAK_MINUTES : DEFAULT_BREAK_MINUTES),
  focusDuration: entry.focusDuration ?? entry.focusTime ?? DEFAULT_FOCUS_MINUTES,
  breakDuration: entry.breakDuration ?? entry.breakTime ?? DEFAULT_BREAK_MINUTES,
  cyclesCompleted: entry.cyclesCompleted ?? 1,
  mode: entry.mode ?? 'solo',
  groupName: entry.groupName ?? '',
  isPrivate: entry.isPrivate ?? false,
  tasks: entry.tasks ?? [],
  source: entry.source ?? 'local',
});

const mergeHistoryEntries = (
  currentEntries: SessionHistoryEntry[],
  incomingEntries: SessionHistoryEntry[]
): SessionHistoryEntry[] => {
  const map = new Map<string, SessionHistoryEntry>();

  [...currentEntries, ...incomingEntries].forEach((entry) => {
    const normalized = normalizeHistoryEntry(entry);
    const existing = map.get(normalized.sessionId);
    if (!existing || new Date(normalized.completedAt).getTime() > new Date(existing.completedAt).getTime()) {
      map.set(normalized.sessionId, normalized);
    }
  });

  return Array.from(map.values())
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, HISTORY_LIMIT);
};

/**
 * Session Report Page
 * Shows session results with stats, leaderboard, и ключевые выводы
 */
export function SessionReportPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { sessionId } = useParams<{ sessionId: string }>();
  const { isMaxEnvironment, isReady } = useMaxWebApp();
  const isGroupMode = useAppSelector(selectIsGroupMode);
  const localTasks = useAppSelector(selectSessionTasks) as Task[];
  const currentCycle = useAppSelector(selectCurrentCycle);

  const [report, setReport] = useState<SessionReport | null>(null);
  const [leaderboard, setLeaderboard] = useState<ApiLeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [historyEntries, setHistoryEntries] = useState<SessionHistoryEntry[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Calculate stats from report or fallback to local data
  const fallbackCompletedTasks = localTasks.filter((t) => t.completed).length;
  const tasksCompleted = report?.tasksCompleted ?? fallbackCompletedTasks;
  const tasksTotal = report?.tasksTotal ?? localTasks.length;
  const cyclesCompleted = report?.cyclesCompleted ?? currentCycle ?? 1;
  const focusTime = report?.focusTime ?? cyclesCompleted * 25;
  const breakTime = report?.breakTime ?? cyclesCompleted * 5;

  const completionRate = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;
  const formattedCompletionDate = report?.completedAt
    ? new Date(report.completedAt).toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  // Load session report data
  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }

    // Wait for MAX WebApp to initialize
    if (!isReady) {
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
          // Сессия уже завершена, запрашиваем готовый отчет
          const reportResponse = await sessionsApi.getSessionReport(sessionId);
          reportData = reportResponse.report;
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
      } catch (error) {
        console.error('[SessionReport] Failed to load report:', error);
        message.error('Не удалось загрузить отчёт сессии');
      } finally {
        setIsLoading(false);
      }
    };

    loadReportData();
  }, [sessionId, isGroupMode, isMaxEnvironment, isReady, navigate]);

  // Transform API leaderboard entries to component format
  const leaderboardEntries: ComponentLeaderboardEntry[] = (
    report?.participants || leaderboard
  )
    .map((p) => ({
      user: {
        id: p.userId,
        name: p.userName,
        avatar: p.avatarUrl,
      },
      tasksCompleted: p.tasksCompleted ?? 0,
      focusTime: p.focusTime ?? 0,
      score:
        'score' in p
          ? (p as ApiLeaderboardEntry).score
          : (p.tasksCompleted ?? 0) * 100 + (p.focusTime ?? 0),
    }))
    .sort((a, b) => b.score - a.score || b.tasksCompleted - a.tasksCompleted);

  const heroSummary = isGroupMode
    ? `Команда закрыла ${completionRate}% плановых задач и сфокусирована ${focusTime} мин`
    : `Вы закрыли ${completionRate}% задач и сфокусированы ${focusTime} мин`;

  const insights: string[] = [
    tasksTotal > 0 ? `Закрыто ${tasksCompleted} из ${tasksTotal} задач` : 'Задачи для сессии не заданы',
    `Фокус ${focusTime} мин • Перерывы ${breakTime} мин`,
    `Циклов завершено: ${cyclesCompleted}`,
  ];

  if (isGroupMode && leaderboardEntries.length > 0) {
    const leader = leaderboardEntries[0];
    insights.push(`${leader.user.name} лидирует с результатом ${leader.score} баллов`);
  }

  const handleGoHome = () => {
    dispatch(resetSessionSetup());
    navigate('/');
  };

  const handleCopyReport = async () => {
    const lines = [
      'Отчёт по сессии Focus Sync',
      heroSummary,
      `Выполнение: ${completionRate}%`,
      `Задачи: ${tasksCompleted}/${tasksTotal || '—'}`,
      `Фокус: ${focusTime} мин, перерывы: ${breakTime} мин`,
      `Циклы: ${cyclesCompleted}`,
      insights.join(' • '),
    ];

    try {
      await navigator.clipboard.writeText(lines.filter(Boolean).join('\n'));
      message.success('Отчёт скопирован в буфер обмена');
    } catch (error) {
      console.error('[SessionReport] copy failed', error);
      message.error('Не удалось скопировать отчёт');
    }
  };

  const handleRepeatSession = (entry: SessionHistoryEntry) => {
    dispatch(
      hydrateSessionSetup({
        tasks: entry.tasks,
        mode: entry.mode,
        groupName: entry.groupName ?? '',
        isPrivate: entry.isPrivate ?? false,
        focusDuration: entry.focusDuration || DEFAULT_FOCUS_MINUTES,
        breakDuration: entry.breakDuration || DEFAULT_BREAK_MINUTES,
      })
    );
    message.success('Настройка сессии заполнена из истории');
    navigate('/session-setup');
  };

  const handleUpgrade = () => {
    console.log('[SessionReport] Upgrade to Pro clicked');
    // TODO: Implement upgrade flow
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SessionHistoryEntry[];
        setHistoryEntries(parsed.map((entry) => normalizeHistoryEntry(entry)));
      }
    } catch (error) {
      console.warn('[SessionReport] failed to read history', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(historyEntries));
    } catch (error) {
      console.warn('[SessionReport] failed to persist history', error);
    }
  }, [historyEntries]);

  useEffect(() => {
    if (isLoading || !sessionId) {
      return;
    }

    const perCycleFocus =
      cyclesCompleted && focusTime
        ? Math.max(1, Math.round(focusTime / cyclesCompleted))
        : DEFAULT_FOCUS_MINUTES;
    const perCycleBreak =
      cyclesCompleted && breakTime
        ? Math.max(1, Math.round(breakTime / cyclesCompleted))
        : DEFAULT_BREAK_MINUTES;

    const entry = normalizeHistoryEntry({
      sessionId,
      completedAt: report?.completedAt || new Date().toISOString(),
      completionRate,
      tasksCompleted,
      tasksTotal,
      focusTime,
      breakTime,
      focusDuration: perCycleFocus,
      breakDuration: perCycleBreak,
      cyclesCompleted,
      mode: isGroupMode ? 'group' : 'solo',
      tasks: localTasks.map((task) => task.title),
      source: 'local',
    });

    setHistoryEntries((prev) => mergeHistoryEntries(prev, [entry]));
  }, [
    isLoading,
    sessionId,
    completionRate,
    tasksCompleted,
    tasksTotal,
    focusTime,
    breakTime,
    cyclesCompleted,
    report?.completedAt,
    isGroupMode,
    localTasks,
  ]);

  useEffect(() => {
    if (!isReady || !isMaxEnvironment) {
      return;
    }

    const loadRemoteHistory = async () => {
      setIsHistoryLoading(true);
      try {
        const response = await sessionsApi.getSessionHistory(1, HISTORY_LIMIT);
        const mapped = response.sessions
          .filter((session) => session.status === 'completed')
          .map((session: ApiSession) => {
            const tasksTotal = session.tasks?.length ?? 0;
            const tasksCompleted = session.tasks?.filter((task) => task.completed).length ?? 0;
            const completion =
              tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;

            return normalizeHistoryEntry({
              sessionId: session.id,
              completedAt: session.completedAt ?? session.startedAt ?? session.createdAt,
              completionRate: completion,
              tasksCompleted,
              tasksTotal,
              focusTime: session.focusDuration,
              breakTime: session.breakDuration,
              focusDuration: session.focusDuration,
              breakDuration: session.breakDuration,
              cyclesCompleted: 1,
              mode: session.mode,
              groupName: session.groupName,
              isPrivate: session.isPrivate,
              tasks: session.tasks?.map((task) => task.title) ?? [],
              source: 'api',
            });
          });

        setHistoryEntries((prev) => mergeHistoryEntries(prev, mapped));
      } catch (error) {
        console.warn('[SessionReport] failed to load remote history', error);
      } finally {
        setIsHistoryLoading(false);
      }
    };

    loadRemoteHistory();
  }, [isReady, isMaxEnvironment]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="session-report-page">
      <div className="session-report-page__container">
        <section className="session-report-page__hero">
          <div className="session-report-page__hero-info">
            <span className="session-report-page__status">Сессия завершена</span>
            <h1>Отчёт по сессии</h1>
            <p className="session-report-page__summary">{heroSummary}</p>
            {formattedCompletionDate && (
              <span className="session-report-page__meta">Закончено {formattedCompletionDate}</span>
            )}
          </div>

          <div className="session-report-page__hero-body">
            <div className="session-report-page__progress-card">
              <div className="session-report-page__progress-header">
                <span>Выполнение</span>
                <span>
                  {tasksCompleted}/{tasksTotal || '—'}
                </span>
              </div>
              <div className="session-report-page__progress-bar">
                <div style={{ width: `${completionRate}%` }} />
              </div>
              <span className="session-report-page__progress-value">{completionRate}% задач закрыто</span>
            </div>

            <div className="session-report-page__quick-stats">
              <div>
                <span className="session-report-page__hero-label">Фокус</span>
                <span className="session-report-page__hero-value">{focusTime} мин</span>
              </div>
              <div>
                <span className="session-report-page__hero-label">Перерывы</span>
                <span className="session-report-page__hero-value">{breakTime} мин</span>
              </div>
              <div>
                <span className="session-report-page__hero-label">Циклы</span>
                <span className="session-report-page__hero-value">{cyclesCompleted}</span>
              </div>
            </div>
          </div>
        </section>

        {isGroupMode && leaderboardEntries.length > 0 && (
          <Leaderboard entries={leaderboardEntries} />
        )}

        <section className="session-report-page__insights">
          <h3>Ключевые выводы</h3>
          <ul className="session-report-page__insights-list">
            {insights.map((insight) => (
              <li key={insight}>{insight}</li>
            ))}
          </ul>
        </section>

        {(historyEntries.length > 0 || isHistoryLoading) && (
          <section className="session-report-page__history">
            <div className="session-report-page__history-header">
              <div>
                <h3>Недавние сессии</h3>
                <p>Следите за динамикой последних встреч</p>
              </div>
              {isHistoryLoading && <Spin size="small" />}
            </div>

            {historyEntries.length === 0 && !isHistoryLoading ? (
              <p className="session-report-page__history-empty">
                История появится сразу после первых завершённых сессий.
              </p>
            ) : (
              <div className="session-report-page__history-list">
                {historyEntries.map((item, index) => {
                  const date = new Date(item.completedAt).toLocaleString('ru-RU', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  const previous = historyEntries[index + 1];
                  const diff = previous
                    ? item.completionRate - previous.completionRate
                    : null;
                  let trendIcon: ReactNode = null;
                  let trendClass: 'up' | 'down' | 'flat' | null = null;
                  let trendText = '';

                  if (diff !== null) {
                    if (diff > 0) {
                      trendIcon = <ArrowUpOutlined />;
                      trendClass = 'up';
                      trendText = `+${diff}%`;
                    } else if (diff < 0) {
                      trendIcon = <ArrowDownOutlined />;
                      trendClass = 'down';
                      trendText = `${diff}%`;
                    } else {
                      trendIcon = <MinusOutlined />;
                      trendClass = 'flat';
                      trendText = '0%';
                    }
                  }

                  return (
                    <div
                      key={`${item.sessionId}-${item.completedAt}`}
                      className="session-report-page__history-card"
                    >
                      <div className="session-report-page__history-meta">
                        <span>{date}</span>
                        <div className="session-report-page__history-meta-right">
                          <span>{item.completionRate}%</span>
                          {trendIcon && trendClass && (
                            <span
                              className={`session-report-page__trend session-report-page__trend--${trendClass}`}
                            >
                              {trendIcon}
                              <span>{trendText}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="session-report-page__history-values">
                        <span>
                          {item.tasksCompleted}/{item.tasksTotal || '—'} задач
                        </span>
                        <span>
                          {item.focusTime} мин фокуса • {item.breakTime} мин перерыв
                        </span>
                      </div>
                      <div className="session-report-page__history-actions">
                        <span>
                          {item.mode === 'group' ? 'Групповая' : 'Соло'} • Циклов {item.cyclesCompleted}
                        </span>
                        <Button
                          size="small"
                          icon={<RedoOutlined />}
                          onClick={() => handleRepeatSession(item)}
                        >
                          Повторить
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <section className="session-report-page__next-actions">
          <div>
            <h3>Что дальше?</h3>
            <p>Сохраните результат или запланируйте следующую сессию.</p>
          </div>
          <div className="session-report-page__action-buttons">
            <Button onClick={handleCopyReport}>Скопировать отчёт</Button>
            <Button type="primary" onClick={handleGoHome}>
              Запустить новую сессию
            </Button>
          </div>
        </section>

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
