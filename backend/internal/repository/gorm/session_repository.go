package gorm

import (
	"github.com/rnegic/synchronous/internal/entity"
	"github.com/rnegic/synchronous/internal/interfaces"
	"gorm.io/gorm"
)

type sessionRepository struct {
	db *gorm.DB
}

func NewSessionRepository(db *gorm.DB) interfaces.SessionRepository {
	return &sessionRepository{db: db}
}

func (r *sessionRepository) Create(session *entity.Session) error {
	return r.db.Create(session).Error
}

func (r *sessionRepository) GetByID(id string) (*entity.Session, error) {
	var session entity.Session
	err := r.db.Preload("Tasks").Preload("Participants").Where("id = ?", id).First(&session).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &session, nil
}

func (r *sessionRepository) GetByInviteLink(inviteLink string) (*entity.Session, error) {
	var session entity.Session
	err := r.db.Preload("Tasks").Preload("Participants").Where("invite_link = ?", inviteLink).First(&session).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &session, nil
}

func (r *sessionRepository) GetActiveByUserID(userID string) (*entity.Session, error) {
	var session entity.Session
	err := r.db.Preload("Tasks").Preload("Participants").
		Joins("JOIN session_participants ON sessions.id = session_participants.session_id").
		Where("session_participants.user_id = ? AND sessions.status = ?", userID, entity.SessionStatusActive).
		First(&session).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &session, nil
}

func (r *sessionRepository) GetHistory(userID string, page, limit int) ([]*entity.Session, int, error) {
	var sessions []*entity.Session
	var total int64

	offset := (page - 1) * limit

	// Подсчет общего количества
	err := r.db.Model(&entity.Session{}).
		Joins("JOIN session_participants ON sessions.id = session_participants.session_id").
		Where("session_participants.user_id = ?", userID).
		Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	// Получение сессий
	err = r.db.Preload("Tasks").Preload("Participants").
		Joins("JOIN session_participants ON sessions.id = session_participants.session_id").
		Where("session_participants.user_id = ?", userID).
		Order("sessions.created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&sessions).Error
	if err != nil {
		return nil, 0, err
	}

	return sessions, int(total), nil
}

func (r *sessionRepository) Update(session *entity.Session) error {
	return r.db.Save(session).Error
}

func (r *sessionRepository) AddParticipant(sessionID string, participant *entity.Participant) error {
	participant.SessionID = sessionID
	return r.db.Create(participant).Error
}

func (r *sessionRepository) RemoveParticipant(sessionID string, userID string) error {
	return r.db.Where("session_id = ? AND user_id = ?", sessionID, userID).
		Delete(&entity.Participant{}).Error
}

func (r *sessionRepository) UpdateParticipantReady(sessionID string, userID string, isReady bool) error {
	return r.db.Model(&entity.Participant{}).
		Where("session_id = ? AND user_id = ?", sessionID, userID).
		Update("is_ready", isReady).Error
}

func (r *sessionRepository) GetSessionsByStatus(status entity.SessionStatus) ([]*entity.Session, error) {
	var sessions []*entity.Session
	err := r.db.Preload("Tasks").Preload("Participants").
		Where("status = ?", status).
		Find(&sessions).Error
	if err != nil {
		return nil, err
	}
	return sessions, nil
}

func (r *sessionRepository) GetAll() ([]*entity.Session, error) {
	var sessions []*entity.Session
	err := r.db.Preload("Tasks").Preload("Participants").
		Order("created_at DESC").
		Find(&sessions).Error
	if err != nil {
		return nil, err
	}
	return sessions, nil
}
