package interfaces

import (
	"time"

	"github.com/rnegic/synchronous/internal/entity"
)

type SessionRepository interface {
	Create(session *entity.Session) error
	GetByID(id string) (*entity.Session, error)
	GetByInviteLink(inviteLink string) (*entity.Session, error)
	GetActiveByUserID(userID string) (*entity.Session, error)
	GetHistory(userID string, page, limit int) ([]*entity.Session, int, error)
	GetAll() ([]*entity.Session, error)
	Update(session *entity.Session) error
	AddParticipant(sessionID string, participant *entity.Participant) error
	RemoveParticipant(sessionID string, userID string) error
	UpdateParticipantReady(sessionID string, userID string, isReady bool) error
	GetSessionsByStatus(status entity.SessionStatus) ([]*entity.Session, error)
}

type TaskRepository interface {
	Create(task *entity.Task) error
	GetByID(id string) (*entity.Task, error)
	GetBySessionID(sessionID string) ([]*entity.Task, error)
	Update(task *entity.Task) error
	Delete(id string) error
}

type MessageRepository interface {
	Create(message *entity.Message) error
	GetBySessionID(sessionID string, before *time.Time, limit int) ([]*entity.Message, error)
	GetByID(id string) (*entity.Message, error)
}

type LeaderboardRepository interface {
	GetSessionLeaderboard(sessionID string) ([]*entity.LeaderboardEntry, error)
	GetGlobalLeaderboard(period entity.LeaderboardPeriod, limit int) ([]*entity.LeaderboardEntry, error)
	UpdateUserScore(userID string, sessionID string, score int) error
}
