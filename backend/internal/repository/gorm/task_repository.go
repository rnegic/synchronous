package gorm

import (
	"github.com/rnegic/synchronous/internal/entity"
	"github.com/rnegic/synchronous/internal/interfaces"
	"gorm.io/gorm"
)

type taskRepository struct {
	db *gorm.DB
}

func NewTaskRepository(db *gorm.DB) interfaces.TaskRepository {
	return &taskRepository{db: db}
}

func (r *taskRepository) Create(task *entity.Task) error {
	return r.db.Create(task).Error
}

func (r *taskRepository) GetByID(id string) (*entity.Task, error) {
	var task entity.Task
	err := r.db.Where("id = ?", id).First(&task).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &task, nil
}

func (r *taskRepository) GetBySessionID(sessionID string) ([]*entity.Task, error) {
	var tasks []*entity.Task
	err := r.db.Where("session_id = ?", sessionID).Order("created_at ASC").Find(&tasks).Error
	if err != nil {
		return nil, err
	}
	return tasks, nil
}

func (r *taskRepository) GetBySessionIDAndUserID(sessionID string, userID string) ([]*entity.Task, error) {
	var tasks []*entity.Task
	err := r.db.Where("session_id = ? AND user_id = ?", sessionID, userID).Order("created_at ASC").Find(&tasks).Error
	if err != nil {
		return nil, err
	}
	return tasks, nil
}

func (r *taskRepository) Update(task *entity.Task) error {
	return r.db.Save(task).Error
}

func (r *taskRepository) Delete(id string) error {
	return r.db.Delete(&entity.Task{}, "id = ?", id).Error
}
