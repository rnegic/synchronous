import { useEffect } from 'react';
import { Progress, Button, Modal } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux';
import {
  selectFormattedTime,
  selectProgress,
  selectIsRunning,
  selectPhase,
  selectCurrentCycle,
} from '@/entities/session/model/activeSessionSelectors';
import {
  tick,
  switchPhase,
  togglePauseAsync,
  completeSessionAsync,
} from '@/entities/session/model/activeSessionSlice';
import { getErrorMessage } from '@/shared/api';
import { message } from 'antd';
import './Timer.css';

export const Timer = () => {
  const dispatch = useAppDispatch();
  
  const formattedTime = useAppSelector(selectFormattedTime);
  const progress = useAppSelector(selectProgress);
  const isRunning = useAppSelector(selectIsRunning);
  const phase = useAppSelector(selectPhase);
  const currentCycle = useAppSelector(selectCurrentCycle);
  
  // Timer tick effect
  useEffect(() => {
    if (!isRunning) return;
    
    const interval = setInterval(() => {
      dispatch(tick());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isRunning, dispatch]);
  
  // Auto switch phase when time is up
  useEffect(() => {
    if (progress >= 100 && isRunning) {
      dispatch(switchPhase());
    }
  }, [progress, isRunning, dispatch]);
  
  const handleTogglePause = async () => {
    try {
      await dispatch(togglePauseAsync()).unwrap();
    } catch (error) {
      console.error('[Timer] Toggle pause failed:', error);
      message.error(`Ошибка: ${getErrorMessage(error)}`);
    }
  };
  
  const handleStop = () => {
    Modal.confirm({
      title: 'Завершить сессию?',
      content: 'Вы уверены, что хотите завершить сессию досрочно? Прогресс будет сохранен.',
      okText: 'Да, завершить',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await dispatch(completeSessionAsync()).unwrap();
          console.log('[Timer] Session completed successfully');
        } catch (error) {
          console.error('[Timer] Failed to complete session:', error);
          message.error(`Ошибка завершения: ${getErrorMessage(error)}`);
        }
      },
    });
  };
  
  return (
    <div className="timer">
      <div className="timer__phase-indicator">
        <span className={`timer__phase-label timer__phase-label--${phase}`}>
          {phase === 'focus' ? '🎯 Фокус' : '☕ Перерыв'}
        </span>
        <span className="timer__cycle">Цикл {currentCycle}</span>
      </div>
      
      <div className="timer__circle">
        <Progress
          type="circle"
          percent={progress}
          format={() => (
            <div className="timer__time">
              {formattedTime}
            </div>
          )}
          strokeColor={{
            '0%': phase === 'focus' ? 'var(--color-primary)' : 'var(--color-bright-sage)',
            '100%': phase === 'focus' ? 'var(--color-info)' : 'var(--color-mint)',
          }}
          trailColor="var(--color-background-soft)"
          strokeWidth={6}
          size={280}
        />
      </div>
      
      <div className="timer__controls">
        <Button
          size="large"
          icon={isRunning ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
          onClick={handleTogglePause}
          className="timer__btn-pause"
        >
          {isRunning ? 'Пауза' : 'Продолжить'}
        </Button>
        <Button
          size="large"
          icon={<CloseCircleOutlined />}
          onClick={handleStop}
          danger
          className="timer__btn-stop"
        >
          Завершить
        </Button>
      </div>
    </div>
  );
};
