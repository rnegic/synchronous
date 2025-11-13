import { memo } from 'react';
import { Progress, Avatar, Tooltip } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useAppSelector } from '@/shared/hooks/redux';
import {
  selectTaskProgress,
  selectCompletedTasksCount,
  selectTotalTasksCount,
  selectIsGroupMode,
} from '@/entities/session/model/activeSessionSelectors';
import './ProgressTracker.css';

interface ParticipantProgress {
  userId: string;
  userName: string;
  avatarUrl?: string;
  progress: number; // 0-100
  completedTasks: number;
  totalTasks: number;
}

interface ProgressTrackerProps {
  participants?: ParticipantProgress[];
}

/**
 * Progress tracker showing task completion
 * In group mode, displays individual participant progress with avatars positioned on progress bar
 */
const ProgressTrackerComponent = ({ participants = [] }: ProgressTrackerProps) => {
  const taskProgress = useAppSelector(selectTaskProgress);
  const completedCount = useAppSelector(selectCompletedTasksCount);
  const totalCount = useAppSelector(selectTotalTasksCount);
  const isGroupMode = useAppSelector(selectIsGroupMode);
  
  return (
    <div className="progress-tracker">
      <div className="progress-tracker__content">
        <div className="progress-tracker__info">
          <span className="progress-tracker__label">
            {isGroupMode ? 'Ваш прогресс' : 'Прогресс задач'}
          </span>
          <span className="progress-tracker__count">
            {completedCount} / {totalCount}
          </span>
        </div>
        
        <div className="progress-tracker__bar-container">
          <Progress
            percent={taskProgress}
            strokeColor={{
              '0%': 'var(--color-bright-blue)',
              '100%': '#65d4ff',
            }}
            trailColor="var(--color-background-soft)"
            strokeWidth={12}
            showInfo={false}
            className="progress-tracker__bar"
          />
          
          {/* Participant avatars positioned on progress bar for group mode */}
          {isGroupMode && participants.length > 0 && (
            <div className="progress-tracker__participants-overlay">
              {participants.map((participant) => (
                <Tooltip
                  key={participant.userId}
                  title={
                    <div>
                      <div>{participant.userName}</div>
                      <div style={{ fontSize: '12px', opacity: 0.8 }}>
                        {participant.completedTasks}/{participant.totalTasks} задач
                      </div>
                    </div>
                  }
                  placement="top"
                >
                  <div
                    className="progress-tracker__participant-marker"
                    style={{
                      left: `${Math.min(participant.progress, 100)}%`,
                    }}
                  >
                    <Avatar
                      src={participant.avatarUrl}
                      size={36}
                      icon={<UserOutlined />}
                      style={{
                        border: '2px solid var(--color-background)',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                      }}
                    >
                      {!participant.avatarUrl && participant.userName.charAt(0).toUpperCase()}
                    </Avatar>
                  </div>
                </Tooltip>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ProgressTracker = memo(ProgressTrackerComponent);
