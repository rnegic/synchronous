import { useEffect, useState, memo } from 'react';
import { useNavigate } from 'react-router';
import { Progress, Button, Modal } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux';
import {
  selectFormattedTime,
  selectProgress,
  selectIsRunning,
  selectPhase,
  selectCurrentCycle,
  selectSessionId,
} from '@/entities/session/model/activeSessionSelectors';
import {
  tick,
  switchPhase,
  togglePauseAsync,
  completeSessionAsync,
} from '@/entities/session/model/activeSessionSlice';
import { getErrorMessage } from '@/shared/api';
import { useMaxWebApp } from '@/shared/hooks/useMaxWebApp';
import { message } from 'antd';
import './Timer.css';

const TimerComponent = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isMaxEnvironment } = useMaxWebApp();
  
  const formattedTime = useAppSelector(selectFormattedTime);
  const progress = useAppSelector(selectProgress);
  const isRunning = useAppSelector(selectIsRunning);
  const phase = useAppSelector(selectPhase);
  const currentCycle = useAppSelector(selectCurrentCycle);
  const sessionId = useAppSelector(selectSessionId);
  
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  
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
    console.log('[Timer] handleStop called', { sessionId, isMaxEnvironment });
    
    if (!sessionId) {
      console.error('[Timer] No sessionId available');
      message.error('Ошибка: не найден ID сессии');
      return;
    }
    
    setIsCompleteModalOpen(true);
  };
  
  const handleConfirmComplete = async () => {
    console.log('[Timer] Modal confirmed, starting session completion', { sessionId });
    setIsCompleting(true);
    
    try {
      const result = await dispatch(completeSessionAsync({ isMaxEnvironment })).unwrap();
      console.log('[Timer] Session completed successfully', result);
      setIsCompleteModalOpen(false);
      message.success('Сессия завершена! 🎉');
      
      // Явный редирект на страницу отчета
      console.log('[Timer] Redirecting to report page', { sessionId });
      setTimeout(() => {
        navigate(`/session-report/${sessionId}`);
      }, 500);
    } catch (error) {
      console.error('[Timer] Failed to complete session:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[Timer] Error details:', { errorMessage, error });
      message.error(`Ошибка завершения: ${getErrorMessage(error)}`);
      setIsCompleteModalOpen(false);
    } finally {
      setIsCompleting(false);
    }
  };
  
  const handleCancelComplete = () => {
    console.log('[Timer] Modal cancelled');
    setIsCompleteModalOpen(false);
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
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[Timer] Stop button clicked');
            handleStop();
          }}
          danger
          className="timer__btn-stop"
          htmlType="button"
        >
          Завершить
        </Button>
      </div>
      
      <Modal
        title="Завершить сессию?"
        open={isCompleteModalOpen}
        onOk={handleConfirmComplete}
        onCancel={handleCancelComplete}
        okText="Да, завершить"
        cancelText="Отмена"
        okButtonProps={{ danger: true, loading: isCompleting }}
        cancelButtonProps={{ disabled: isCompleting }}
        maskClosable={!isCompleting}
        closable={!isCompleting}
        zIndex={10000}
        getContainer={() => document.body}
        centered
      >
        <p>Вы уверены, что хотите завершить сессию досрочно? Прогресс будет сохранен.</p>
      </Modal>
    </div>
  );
};

export const Timer = memo(TimerComponent);
