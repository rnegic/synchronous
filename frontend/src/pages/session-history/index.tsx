import { useState, useEffect } from 'react';
import { List, Typography, Tag, Empty, Spin, Pagination, Flex, message } from 'antd';
import { HistoryOutlined, ClockCircleOutlined, TeamOutlined } from '@ant-design/icons';
import { sessionsApi } from '@/shared/api';
import type { Session as ApiSession, SessionsHistoryResponse } from '@/shared/api';
import { useMaxWebApp } from '@/shared/hooks/useMaxWebApp';
import { mockSessions } from '@/shared/lib/mockData';
import './styles.css';

const { Title, Text } = Typography;

interface HistoryItem {
  id: string;
  title: string;
  date: string;
  duration: string;
  participants: number;
  status: ApiSession['status'];
  statusLabel: string;
}

const statusToTag: Record<ApiSession['status'], { color: string; label: string }> = {
  pending: { color: 'blue', label: 'Запланирована' },
  active: { color: 'green', label: 'Активна' },
  paused: { color: 'orange', label: 'Пауза' },
  completed: { color: 'default', label: 'Завершена' },
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return 'Дата не указана';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const mapToHistoryItem = (session: ApiSession): HistoryItem => {
  const statusMeta = statusToTag[session.status] ?? statusToTag.pending;
  const duration = `${session.focusDuration} мин фокуса · ${session.breakDuration} мин перерыв`;

  return {
    id: session.id,
    title: session.groupName || 'Фокус-сессия',
    date: formatDate(session.completedAt || session.startedAt || session.createdAt),
    duration,
    participants: session.participants.length,
    status: session.status,
    statusLabel: statusMeta.label,
  };
};

export function SessionHistoryPage() {
  const { isReady, isMaxEnvironment } = useMaxWebApp();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const loadHistory = async (pageToLoad: number) => {
    if (!isReady) {
      return;
    }

    setIsLoading(true);

    try {
      if (!isMaxEnvironment) {
        const mockItems = mockSessions.map((s) => {
          const mockSession: ApiSession = {
            id: s.id,
            mode: 'group',
            status: 'completed',
            tasks: [],
            focusDuration: s.focusDuration,
            breakDuration: s.breakDuration,
            groupName: s.name,
            isPrivate: s.isPrivate,
            creatorId: 'mock',
            startedAt: s.createdAt,
            completedAt: s.createdAt,
            participants: s.participants.map((participant) => ({
              userId: participant.id,
              userName: participant.name,
              avatarUrl: participant.avatar || '',
              isReady: true,
              joinedAt: s.createdAt,
            })),
            inviteLink: undefined,
            createdAt: s.createdAt,
          };

          return mapToHistoryItem(mockSession);
        });

        setItems(mockItems);
        setTotal(mockItems.length);
        return;
      }

      const response: SessionsHistoryResponse = await sessionsApi.getSessionHistory(pageToLoad, pageSize);
      setItems(response.sessions.map(mapToHistoryItem));
      setTotal(response.pagination.total);
    } catch (error) {
      console.error('[SessionHistoryPage] Failed to load history', error);
      message.error('Не удалось загрузить историю сессий');
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady) {
      return;
    }
    loadHistory(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, isMaxEnvironment, page]);

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
  };

  if (isLoading) {
    return (
      <div className="session-history__loading">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="session-history">
      <div className="session-history__hero">
        <HistoryOutlined className="session-history__hero-icon" />
        <Title level={3} className="session-history__title">
          История сессий
        </Title>
        <Text type="secondary">
          Все завершённые фокус-сессии и отчёты собраны в одном месте
        </Text>
      </div>

      {items.length === 0 ? (
        <Empty description="Архив пока пуст" />
      ) : (
        <>
          <List
            dataSource={items}
            rowKey={(item) => item.id}
            split={false}
            className="session-history__list"
            renderItem={(item) => {
              const statusMeta = statusToTag[item.status];
              return (
                <List.Item className="session-history__item">
                  <div className="session-history__item-header">
                    <div>
                      <Title level={4} className="session-history__item-title">
                        {item.title}
                      </Title>
                      <Text type="secondary">{item.date}</Text>
                    </div>
                    <Tag color={statusMeta.color}>{statusMeta.label}</Tag>
                  </div>

                  <div className="session-history__item-meta">
                    <Flex gap={8} align="center" className="session-history__meta-block">
                      <ClockCircleOutlined />
                      <Text>{item.duration}</Text>
                    </Flex>
                    <Flex gap={8} align="center" className="session-history__meta-block">
                      <TeamOutlined />
                      <Text>{item.participants} участников</Text>
                    </Flex>
                  </div>
                </List.Item>
              );
            }}
          />

          {total > pageSize && (
            <div className="session-history__pagination">
              <Pagination
                current={page}
                total={total}
                pageSize={pageSize}
                onChange={handlePageChange}
                showSizeChanger={false}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
