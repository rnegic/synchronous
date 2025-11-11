package service

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rnegic/synchronous/internal/entity"
	"github.com/rnegic/synchronous/internal/interfaces"
	"github.com/rnegic/synchronous/pkg/jwt"
)

type AuthService struct {
	userRepo     interfaces.UserRepository
	tokenManager *jwt.TokenManager
	botToken     string
}

func NewAuthService(
	userRepo interfaces.UserRepository,
	tokenManager *jwt.TokenManager,
	botToken string,
) interfaces.AuthService {
	return &AuthService{
		userRepo:     userRepo,
		tokenManager: tokenManager,
		botToken:     botToken,
	}
}

func (s *AuthService) Login(initData, deviceID string) (*entity.AuthTokens, *entity.User, error) {
	_ = deviceID

	payload, err := validateInitData(initData, s.botToken)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to validate init data: %w", err)
	}

	userJSON, ok := payload["user"]
	if !ok || strings.TrimSpace(userJSON) == "" {
		return nil, nil, fmt.Errorf("init data missing user payload")
	}

	var initUser maxInitDataUser
	if err := json.Unmarshal([]byte(userJSON), &initUser); err != nil {
		return nil, nil, fmt.Errorf("failed to parse user payload: %w", err)
	}

	if initUser.ID == 0 {
		return nil, nil, fmt.Errorf("init data missing user id")
	}

	displayName := strings.TrimSpace(fmt.Sprintf("%s %s", initUser.FirstName, initUser.LastName))
	if displayName == "" {
		displayName = strings.TrimSpace(initUser.Username)
	}
	if displayName == "" {
		displayName = fmt.Sprintf("user-%d", initUser.ID)
	}

	var avatarURL *string
	if strings.TrimSpace(initUser.PhotoURL) != "" {
		avatar := strings.TrimSpace(initUser.PhotoURL)
		avatarURL = &avatar
	}

	user, err := s.userRepo.GetByMaxUserID(initUser.ID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get user: %w", err)
	}

	now := time.Now()

	if user == nil {
		user = &entity.User{
			ID:        uuid.New().String(),
			Name:      displayName,
			AvatarURL: avatarURL,
			MaxUserID: initUser.ID,
			CreatedAt: now,
			UpdatedAt: now,
		}

		if err := s.userRepo.Create(user); err != nil {
			return nil, nil, fmt.Errorf("failed to create user: %w", err)
		}
	} else {
		needsUpdate := false

		if user.Name != displayName {
			user.Name = displayName
			needsUpdate = true
		}

		if !equalPointers(user.AvatarURL, avatarURL) {
			user.AvatarURL = avatarURL
			needsUpdate = true
		}

		if needsUpdate {
			user.UpdatedAt = now
			if err := s.userRepo.Update(user); err != nil {
				return nil, nil, fmt.Errorf("failed to update user: %w", err)
			}
		}
	}

	// Генерируем токены
	accessToken, err := s.tokenManager.GenerateAccessToken(user.ID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate access token: %w", err)
	}

	refreshToken, err := s.tokenManager.GenerateRefreshToken(user.ID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	accessTTL := s.tokenManager.AccessTTL()

	tokens := &entity.AuthTokens{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    time.Now().Add(accessTTL),
	}

	return tokens, user, nil
}

type maxInitDataUser struct {
	ID        int64  `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Username  string `json:"username"`
	PhotoURL  string `json:"photo_url"`
}

func validateInitData(initData, botToken string) (map[string]string, error) {
	if strings.TrimSpace(initData) == "" {
		return nil, fmt.Errorf("init data is empty")
	}

	if strings.TrimSpace(botToken) == "" {
		return nil, fmt.Errorf("bot token is not configured")
	}

	values, err := url.ParseQuery(initData)
	if err != nil {
		return nil, fmt.Errorf("unable to parse init data: %w", err)
	}

	hash := values.Get("hash")
	if strings.TrimSpace(hash) == "" {
		return nil, fmt.Errorf("init data missing hash")
	}
	values.Del("hash")

	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	var sb strings.Builder
	for i, key := range keys {
		sb.WriteString(key)
		sb.WriteByte('=')
		sb.WriteString(values.Get(key))
		if i < len(keys)-1 {
			sb.WriteByte('\n')
		}
	}

	secretKey := sha256.Sum256([]byte(botToken))
	mac := hmac.New(sha256.New, secretKey[:])
	mac.Write([]byte(sb.String()))
	expectedHash := mac.Sum(nil)

	providedHash, err := hex.DecodeString(hash)
	if err != nil {
		return nil, fmt.Errorf("invalid hash format: %w", err)
	}

	if !hmac.Equal(expectedHash, providedHash) {
		return nil, fmt.Errorf("init data hash mismatch")
	}

	result := make(map[string]string, len(keys))
	for _, key := range keys {
		result[key] = values.Get(key)
	}

	return result, nil
}

func (s *AuthService) RefreshToken(refreshToken string) (*entity.AuthTokens, error) {
	claims, err := s.tokenManager.ValidateToken(refreshToken)
	if err != nil {
		return nil, fmt.Errorf("invalid refresh token: %w", err)
	}

	// Проверяем, существует ли пользователь
	_, err = s.userRepo.GetByID(claims.UserID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// Генерируем новые токены
	accessToken, err := s.tokenManager.GenerateAccessToken(claims.UserID)
	if err != nil {
		return nil, fmt.Errorf("failed to generate access token: %w", err)
	}

	newRefreshToken, err := s.tokenManager.GenerateRefreshToken(claims.UserID)
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	accessTTL := s.tokenManager.AccessTTL()

	tokens := &entity.AuthTokens{
		AccessToken:  accessToken,
		RefreshToken: newRefreshToken,
		ExpiresAt:    time.Now().Add(accessTTL),
	}

	return tokens, nil
}

func (s *AuthService) ValidateToken(token string) (string, error) {
	claims, err := s.tokenManager.ValidateToken(token)
	if err != nil {
		return "", fmt.Errorf("invalid token: %w", err)
	}

	return claims.UserID, nil
}

func (s *AuthService) Logout(userID string) error {
	// В реальности можно добавить blacklist токенов
	// Пока просто возвращаем успех
	return nil
}

func equalPointers(a, b *string) bool {
	if a == nil && b == nil {
		return true
	}
	if a == nil || b == nil {
		return false
	}
	return *a == *b
}
