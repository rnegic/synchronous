package service

import (
	"fmt"
	"log"

	"github.com/rnegic/synchronous/internal/interfaces"
	"github.com/rnegic/synchronous/pkg/maxapi"
)

type MaxAPIService struct {
	client  *maxapi.Client
	baseURL string
}

func NewMaxAPIService(baseURL, accessToken string) interfaces.MaxAPIService {
	client, err := maxapi.NewClient(baseURL, accessToken)
	if err != nil {
		log.Fatalf("failed to initialize Max API client: %v", err)
	}

	return &MaxAPIService{
		client:  client,
		baseURL: baseURL,
	}
}

func (s *MaxAPIService) GetBotInfo() (*maxapi.BotInfo, error) {
	return s.client.GetMyInfo()
}

func (s *MaxAPIService) GetProfileByToken(accessToken string) (*maxapi.BotInfo, error) {
	dynamicClient, err := maxapi.NewClient(s.baseURL, accessToken)
	if err != nil {
		return nil, fmt.Errorf("failed to create Max API client: %w", err)
	}

	return dynamicClient.GetMyInfo()
}

func (s *MaxAPIService) SendMessage(chatID int64, text string) error {
	req := &maxapi.SendMessageRequest{
		Text: text,
	}
	_, err := s.client.SendMessage(chatID, req)
	return err
}

func (s *MaxAPIService) SendMessageToUser(userID int64, message *maxapi.SendMessageRequest) (*maxapi.SendMessageResponse, error) {
	return s.client.SendMessageToUser(userID, message)
}

func (s *MaxAPIService) GetChat(chatID int64) (*maxapi.Chat, error) {
	return s.client.GetChat(chatID)
}

func (s *MaxAPIService) GetChatByLink(chatLink string) (*maxapi.Chat, error) {
	return s.client.GetChatByLink(chatLink)
}

func (s *MaxAPIService) GetUserInfo(userID int64) (*maxapi.MaxUser, error) {
	// В реальности нужно будет добавить метод в клиент
	return nil, fmt.Errorf("not implemented yet")
}

func (s *MaxAPIService) GetMessages(chatID int64, from, to, count *int64, messageIDs []string) ([]maxapi.Message, error) {
	return s.client.GetMessages(chatID, from, to, count, messageIDs)
}

func (s *MaxAPIService) AddMembers(chatID int64, userIDs []int64) error {
	return s.client.AddMembers(chatID, userIDs)
}

func (s *MaxAPIService) GetChatMembers(chatID int64, marker *int64, count *int, userIDs []int64) (*maxapi.ChatMembersResponse, error) {
	return s.client.GetChatMembers(chatID, marker, count, userIDs)
}

func (s *MaxAPIService) EditChat(chatID int64, title *string, icon interface{}) (*maxapi.Chat, error) {
	return s.client.EditChat(chatID, title, icon)
}

func (s *MaxAPIService) DeleteChat(chatID int64) error {
	return s.client.DeleteChat(chatID)
}

func (s *MaxAPIService) RemoveMember(chatID int64, userID int64) error {
	return s.client.RemoveMember(chatID, userID)
}
