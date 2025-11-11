package interfaces

import (
	"github.com/rnegic/synchronous/internal/entity"
)

type AuthService interface {
	Login(initData, deviceID string) (*entity.AuthTokens, *entity.User, error)
	RefreshToken(refreshToken string) (*entity.AuthTokens, error)
	ValidateToken(token string) (string, error) // возвращает userID
	Logout(userID string) error
}
