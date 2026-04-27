package token

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID   string `json:"uid"`
	TenantID string `json:"tid"`
	Role     string `json:"rol"`
	Type     string `json:"typ"`
	jwt.RegisteredClaims
}

var (
	ErrInvalidToken = errors.New("invalid token")
	ErrExpiredToken  = errors.New("expired token")
)

func SignAccess(userID, tenantID, role string, ttl time.Duration, secret []byte) (string, error) {
	return sign(userID, tenantID, role, "access", ttl, secret)
}

func SignRefresh(userID, tenantID, role string, ttl time.Duration, secret []byte) (string, error) {
	return sign(userID, tenantID, role, "refresh", ttl, secret)
}

func sign(userID, tenantID, role, typ string, ttl time.Duration, secret []byte) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID:   userID,
		TenantID: tenantID,
		Role:     role,
		Type:     typ,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(secret)
}

func Verify(raw string, secret []byte) (*Claims, error) {
	t, err := jwt.ParseWithClaims(raw, &Claims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return secret, nil
	})
	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrExpiredToken
		}
		return nil, ErrInvalidToken
	}
	c, ok := t.Claims.(*Claims)
	if !ok || !t.Valid {
		return nil, ErrInvalidToken
	}
	return c, nil
}