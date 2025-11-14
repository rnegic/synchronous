package interfaces

import (
	"github.com/rnegic/synchronous/internal/entity"
)

type SessionService interface {
	CreateSession(userID string, mode entity.SessionMode, tasks []string, focusDuration, breakDuration int, groupName *string, isPrivate bool) (*entity.Session, error)
	GetSession(sessionID string, userID string) (*entity.Session, error)
	GetActiveSession(userID string) (*entity.Session, error)
	GetHistory(userID string, page, limit int) ([]*entity.Session, int, error)
	GetPublicSessions(page, limit int) ([]*entity.Session, int, error)
	JoinSession(sessionID string, userID string) (*entity.Session, error)
	JoinByInviteLink(inviteLink string, userID string) (*entity.Session, error)
	SetReady(sessionID string, userID string, isReady bool) error
	StartSession(sessionID string, userID string) error
	PauseSession(sessionID string, userID string) error
	ResumeSession(sessionID string, userID string) error
	CompleteSession(sessionID string, userID string) (*entity.SessionReport, error)
	GetSessionReport(sessionID string, userID string) (*entity.SessionReport, error)
	DeleteChatAfterDiscussion(sessionID string, userID string) error
	HandleChatCreated(update interface{}) error
	UpdateTask(sessionID string, taskID string, userID string, completed bool) (*entity.Task, error)
	AddTask(sessionID string, userID string, title string) (*entity.Task, error)
	DeleteTask(sessionID string, taskID string, userID string) error
	GetParticipantsProgress(sessionID string, userID string) ([]entity.ParticipantProgress, error)
	InviteUsers(sessionID string, userID string, userIDs []string) (int, string, error)
}
