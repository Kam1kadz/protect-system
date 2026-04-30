package service

import (
	"context"

	"github.com/ps/backend/config"
	"github.com/ps/backend/internal/crypto"
	"github.com/ps/backend/internal/repo"
)

type RuntimeService struct {
	rt      *repo.RuntimeRepo
	users   *repo.UserRepo
	lic     *repo.LicenseRepo
	cfg     *config.Config
}

func NewRuntimeService(
	rt *repo.RuntimeRepo,
	users *repo.UserRepo,
	lic *repo.LicenseRepo,
	cfg *config.Config,
) *RuntimeService {
	return &RuntimeService{rt: rt, users: users, lic: lic, cfg: cfg}
}

type RuntimeUserInfo struct {
	Username        string `json:"username"`
	PlanName        string `json:"plan_name"`
	PlanDisplayName string `json:"plan_display_name"`
	Role            string `json:"role"`
	MCVersion       string `json:"mc_version,omitempty"`
}

func (s *RuntimeService) Init(ctx context.Context, schema, sessionToken, hwid, launcherToken, integrityProof string) error {
	tokenHash := crypto.HashSHA256Hex([]byte(sessionToken))
	_, err := s.rt.GetSessionFull(ctx, schema, tokenHash)
	return err
}

func (s *RuntimeService) Heartbeat(ctx context.Context, schema, sessionToken string) error {
	tokenHash := crypto.HashSHA256Hex([]byte(sessionToken))
	sf, err := s.rt.GetSessionFull(ctx, schema, tokenHash)
	if err != nil {
		return ErrSessionNotFound
	}
	return s.rt.TouchHeartbeat(ctx, schema, sf.SessionID)
}

func (s *RuntimeService) GetUser(ctx context.Context, schema, sessionToken string) (*RuntimeUserInfo, error) {
	tokenHash := crypto.HashSHA256Hex([]byte(sessionToken))
	sf, err := s.rt.GetSessionFull(ctx, schema, tokenHash)
	if err != nil {
		return nil, ErrSessionNotFound
	}

	info := &RuntimeUserInfo{
		Username:        sf.Username,
		PlanName:        sf.PlanName,
		PlanDisplayName: sf.PlanDisplayName,
		Role:            sf.Role,
	}
	if sf.MCVersion != nil {
		info.MCVersion = *sf.MCVersion
	}
	return info, nil
}

func (s *RuntimeService) ReportEvent(ctx context.Context, schema, sessionToken, eventType, ip string, payload map[string]any) error {
	tokenHash := crypto.HashSHA256Hex([]byte(sessionToken))
	sf, err := s.rt.GetSessionFull(ctx, schema, tokenHash)
	if err != nil {
		return ErrSessionNotFound
	}

	return s.rt.StoreEvent(ctx, schema, &repo.RuntimeEventCreate{
		SessionID: &sf.SessionID,
		UserID:    &sf.UserID,
		EventType: eventType,
		Severity:  "warn",
		Payload:   payload,
		IPAddress: &ip,
	})
}

func (s *RuntimeService) Terminate(ctx context.Context, schema, sessionToken string) error {
	tokenHash := crypto.HashSHA256Hex([]byte(sessionToken))
	sf, err := s.rt.GetSessionFull(ctx, schema, tokenHash)
	if err != nil {
		return nil // сессии нет — ничего делать не нужно
	}
	return s.rt.BanSession(ctx, schema, sf.SessionID)
}
