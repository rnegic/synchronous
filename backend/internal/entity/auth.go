package entity

import "time"

type AuthTokens struct {
	AccessToken  string    `json:"accessToken"`
	RefreshToken string    `json:"refreshToken"`
	ExpiresAt    time.Time `json:"expiresAt"`
}

type MaxAuthRequest struct {
	InitData string `json:"initData"`
	DeviceID string `json:"deviceId"`
}
