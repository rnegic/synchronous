import { Progress, Avatar, Tooltip } from 'antd';
import { useAppSelector } from '@/shared/hooks/redux';
import {
  selectTaskProgress,
  selectCompletedTasksCount,
  selectTotalTasksCount,
  selectParticipants,
  selectIsGroupMode,
} from '@/entities/session/model/activeSessionSelectors';
import './ProgressTracker.css';

export const ProgressTracker = () => {
  const taskProgress = useAppSelector(selectTaskProgress);
  const completedCount = useAppSelector(selectCompletedTasksCount);
  const totalCount = useAppSelector(selectTotalTasksCount);
  const participants = useAppSelector(selectParticipants);
  const isGroupMode = useAppSelector(selectIsGroupMode);
  
  return (
    <div className="progress-tracker">
      <div className="progress-tracker__content">
        <div className="progress-tracker__info">
          <span className="progress-tracker__label">Прогресс задач</span>
          <span className="progress-tracker__count">
            {completedCount} / {totalCount}
          </span>
        </div>
        
        <Progress
          percent={taskProgress}
          strokeColor={{
            '0%': 'var(--color-bright-blue)',
            '100%': '#65d4ff',
          }}
          trailColor="var(--color-background-soft)"
          strokeWidth={8}
          showInfo={false}
          className="progress-tracker__bar"
        />
      </div>
      
      {isGroupMode && participants.length > 0 && (
        <div className="progress-tracker__participants">
          <Avatar.Group
            max={{
              count: 5,
              style: {
                backgroundColor: 'var(--color-primary)',
                fontSize: 'var(--font-size-sm)',
              },
            }}
          >
            {participants.map((participant) => (
              <Tooltip key={participant.id} title={participant.name} placement="bottom">
                <Avatar
                  src={participant.avatar}
                  alt={participant.name}
                  size="default"
                  style={{
                    backgroundColor: participant.avatar ? undefined : 'var(--color-lavender)',
                    color: 'var(--color-primary)',
                    fontWeight: 'var(--font-weight-semibold)',
                  }}
                >
                  {!participant.avatar && participant.name.charAt(0).toUpperCase()}
                </Avatar>
              </Tooltip>
            ))}
          </Avatar.Group>
        </div>
      )}
    </div>
  );
};
