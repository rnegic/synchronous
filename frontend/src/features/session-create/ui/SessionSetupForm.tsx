import { Input, Button, List, Typography, Segmented, Switch, Space, Select } from 'antd';
import { PlusOutlined, DeleteOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux';
import {
  setCurrentTask,
  addTask,
  removeTask,
  setMode,
  setGroupName,
  setIsPrivate,
  setFocusDuration,
  setBreakDuration,
} from '@/entities/session/model/sessionSetupSlice';
import {
  selectTasks,
  selectCurrentTask,
  selectMode,
  selectGroupName,
  selectIsPrivate,
  selectFocusDuration,
  selectBreakDuration,
  selectCanSubmit,
} from '@/entities/session/model/selectors';
import type { SessionMode } from '@/shared/types';
import './SessionSetupForm.css';

const { Text, Title } = Typography;

interface SessionSetupFormProps {
  onSubmit: (data: {
    tasks: string[];
    mode: SessionMode;
    groupName?: string;
    isPrivate?: boolean;
    focusDuration: number;
    breakDuration: number;
  }) => void;
}

export const SessionSetupForm = ({ onSubmit }: SessionSetupFormProps) => {
  const dispatch = useAppDispatch();
  
  const tasks = useAppSelector(selectTasks);
  const currentTask = useAppSelector(selectCurrentTask);
  const mode = useAppSelector(selectMode);
  const groupName = useAppSelector(selectGroupName);
  const isPrivate = useAppSelector(selectIsPrivate);
  const focusDuration = useAppSelector(selectFocusDuration);
  const breakDuration = useAppSelector(selectBreakDuration);
  const canSubmit = useAppSelector(selectCanSubmit);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      dispatch(addTask());
    }
  };

  const handleSubmit = () => {
    if (canSubmit) {
      onSubmit({
        tasks,
        mode,
        focusDuration,
        breakDuration,
        ...(mode === 'group' && { groupName, isPrivate }),
      });
    }
  };

  return (
    <div className="session-setup-form">
      <div className="session-setup-form__header">
        <Title level={3} style={{ margin: 0 }}>
          Новая фокус-сессия
        </Title>
      </div>

      {/* Tasks Section */}
      <section className="session-setup-form__section">
        <Text strong className="session-setup-form__label">
          Задачи на сессию
        </Text>
        <div className="session-setup-form__task-input">
          <Input
            placeholder="Что планируете сделать?"
            value={currentTask}
            onChange={(e) => dispatch(setCurrentTask(e.target.value))}
            onKeyPress={handleKeyPress}
            size="large"
            suffix={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => dispatch(addTask())}
                disabled={!currentTask.trim()}
                shape="circle"
              />
            }
          />
        </div>

        {tasks.length > 0 && (
          <List
            className="session-setup-form__task-list"
            dataSource={tasks}
            renderItem={(task, index) => (
              <List.Item
                className="session-setup-form__task-item"
                actions={[
                  <Button
                    key="delete"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => dispatch(removeTask(index))}
                  />,
                ]}
              >
                <div className="session-setup-form__task-content">
                  <CheckCircleOutlined className="session-setup-form__task-icon" />
                  <Text>{task}</Text>
                </div>
              </List.Item>
            )}
          />
        )}
      </section>

      {/* Mode Section */}
      <section className="session-setup-form__section">
        <Text strong className="session-setup-form__label">
          Режим
        </Text>
        <Segmented
          value={mode}
          onChange={(value) => dispatch(setMode(value as SessionMode))}
          options={[
            { label: 'Один', value: 'solo' },
            { label: 'В группе', value: 'group' },
          ]}
          block
          size="large"
          className="session-setup-form__segmented"
        />
      </section>

      {/* Group Settings (conditional) */}
      {mode === 'group' && (
        <section className="session-setup-form__section">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong className="session-setup-form__label">
                Название группы
              </Text>
              <Input
                placeholder="Например: Готовимся к экзамену"
                value={groupName}
                onChange={(e) => dispatch(setGroupName(e.target.value))}
                size="large"
              />
            </div>
            <div className="session-setup-form__switch-row">
              <Text>Сделать сессию приватной</Text>
              <Switch checked={isPrivate} onChange={(checked) => dispatch(setIsPrivate(checked))} />
            </div>
          </Space>
        </section>
      )}

      {/* Timer Settings */}
      <section className="session-setup-form__section">
        <Text strong className="session-setup-form__label">
          Настройки таймера
        </Text>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div className="session-setup-form__timer-row">
            <Text>Фокус:</Text>
            <Select
              value={focusDuration}
              onChange={(value) => dispatch(setFocusDuration(value))}
              options={[
                { label: '15 мин', value: 15 },
                { label: '25 мин', value: 25 },
                { label: '30 мин', value: 30 },
                { label: '45 мин', value: 45 },
                { label: '60 мин', value: 60 },
              ]}
              style={{ width: 120 }}
            />
          </div>
          <div className="session-setup-form__timer-row">
            <Text>Перерыв:</Text>
            <Select
              value={breakDuration}
              onChange={(value) => dispatch(setBreakDuration(value))}
              options={[
                { label: '5 мин', value: 5 },
                { label: '10 мин', value: 10 },
                { label: '15 мин', value: 15 },
                { label: '20 мин', value: 20 },
              ]}
              style={{ width: 120 }}
            />
          </div>
        </Space>
      </section>

      <div className="session-setup-form__footer">
        <Button
          type="primary"
          size="large"
          block
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="session-setup-form__submit"
        >
          {mode === 'solo' ? 'Начать' : 'Создать группу'}
        </Button>
      </div>
    </div>
  );
};
