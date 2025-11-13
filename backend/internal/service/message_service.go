package service

import (
	"fmt"
	"time"

	"github.com/rnegic/synchronous/internal/entity"
	"github.com/rnegic/synchronous/internal/interfaces"
)

type MessageService struct {
	sessionService interfaces.SessionService
	maxAPIService  interfaces.MaxAPIService
	userRepo       interfaces.UserRepository
	messageRepo    interfaces.MessageRepository
}

func NewMessageService(
	sessionService interfaces.SessionService,
	maxAPIService interfaces.MaxAPIService,
	userRepo interfaces.UserRepository,
	messageRepo interfaces.MessageRepository,
) interfaces.MessageService {
	return &MessageService{
		sessionService: sessionService,
		maxAPIService:  maxAPIService,
		userRepo:       userRepo,
		messageRepo:    messageRepo,
	}
}

// GetMessages получает сообщения из Max API для сессии
func (s *MessageService) GetMessages(sessionID string, userID string, before *time.Time, limit int) ([]*entity.Message, error) {
	// Проверяем доступ к сессии
	session, err := s.sessionService.GetSession(sessionID, userID)
	if err != nil {
		return nil, fmt.Errorf("session not found: %w", err)
	}

	// Проверяем, что чат создан
	if session.MaxChatID == nil {
		return nil, fmt.Errorf("chat not created for this session")
	}

	// Преобразуем before в Unix timestamp в миллисекундах для Max API
	var to *int64
	if before != nil {
		timestamp := before.Unix() * 1000
		to = &timestamp
	}

	count := int64(limit)

	// Получаем сообщения из Max API
	maxMessages, err := s.maxAPIService.GetMessages(*session.MaxChatID, nil, to, &count, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to get messages from Max API: %w", err)
	}

	// Преобразуем сообщения Max API в entity.Message
	messages := make([]*entity.Message, 0, len(maxMessages))
	for _, maxMsg := range maxMessages {
		// Получаем информацию о пользователе
		user, err := s.userRepo.GetByMaxUserID(maxMsg.Sender.UserID)
		if err != nil {
			// Пропускаем сообщения от пользователей, которых нет в нашей БД
			continue
		}

		msg := &entity.Message{
			ID:        maxMsg.Body.Mid,
			UserID:    user.ID,
			UserName:  user.Name,
			AvatarURL: user.AvatarURL,
			Text:      maxMsg.Body.Text,
			SessionID: sessionID,
			CreatedAt: time.Unix(maxMsg.Timestamp/1000, (maxMsg.Timestamp%1000)*1000000),
		}
		messages = append(messages, msg)
	}

	return messages, nil
}

// SendMessage отправляет сообщение через Max API
func (s *MessageService) SendMessage(sessionID string, userID string, text string) (*entity.Message, error) {
	// Проверяем доступ к сессии
	session, err := s.sessionService.GetSession(sessionID, userID)
	if err != nil {
		return nil, fmt.Errorf("session not found: %w", err)
	}

	// Проверяем, что чат создан
	if session.MaxChatID == nil {
		return nil, fmt.Errorf("chat not created for this session")
	}

	// Получаем информацию о пользователе
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// Отправляем сообщение через Max API
	// Проверяем, что у пользователя есть MaxUserID
	if user.MaxUserID == nil {
		return nil, fmt.Errorf("user MaxUserID not found")
	}

	// Отправляем сообщение от имени пользователя в чат
	// В Max API нужно отправлять сообщение от имени бота, но указывать пользователя
	err = s.maxAPIService.SendMessage(*session.MaxChatID, text)
	if err != nil {
		return nil, fmt.Errorf("failed to send message to Max API: %w", err)
	}

	// Создаем объект сообщения для ответа
	// В реальности Max API должен вернуть информацию о созданном сообщении
	// Пока создаем простой объект
	msg := &entity.Message{
		ID:        fmt.Sprintf("msg_%d", time.Now().UnixNano()), // Временный ID
		UserID:    user.ID,
		UserName:  user.Name,
		AvatarURL: user.AvatarURL,
		Text:      text,
		SessionID: sessionID,
		CreatedAt: time.Now(),
	}

	return msg, nil
}

// GetChatInfo возвращает информацию о чате Max для сессии
func (s *MessageService) GetChatInfo(sessionID string, userID string) (*entity.MaxChatInfo, error) {
	// Проверяем доступ к сессии
	session, err := s.sessionService.GetSession(sessionID, userID)
	if err != nil {
		return nil, fmt.Errorf("session not found: %w", err)
	}

	// Проверяем, что чат создан
	if session.MaxChatID == nil {
		return nil, fmt.Errorf("chat not created for this session")
	}

	// Получаем информацию о чате из Max API
	chat, err := s.maxAPIService.GetChat(*session.MaxChatID)
	if err != nil {
		return nil, fmt.Errorf("failed to get chat info from Max API: %w", err)
	}

	chatInfo := &entity.MaxChatInfo{
		ChatID:            chat.ChatID,
		ChatLink:          "", // В реальности нужно получить из Max API или сформировать
		Title:             chat.Title,
		ParticipantsCount: chat.ParticipantsCount,
	}

	// Если есть ссылка в сессии, используем её
	if session.MaxChatLink != nil {
		chatInfo.ChatLink = *session.MaxChatLink
	}

	return chatInfo, nil
}
