package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/ps/backend/config"
	"github.com/ps/backend/internal/crypto"
	"github.com/ps/backend/internal/model"
	"github.com/ps/backend/internal/repo"
	"github.com/ps/backend/internal/token"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrBadCredentials = errors.New("invalid credentials")
	ErrUserBanned     = errors.New("user is banned")
	ErrEmailTaken     = errors.New("email already registered")
	ErrUsernameTaken  = errors.New("username already taken")
)

type AuthService struct {
	users *repo.UserRepo
	cfg   *config.Config
}

func NewAuthService(users *repo.UserRepo, cfg *config.Config) *AuthService {
	return &AuthService{users: users, cfg: cfg}
}

type TokenPair struct {
	AccessToken  string
	RefreshToken string
	ExpiresAt    time.Time
}

func (s *AuthService) Register(ctx context.Context, schema, username, email, password, ip string) (*model.User, error) {
	existing, _ := s.users.FindByEmail(ctx, schema, email)
	if existing != nil {
		return nil, ErrEmailTaken
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	return s.users.Create(ctx, schema, username, email, string(hash), ip)
}

func (s *AuthService) Login(ctx context.Context, schema, tenantID, email, password, ip string) (*TokenPair, error) {
	user, err := s.users.FindByEmail(ctx, schema, email)
	if err != nil {
		return nil, ErrBadCredentials
	}
	if user.Role == model.RoleBanned {
		return nil, ErrUserBanned
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, ErrBadCredentials
	}

	go s.users.UpdateLastSeen(context.Background(), schema, user.ID, ip)

	return s.issueTokens(user.ID, tenantID, string(user.Role))
}

func (s *AuthService) Refresh(ctx context.Context, rawRefresh, tenantID string) (*TokenPair, error) {
	claims, err := token.Verify(rawRefresh, s.cfg.JWTRefreshSecret)
	if err != nil {
		return nil, ErrBadCredentials
	}
	if claims.Type != "refresh" {
		return nil, ErrBadCredentials
	}

	return s.issueTokens(claims.UserID, tenantID, claims.Role)
}

// GetUserByID возвращает пользователя по ID из БД
func (s *AuthService) GetUserByID(ctx context.Context, schema, userID string) (*model.User, error) {
	return s.users.FindByID(ctx, schema, userID)
}

func (s *AuthService) issueTokens(userID, tenantID, role string) (*TokenPair, error) {
	access, err := token.SignAccess(userID, tenantID, role, s.cfg.JWTAccessTTL, s.cfg.JWTAccessSecret)
	if err != nil {
		return nil, fmt.Errorf("sign access: %w", err)
	}

	refresh, err := token.SignRefresh(userID, tenantID, role, s.cfg.JWTRefreshTTL, s.cfg.JWTRefreshSecret)
	if err != nil {
		return nil, fmt.Errorf("sign refresh: %w", err)
	}

	_ = crypto.HashSHA256Hex([]byte(refresh))

	return &TokenPair{
		AccessToken:  access,
		RefreshToken: refresh,
		ExpiresAt:    time.Now().Add(s.cfg.JWTAccessTTL),
	}, nil
}
