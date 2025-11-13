package service

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rnegic/synchronous/internal/entity"
	"github.com/rnegic/synchronous/internal/interfaces"
	"github.com/rnegic/synchronous/pkg/maxapi"
)

type SessionService struct {
	sessionRepo   interfaces.SessionRepository
	taskRepo      interfaces.TaskRepository
	userRepo      interfaces.UserRepository
	maxAPIService interfaces.MaxAPIService
}

func NewSessionService(
	sessionRepo interfaces.SessionRepository,
	taskRepo interfaces.TaskRepository,
	userRepo interfaces.UserRepository,
	maxAPIService interfaces.MaxAPIService,
) interfaces.SessionService {
	return &SessionService{
		sessionRepo:   sessionRepo,
		taskRepo:      taskRepo,
		userRepo:      userRepo,
		maxAPIService: maxAPIService,
	}
}

func (s *SessionService) CreateSession(
	userID string,
	mode entity.SessionMode,
	tasks []string,
	focusDuration, breakDuration int,
	groupName *string,
	isPrivate bool,
) (*entity.Session, error) {
	sessionID := uuid.New().String()
	inviteLink := uuid.New().String()[:8] // Короткая ссылка
	// Получаем реальные данные пользователя для корректного отображения имени и аватара
	creator, err := s.userRepo.GetByID(userID)
	if err != nil || creator == nil {
		return nil, fmt.Errorf("failed to load creator: %w", err)
	}

	participants := []entity.Participant{
		{
			UserID:    userID,
			UserName:  creator.Name,
			AvatarURL: creator.AvatarURL,
			IsReady:   false,
			JoinedAt:  time.Now(),
		},
	}

	// Сначала создаем сессию, чтобы она существовала в БД для внешних ключей
	session := &entity.Session{
		ID:            sessionID,
		Mode:          mode,
		Status:        entity.SessionStatusPending,
		FocusDuration: focusDuration,
		BreakDuration: breakDuration,
		GroupName:     groupName,
		IsPrivate:     isPrivate,
		CreatorID:     userID,
		Participants:  participants,
		InviteLink:    inviteLink,
		CreatedAt:     time.Now(),
		CurrentCycle:  0,
	}

	if err := s.sessionRepo.Create(session); err != nil {
		return nil, fmt.Errorf("failed to create session: %w", err)
	}

	// Теперь создаем задачи после создания сессии
	tasksList := make([]entity.Task, 0, len(tasks))
	for _, title := range tasks {
		task := entity.Task{
			ID:        uuid.New().String(),
			Title:     title,
			Completed: false,
			SessionID: sessionID,
			CreatedAt: time.Now(),
		}
		if err := s.taskRepo.Create(&task); err != nil {
			// Если не удалось создать задачу, возвращаем ошибку
			// В реальности здесь должна быть транзакция для отката создания сессии
			return nil, fmt.Errorf("failed to create task: %w", err)
		}
		tasksList = append(tasksList, task)
	}

	// Добавляем задачи в объект сессии для возврата
	session.Tasks = tasksList

	return session, nil
}

func (s *SessionService) GetSession(sessionID string, userID string) (*entity.Session, error) {
	session, err := s.sessionRepo.GetByID(sessionID)
	if err != nil {
		return nil, fmt.Errorf("session not found: %w", err)
	}

	// Проверяем доступ
	// Для публичных сессий доступ разрешен всем
	// Для приватных сессий - только создателю и участникам
	hasAccess := !session.IsPrivate // Публичные сессии доступны всем
	if session.IsPrivate {
		// Для приватных сессий проверяем права
		hasAccess = session.CreatorID == userID
		if !hasAccess {
			for _, p := range session.Participants {
				if p.UserID == userID {
					hasAccess = true
					break
				}
			}
		}
	}

	if !hasAccess {
		return nil, fmt.Errorf("access denied")
	}

	// Загружаем задачи
	tasks, err := s.taskRepo.GetBySessionID(sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get tasks: %w", err)
	}

	// Конвертируем []*entity.Task в []entity.Task
	session.Tasks = make([]entity.Task, 0, len(tasks))
	for _, task := range tasks {
		session.Tasks = append(session.Tasks, *task)
	}

	return session, nil
}

func (s *SessionService) GetActiveSession(userID string) (*entity.Session, error) {
	return s.sessionRepo.GetActiveByUserID(userID)
}

func (s *SessionService) GetHistory(userID string, page, limit int) ([]*entity.Session, int, error) {
	return s.sessionRepo.GetHistory(userID, page, limit)
}

func (s *SessionService) GetPublicSessions(page, limit int) ([]*entity.Session, int, error) {
	// Get all public sessions that are pending (waiting for participants)
	sessions, err := s.sessionRepo.GetAll()
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get sessions: %w", err)
	}

	// Filter for public, pending, and GROUP sessions only (no solo sessions)
	publicSessions := make([]*entity.Session, 0)
	for _, session := range sessions {
		if !session.IsPrivate &&
			session.Status == entity.SessionStatusPending &&
			session.Mode == entity.SessionModeGroup {
			publicSessions = append(publicSessions, session)
		}
	}

	total := len(publicSessions)

	// Apply pagination
	start := (page - 1) * limit
	if start >= total {
		return []*entity.Session{}, total, nil
	}

	end := start + limit
	if end > total {
		end = total
	}

	return publicSessions[start:end], total, nil
}

func (s *SessionService) JoinSession(sessionID string, userID string) (*entity.Session, error) {
	session, err := s.sessionRepo.GetByID(sessionID)
	if err != nil {
		return nil, fmt.Errorf("session not found: %w", err)
	}

	if session.Status != entity.SessionStatusPending {
		return nil, fmt.Errorf("session already started")
	}

	// Подтягиваем реальные имя и аватар участника
	user, uerr := s.userRepo.GetByID(userID)
	if uerr != nil || user == nil {
		return nil, fmt.Errorf("failed to load user: %w", uerr)
	}

	participant := &entity.Participant{
		UserID:    userID,
		UserName:  user.Name,
		AvatarURL: user.AvatarURL,
		IsReady:   false,
		JoinedAt:  time.Now(),
	}

	if err := s.sessionRepo.AddParticipant(sessionID, participant); err != nil {
		return nil, fmt.Errorf("failed to add participant: %w", err)
	}

	return s.GetSession(sessionID, userID)
}

func (s *SessionService) JoinByInviteLink(inviteLink string, userID string) (*entity.Session, error) {
	cleanInviteLink := inviteLink
	if strings.HasPrefix(inviteLink, "invite_") {
		cleanInviteLink = strings.TrimPrefix(inviteLink, "invite_")
	}

	session, err := s.sessionRepo.GetByInviteLink(cleanInviteLink)
	if err != nil {
		return nil, fmt.Errorf("session not found by invite link: %w", err)
	}

	if session == nil {
		return nil, fmt.Errorf("session not found by invite link")
	}

	// Проверяем, не присоединен ли уже пользователь
	for _, p := range session.Participants {
		if p.UserID == userID {
			// Уже участник, просто возвращаем сессию
			return s.GetSession(session.ID, userID)
		}
	}

	// Присоединяем пользователя
	return s.JoinSession(session.ID, userID)
}

func (s *SessionService) SetReady(sessionID string, userID string, isReady bool) error {
	return s.sessionRepo.UpdateParticipantReady(sessionID, userID, isReady)
}

func (s *SessionService) StartSession(sessionID string, userID string) error {
	session, err := s.sessionRepo.GetByID(sessionID)
	if err != nil {
		return fmt.Errorf("session not found: %w", err)
	}

	if session.CreatorID != userID {
		return fmt.Errorf("only creator can start session")
	}

	if session.Status != entity.SessionStatusPending {
		return fmt.Errorf("session already started")
	}

	now := time.Now()
	session.Status = entity.SessionStatusActive
	session.StartedAt = &now

	return s.sessionRepo.Update(session)
}

func (s *SessionService) PauseSession(sessionID string, userID string) error {
	session, err := s.sessionRepo.GetByID(sessionID)
	if err != nil {
		return fmt.Errorf("session not found: %w", err)
	}

	// Verify user is participant or creator
	if session.CreatorID != userID {
		// For group sessions, check if user is participant
		if session.Mode == entity.SessionModeGroup {
			isParticipant := false
			for _, p := range session.Participants {
				if p.UserID == userID {
					isParticipant = true
					break
				}
			}
			if !isParticipant {
				return fmt.Errorf("user not authorized to pause session")
			}
		} else {
			return fmt.Errorf("only creator can pause solo session")
		}
	}

	if session.Status != entity.SessionStatusActive {
		// Idempotent: if already paused, do nothing
		if session.Status == entity.SessionStatusPaused {
			return nil
		}
		return fmt.Errorf("session is not active")
	}

	session.Status = entity.SessionStatusPaused
	return s.sessionRepo.Update(session)
}

func (s *SessionService) ResumeSession(sessionID string, userID string) error {
	session, err := s.sessionRepo.GetByID(sessionID)
	if err != nil {
		return fmt.Errorf("session not found: %w", err)
	}

	// Verify user is participant or creator
	if session.CreatorID != userID {
		// For group sessions, check if user is participant
		if session.Mode == entity.SessionModeGroup {
			isParticipant := false
			for _, p := range session.Participants {
				if p.UserID == userID {
					isParticipant = true
					break
				}
			}
			if !isParticipant {
				return fmt.Errorf("user not authorized to resume session")
			}
		} else {
			return fmt.Errorf("only creator can resume solo session")
		}
	}

	// Idempotent: if already active, do nothing
	if session.Status == entity.SessionStatusActive {
		return nil
	}

	if session.Status != entity.SessionStatusPaused {
		return fmt.Errorf("session is not paused")
	}

	session.Status = entity.SessionStatusActive
	return s.sessionRepo.Update(session)
}

func (s *SessionService) CompleteSession(sessionID string, userID string) (*entity.SessionReport, error) {
	session, err := s.sessionRepo.GetByID(sessionID)
	if err != nil {
		return nil, fmt.Errorf("session not found: %w", err)
	}

	now := time.Now()
	session.Status = entity.SessionStatusCompleted
	session.CompletedAt = &now

	if err := s.sessionRepo.Update(session); err != nil {
		return nil, fmt.Errorf("failed to update session: %w", err)
	}

	tasks, err := s.taskRepo.GetBySessionID(sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get tasks: %w", err)
	}

	completedTasks := 0
	for _, task := range tasks {
		if task.Completed {
			completedTasks++
		}
	}

	report := &entity.SessionReport{
		SessionID:       sessionID,
		TasksCompleted:  completedTasks,
		TasksTotal:      len(tasks),
		FocusTime:       0, // В реальности вычисляем из времени сессии
		BreakTime:       0,
		CyclesCompleted: session.CurrentCycle,
		CompletedAt:     now,
	}

	// Создаем чат для обсуждения после завершения сессии
	// Отправляем сообщение создателю с кнопкой для создания чата
	if err := s.createDiscussionChat(session); err != nil {
		// Логируем ошибку, но не прерываем завершение сессии
		// В реальности здесь должно быть логирование
		_ = err
	}

	return report, nil
}

// createDiscussionChat создает чат для обсуждения после завершения сессии
// Отправляет сообщение создателю с кнопкой для создания чата в Max
func (s *SessionService) createDiscussionChat(session *entity.Session) error {
	// Получаем создателя сессии для получения его MaxUserID
	creator, err := s.userRepo.GetByID(session.CreatorID)
	if err != nil {
		return fmt.Errorf("failed to get creator: %w", err)
	}

	// Формируем название чата
	chatTitle := "Обсуждение сессии"
	if session.GroupName != nil {
		chatTitle = fmt.Sprintf("Обсуждение: %s", *session.GroupName)
	} else if session.Mode == entity.SessionModeSolo {
		chatTitle = "Обсуждение сессии фокуса"
	}

	// Создаем сообщение с кнопкой для создания чата
	message := &maxapi.SendMessageRequest{
		Text: "Сессия завершена! Нажмите кнопку, чтобы создать чат для обсуждения результатов.",
		Attachments: []interface{}{
			map[string]interface{}{
				"type": "inline_keyboard",
				"payload": map[string]interface{}{
					"buttons": [][]interface{}{
						{
							map[string]interface{}{
								"type":             "chat",
								"text":             "Создать чат для обсуждения",
								"chat_title":       chatTitle,
								"chat_description": "Чат для обсуждения результатов сессии фокуса",
								"start_payload":    fmt.Sprintf("session_id:%s:discussion", session.ID),
								"uuid":             uuid.New().String(),
							},
						},
					},
				},
			},
		},
	}

	// Отправляем сообщение создателю в личный чат
	_, err = s.maxAPIService.SendMessageToUser(creator.MaxUserID, message)
	if err != nil {
		return fmt.Errorf("failed to send chat creation message: %w", err)
	}

	return nil
}

// HandleChatCreated обрабатывает webhook о создании чата через кнопку
// Сохраняет chat_id и chat_link в сессии и добавляет участников в чат
func (s *SessionService) HandleChatCreated(update interface{}) error {
	// Проверяем тип обновления
	chatUpdate, ok := update.(*maxapi.MessageChatCreatedUpdate)
	if !ok {
		return fmt.Errorf("invalid update type: expected *maxapi.MessageChatCreatedUpdate")
	}

	// Извлекаем session_id из start_payload
	// Формат: "session_id:abc123:discussion" или "session_id:abc123"
	sessionID := s.extractSessionIDFromPayload(chatUpdate.StartPayload)
	if sessionID == "" {
		return fmt.Errorf("invalid start_payload: %s", chatUpdate.StartPayload)
	}

	// Находим сессию
	session, err := s.sessionRepo.GetByID(sessionID)
	if err != nil {
		return fmt.Errorf("session not found: %w", err)
	}

	// Сохраняем информацию о чате в сессии
	chatID := chatUpdate.Chat.ChatID
	session.MaxChatID = &chatID
	// Ссылка на чат может быть получена позже через API или сформирована вручную
	// Формат ссылки зависит от Max API: например, https://max.ru/chat/{chatID}
	// Пока сохраняем только chatID, ссылку можно сформировать при необходимости

	// Обновляем сессию
	if err := s.sessionRepo.Update(session); err != nil {
		return fmt.Errorf("failed to update session: %w", err)
	}

	// Добавляем участников сессии в чат
	if err := s.addParticipantsToChat(session, chatID); err != nil {
		// Логируем ошибку, но не прерываем обработку
		// В реальности здесь должно быть логирование
		_ = err
	}

	return nil
}

// extractSessionIDFromPayload извлекает session_id из start_payload
// Формат: "session_id:abc123:discussion" или "session_id:abc123"
func (s *SessionService) extractSessionIDFromPayload(payload string) string {
	// Убираем префикс "session_id:"
	const prefix = "session_id:"
	if len(payload) < len(prefix) {
		return ""
	}
	if payload[:len(prefix)] != prefix {
		return ""
	}

	// Извлекаем session_id (до следующего ":" или до конца строки)
	sessionID := payload[len(prefix):]
	for i, char := range sessionID {
		if char == ':' {
			return sessionID[:i]
		}
	}
	return sessionID
}

// addParticipantsToChat добавляет участников сессии в чат Max
func (s *SessionService) addParticipantsToChat(session *entity.Session, chatID int64) error {
	// Собираем MaxUserID всех участников
	maxUserIDs := make([]int64, 0, len(session.Participants))
	for _, participant := range session.Participants {
		user, err := s.userRepo.GetByID(participant.UserID)
		if err != nil {
			// Пропускаем участника, если не удалось получить его данные
			continue
		}
		maxUserIDs = append(maxUserIDs, user.MaxUserID)
	}

	// Добавляем участников в чат
	if len(maxUserIDs) > 0 {
		if err := s.maxAPIService.AddMembers(chatID, maxUserIDs); err != nil {
			return fmt.Errorf("failed to add participants to chat: %w", err)
		}
	}

	return nil
}

// DeleteChatAfterDiscussion удаляет чат для обсуждения после окончания обсуждения
func (s *SessionService) DeleteChatAfterDiscussion(sessionID string, userID string) error {
	session, err := s.sessionRepo.GetByID(sessionID)
	if err != nil {
		return fmt.Errorf("session not found: %w", err)
	}

	// Проверяем права доступа - только создатель может удалить чат
	if session.CreatorID != userID {
		return fmt.Errorf("only creator can delete chat")
	}

	// Проверяем, что сессия завершена
	if session.Status != entity.SessionStatusCompleted {
		return fmt.Errorf("can only delete chat after session completion")
	}

	// Удаляем чат в Max API, если он существует
	if session.MaxChatID != nil {
		err := s.maxAPIService.DeleteChat(*session.MaxChatID)
		if err != nil {
			return fmt.Errorf("failed to delete chat: %w", err)
		}

		// Очищаем информацию о чате в сессии
		session.MaxChatID = nil
		session.MaxChatLink = nil
		if err := s.sessionRepo.Update(session); err != nil {
			return fmt.Errorf("failed to update session: %w", err)
		}
	} else {
		return fmt.Errorf("chat does not exist for this session")
	}

	return nil
}

// DeleteSession удаляет сессию и связанный чат Max (если есть)
func (s *SessionService) DeleteSession(sessionID string, userID string) error {
	session, err := s.sessionRepo.GetByID(sessionID)
	if err != nil {
		return fmt.Errorf("session not found: %w", err)
	}

	// Проверяем права доступа - только создатель может удалить сессию
	if session.CreatorID != userID {
		return fmt.Errorf("only creator can delete session")
	}

	// Удаляем чат в Max API, если он существует
	if session.MaxChatID != nil {
		err := s.maxAPIService.DeleteChat(*session.MaxChatID)
		if err != nil {
			// Логируем ошибку, но не прерываем удаление сессии
			// Чат может быть уже удален пользователем вручную или иметь другие проблемы
			// В реальности здесь должно быть логирование
			_ = err // Игнорируем ошибку удаления чата
		}
	}

	// Удаляем сессию из репозитория
	// Примечание: в реальности нужно проверить, есть ли метод Delete в репозитории
	// Если нет, можно обновить статус на "cancelled" или "deleted"
	return fmt.Errorf("delete method not implemented in repository")
}

func (s *SessionService) UpdateTask(sessionID string, taskID string, userID string, completed bool) (*entity.Task, error) {
	task, err := s.taskRepo.GetByID(taskID)
	if err != nil {
		return nil, fmt.Errorf("task not found: %w", err)
	}

	if task.SessionID != sessionID {
		return nil, fmt.Errorf("task does not belong to session")
	}

	task.Completed = completed
	if completed {
		now := time.Now()
		task.CompletedAt = &now
	} else {
		task.CompletedAt = nil
	}

	if err := s.taskRepo.Update(task); err != nil {
		return nil, fmt.Errorf("failed to update task: %w", err)
	}

	return task, nil
}

func (s *SessionService) AddTask(sessionID string, userID string, title string) (*entity.Task, error) {
	task := &entity.Task{
		ID:        uuid.New().String(),
		Title:     title,
		Completed: false,
		SessionID: sessionID,
		CreatedAt: time.Now(),
	}

	if err := s.taskRepo.Create(task); err != nil {
		return nil, fmt.Errorf("failed to create task: %w", err)
	}

	return task, nil
}

func (s *SessionService) DeleteTask(sessionID string, taskID string, userID string) error {
	task, err := s.taskRepo.GetByID(taskID)
	if err != nil {
		return fmt.Errorf("task not found: %w", err)
	}

	if task.SessionID != sessionID {
		return fmt.Errorf("task does not belong to session")
	}

	return s.taskRepo.Delete(taskID)
}

func (s *SessionService) InviteUsers(sessionID string, userID string, userIDs []string) (int, string, error) {
	session, err := s.sessionRepo.GetByID(sessionID)
	if err != nil {
		return 0, "", fmt.Errorf("session not found: %w", err)
	}

	if session.CreatorID != userID {
		return 0, "", fmt.Errorf("only creator can invite users")
	}

	// В реальности отправляем приглашения через Max API
	return len(userIDs), session.InviteLink, nil
}
