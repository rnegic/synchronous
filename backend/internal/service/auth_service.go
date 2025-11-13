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

	fmt.Printf("[Auth Service] 📥 Login attempt\n")
	fmt.Printf("[Auth Service]   initData length: %d\n", len(initData))
	fmt.Printf("[Auth Service]   initData preview: %.100s...\n", initData)

	payload, err := validateInitData(initData, s.botToken)
	if err != nil {
		fmt.Printf("[Auth Service] ❌ Validation failed: %v\n", err)
		return nil, nil, fmt.Errorf("failed to validate init data: %w", err)
	}

	fmt.Printf("[Auth Service] ✅ Validation successful\n")

	startParam := payload["start_param"]
	if startParam != "" {
		fmt.Printf("[Auth Service] 📎 Found start_param: %s\n", startParam)
	}

	userJSON, ok := payload["user"]
	if !ok || strings.TrimSpace(userJSON) == "" {
		fmt.Printf("[Auth Service] ❌ Missing user payload\n")
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
	fmt.Printf("[Validation] 🔍 Starting validation\n")

	if strings.TrimSpace(initData) == "" {
		fmt.Printf("[Validation] ❌ initData is empty\n")
		return nil, fmt.Errorf("init data is empty")
	}

	if strings.TrimSpace(botToken) == "" {
		fmt.Printf("[Validation] ❌ botToken is not configured\n")
		return nil, fmt.Errorf("bot token is not configured")
	}

	// URL-decode initData if needed
	decodedInitData, err := url.QueryUnescape(initData)
	if err != nil {
		decodedInitData = initData
	}
	fmt.Printf("[Validation] 📝 Decoded initData: %.100s...\n", decodedInitData)

	values, err := url.ParseQuery(decodedInitData)
	if err != nil {
		fmt.Printf("[Validation] ❌ Failed to parse query: %v\n", err)
		return nil, fmt.Errorf("unable to parse init data: %w", err)
	}

	hash := values.Get("hash")
	if strings.TrimSpace(hash) == "" {
		fmt.Printf("[Validation] ❌ hash is missing\n")
		return nil, fmt.Errorf("init data missing hash")
	}
	fmt.Printf("[Validation] 🔑 Extracted hash: %s\n", hash)
	values.Del("hash")

	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	fmt.Printf("[Validation] 📋 Sorted keys: %v\n", keys)

	var sb strings.Builder
	for i, key := range keys {
		sb.WriteString(key)
		sb.WriteByte('=')
		sb.WriteString(values.Get(key))
		if i < len(keys)-1 {
			sb.WriteByte('\n')
		}
	}
	dataCheckString := sb.String()
	fmt.Printf("[Validation] 📄 data_check_string (first 200 chars): %.200s\n", dataCheckString)

	// 1. Создаем secret_key = HMAC_SHA256("WebAppData", botToken)
	secretKeyMac := hmac.New(sha256.New, []byte("WebAppData"))
	secretKeyMac.Write([]byte(botToken))
	secretKey := secretKeyMac.Sum(nil)
	fmt.Printf("[Validation] 🔐 secret_key: %x\n", secretKey)

	// 2. Вычисляем hash = HMAC_SHA256(secret_key, data_check_string)
	mac := hmac.New(sha256.New, secretKey)
	mac.Write([]byte(dataCheckString))
	expectedHash := mac.Sum(nil)
	fmt.Printf("[Validation] 🎯 expected_hash: %x\n", expectedHash)

	providedHash, err := hex.DecodeString(hash)
	if err != nil {
		fmt.Printf("[Validation] ❌ Invalid hash format: %v\n", err)
		return nil, fmt.Errorf("invalid hash format: %w", err)
	}
	fmt.Printf("[Validation] 📨 provided_hash: %x\n", providedHash)

	if !hmac.Equal(expectedHash, providedHash) {
		fmt.Printf("[Validation] ❌ Hash mismatch!\n")
		return nil, fmt.Errorf("init data hash mismatch")
	}

	fmt.Printf("[Validation] ✅ Validation successful!\n")

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
