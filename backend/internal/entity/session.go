package entity

import (
	"time"

	"gorm.io/gorm"
)

type SessionMode string

const (
	SessionModeSolo  SessionMode = "solo"
	SessionModeGroup SessionMode = "group"
)

type SessionStatus string

const (
	SessionStatusPending   SessionStatus = "pending"
	SessionStatusActive    SessionStatus = "active"
	SessionStatusPaused    SessionStatus = "paused"
	SessionStatusCompleted SessionStatus = "completed"
	SessionStatusCancelled SessionStatus = "cancelled"
)

type Session struct {
	ID             string         `gorm:"type:varchar(36);primaryKey" json:"id"`
	Mode           SessionMode    `gorm:"type:session_mode;not null" json:"mode"`
	Status         SessionStatus  `gorm:"type:session_status;not null;default:'pending'" json:"status"`
	FocusDuration  int            `gorm:"not null" json:"focusDuration"` // в минутах
	BreakDuration  int            `gorm:"not null" json:"breakDuration"` // в минутах
	GroupName      *string        `gorm:"type:varchar(255)" json:"groupName"`
	IsPrivate      bool           `gorm:"not null;default:false" json:"isPrivate"`
	CreatorID      string         `gorm:"type:varchar(36);not null;index:idx_creator_id" json:"creatorId"`
	InviteLink     string         `gorm:"type:varchar(50);uniqueIndex:idx_invite_link;not null" json:"inviteLink"`
	MaxChatID      *int64         `gorm:"index:idx_max_chat_id" json:"maxChatId,omitempty"` // ID чата в Max API
	MaxChatLink    *string        `gorm:"type:varchar(500)" json:"maxChatLink,omitempty"`   // Ссылка на чат в Max
	StartedAt      *time.Time     `json:"startedAt"`
	CompletedAt    *time.Time     `json:"completedAt"`
	PausedAt       *time.Time     `json:"pausedAt"`
	TotalPauseTime int64          `gorm:"not null;default:0" json:"totalPauseTime"` // в миллисекундах
	CurrentCycle   int            `gorm:"not null;default:0" json:"currentCycle"`
	CreatedAt      time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP;index:idx_created_at" json:"createdAt"`
	UpdatedAt      time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updatedAt"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Tasks        []Task        `gorm:"foreignKey:SessionID;constraint:OnDelete:CASCADE" json:"tasks"`
	Participants []Participant `gorm:"foreignKey:SessionID;constraint:OnDelete:CASCADE" json:"participants"`
	Creator      *User         `gorm:"foreignKey:CreatorID" json:"creator,omitempty"`
}

func (Session) TableName() string {
	return "sessions"
}

type Participant struct {
	SessionID string     `gorm:"type:varchar(36);primaryKey;index:idx_session_id" json:"sessionId"`
	UserID    string     `gorm:"type:varchar(36);primaryKey;index:idx_user_id" json:"userId"`
	UserName  string     `gorm:"type:varchar(255);not null" json:"userName"`
	AvatarURL *string    `gorm:"type:text" json:"avatarUrl"`
	IsReady   bool       `gorm:"not null;default:false" json:"isReady"`
	JoinedAt  time.Time  `gorm:"not null;default:CURRENT_TIMESTAMP" json:"joinedAt"`
	LeftAt    *time.Time `json:"leftAt,omitempty"`

	// Relations
	Session *Session `gorm:"foreignKey:SessionID" json:"session,omitempty"`
	User    *User    `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (Participant) TableName() string {
	return "session_participants"
}

type Task struct {
	ID          string         `gorm:"type:varchar(36);primaryKey" json:"id"`
	SessionID   string         `gorm:"type:varchar(36);not null;index:idx_session_id" json:"sessionId"`
	UserID      *string        `gorm:"type:varchar(255);index:idx_user_id" json:"userId,omitempty"` // Owner of the task
	Title       string         `gorm:"type:varchar(500);not null" json:"title"`
	Completed   bool           `gorm:"not null;default:false;index:idx_completed" json:"completed"`
	CompletedAt *time.Time     `json:"completedAt"`
	CreatedAt   time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP" json:"createdAt"`
	UpdatedAt   time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Session *Session `gorm:"foreignKey:SessionID" json:"session,omitempty"`
	User    *User    `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (Task) TableName() string {
	return "tasks"
}

type SessionReport struct {
	SessionID       string              `json:"sessionId"`
	TasksCompleted  int                 `json:"tasksCompleted"`
	TasksTotal      int                 `json:"tasksTotal"`
	FocusTime       int                 `json:"focusTime"` // в минутах
	BreakTime       int                 `json:"breakTime"` // в минутах
	CyclesCompleted int                 `json:"cyclesCompleted"`
	Participants    []ParticipantReport `json:"participants"`
	CompletedAt     time.Time           `json:"completedAt"`
}

type ParticipantReport struct {
	UserID         string  `json:"userId"`
	UserName       string  `json:"userName"`
	AvatarURL      *string `json:"avatarUrl"`
	TasksCompleted int     `json:"tasksCompleted"`
	FocusTime      int     `json:"focusTime"` // в минутах
}
