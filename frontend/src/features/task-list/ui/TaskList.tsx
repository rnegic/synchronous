import { Checkbox } from 'antd';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux';
import { selectSessionTasks } from '@/entities/session/model/activeSessionSelectors';
import { toggleTask } from '@/entities/session/model/activeSessionSlice';
import './TaskList.css';

export const TaskList = () => {
  const dispatch = useAppDispatch();
  const tasks = useAppSelector(selectSessionTasks);
  
  const handleToggle = (taskId: string) => {
    dispatch(toggleTask(taskId));
  };
  
  if (tasks.length === 0) {
    return (
      <div className="task-list task-list--empty">
        <p className="task-list__empty-text">Нет задач для этой сессии</p>
      </div>
    );
  }
  
  return (
    <div className="task-list">
      <div className="task-list__header">
        <h3 className="task-list__title">Задачи сессии</h3>
        <span className="task-list__counter">
          {tasks.filter(t => t.completed).length} / {tasks.length}
        </span>
      </div>
      
      <div className="task-list__items">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`task-list__item ${task.completed ? 'task-list__item--completed' : ''}`}
          >
            <Checkbox
              checked={task.completed}
              onChange={() => handleToggle(task.id)}
              className="task-list__checkbox"
            >
              <span className="task-list__task-title">{task.title}</span>
            </Checkbox>
          </div>
        ))}
      </div>
    </div>
  );
};
