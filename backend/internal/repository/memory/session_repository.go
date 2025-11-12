package memory

import (
	"fmt"
	"sync"

	"github.com/rnegic/synchronous/internal/entity"
	"github.com/rnegic/synchronous/internal/interfaces"
)

type SessionRepository struct {
	sessions     map[string]*entity.Session
	inviteLinks  map[string]string   // inviteLink -> sessionID
	userSessions map[string][]string // userID -> []sessionID
	mu           sync.RWMutex
}

func NewSessionRepository() interfaces.SessionRepository {
	return &SessionRepository{
		sessions:     make(map[string]*entity.Session),
		inviteLinks:  make(map[string]string),
		userSessions: make(map[string][]string),
	}
}

func (r *SessionRepository) Create(session *entity.Session) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.sessions[session.ID]; exists {
		return fmt.Errorf("session with ID %s already exists", session.ID)
	}

	r.sessions[session.ID] = session
	r.inviteLinks[session.InviteLink] = session.ID

	// Добавляем в список сессий пользователя
	r.userSessions[session.CreatorID] = append(r.userSessions[session.CreatorID], session.ID)

	return nil
}

func (r *SessionRepository) GetByID(id string) (*entity.Session, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	session, exists := r.sessions[id]
	if !exists {
		return nil, fmt.Errorf("session with ID %s not found", id)
	}

	return session, nil
}

func (r *SessionRepository) GetByInviteLink(inviteLink string) (*entity.Session, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	sessionID, exists := r.inviteLinks[inviteLink]
	if !exists {
		return nil, fmt.Errorf("session with invite link %s not found", inviteLink)
	}

	session, exists := r.sessions[sessionID]
	if !exists {
		return nil, fmt.Errorf("session with ID %s not found", sessionID)
	}

	return session, nil
}

func (r *SessionRepository) GetActiveByUserID(userID string) (*entity.Session, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	sessionIDs, exists := r.userSessions[userID]
	if !exists {
		return nil, nil
	}

	for _, sessionID := range sessionIDs {
		session, exists := r.sessions[sessionID]
		if exists && session.Status == entity.SessionStatusActive {
			return session, nil
		}
	}

	return nil, nil
}

func (r *SessionRepository) GetHistory(userID string, page, limit int) ([]*entity.Session, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	sessionIDs, exists := r.userSessions[userID]
	if !exists {
		return []*entity.Session{}, 0, nil
	}

	var completedSessions []*entity.Session
	for _, sessionID := range sessionIDs {
		session, exists := r.sessions[sessionID]
		if exists && session.Status == entity.SessionStatusCompleted {
			completedSessions = append(completedSessions, session)
		}
	}

	// Простая пагинация
	start := (page - 1) * limit
	end := start + limit
	total := len(completedSessions)

	if start > total {
		return []*entity.Session{}, total, nil
	}

	if end > total {
		end = total
	}

	return completedSessions[start:end], total, nil
}

func (r *SessionRepository) Update(session *entity.Session) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.sessions[session.ID]; !exists {
		return fmt.Errorf("session with ID %s not found", session.ID)
	}

	r.sessions[session.ID] = session
	return nil
}

func (r *SessionRepository) AddParticipant(sessionID string, participant *entity.Participant) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	session, exists := r.sessions[sessionID]
	if !exists {
		return fmt.Errorf("session with ID %s not found", sessionID)
	}

	// Проверяем, не является ли участник уже в сессии
	for i, p := range session.Participants {
		if p.UserID == participant.UserID {
			session.Participants[i] = *participant
			return nil
		}
	}

	session.Participants = append(session.Participants, *participant)

	// Добавляем в список сессий пользователя
	r.userSessions[participant.UserID] = append(r.userSessions[participant.UserID], sessionID)

	return nil
}

func (r *SessionRepository) RemoveParticipant(sessionID string, userID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	session, exists := r.sessions[sessionID]
	if !exists {
		return fmt.Errorf("session with ID %s not found", sessionID)
	}

	for i, p := range session.Participants {
		if p.UserID == userID {
			session.Participants = append(session.Participants[:i], session.Participants[i+1:]...)
			break
		}
	}

	return nil
}

func (r *SessionRepository) UpdateParticipantReady(sessionID string, userID string, isReady bool) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	session, exists := r.sessions[sessionID]
	if !exists {
		return fmt.Errorf("session with ID %s not found", sessionID)
	}

	for i, p := range session.Participants {
		if p.UserID == userID {
			session.Participants[i].IsReady = isReady
			return nil
		}
	}

	return fmt.Errorf("participant with userID %s not found in session %s", userID, sessionID)
}

func (r *SessionRepository) GetSessionsByStatus(status entity.SessionStatus) ([]*entity.Session, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var sessions []*entity.Session
	for _, session := range r.sessions {
		if session.Status == status {
			sessions = append(sessions, session)
		}
	}

	return sessions, nil
}

func (r *SessionRepository) GetAll() ([]*entity.Session, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	sessions := make([]*entity.Session, 0, len(r.sessions))
	for _, session := range r.sessions {
		sessions = append(sessions, session)
	}

	return sessions, nil
}
