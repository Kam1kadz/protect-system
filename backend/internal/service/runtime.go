package service

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ps/backend/internal/crypto"
	"github.com/ps/backend/internal/repo"
)

type RuntimeService struct {
	db    *pgxpool.Pool
	users *repo.UserRepo
}

func NewRuntimeService(db *pgxpool.Pool, users *repo.UserRepo) *RuntimeService {
	return &RuntimeService{db: db, users: users}
}

type RuntimeUserInfo struct {
	Username string `json:"username"`
	PlanName string `json:"plan_name"`
	Role     string `json:"role"`
}

func (s *RuntimeService) Init(ctx context.Context, schema, sessionToken, hwid, launcherToken, integrityProof string) error {
	// Validate session exists
	tokenHash := crypto.HashSHA256Hex([]byte(sessionToken))
	_, err := s.users.FindSession(ctx, schema, tokenHash)
	return err
}

func (s *RuntimeService) Heartbeat(ctx context.Context, schema, sessionToken string) error {
	tokenHash := crypto.HashSHA256Hex([]byte(sessionToken))
	sess, err := s.users.FindSession(ctx, schema, tokenHash)
	if err != nil {
		return ErrSessionNotFound
	}
	return s.users.HeartbeatSession(ctx, schema, sess.ID)
}

func (s *RuntimeService) GetUser(ctx context.Context, schema, sessionToken string) (*RuntimeUserInfo, error) {
	tokenHash := crypto.HashSHA256Hex([]byte(sessionToken))
	sess, err := s.users.FindSession(ctx, schema, tokenHash)
	if err != nil {
		return nil, ErrSessionNotFound
	}

	user, err := s.users.FindByID(ctx, schema, sess.UserID)
	if err != nil {
		return nil, fmt.Errorf("load user: %w", err)
	}

	sc, _ := safeSchemaName(schema)
	var planName string
	_ = s.db.QueryRow(ctx, fmt.Sprintf(
		`SELECT sp.display_name FROM %s.licenses l
		 JOIN %s.subscription_plans sp ON sp.id = l.plan_id
		 WHERE l.id = $1 LIMIT 1`, sc, sc),
		sess.LicenseID,
	).Scan(&planName)

	return &RuntimeUserInfo{
		Username: user.Username,
		PlanName: planName,
		Role:     string(user.Role),
	}, nil
}

func (s *RuntimeService) ReportEvent(ctx context.Context, schema, sessionToken, eventType, ip string, payload map[string]any) error {
	tokenHash := crypto.HashSHA256Hex([]byte(sessionToken))
	sess, err := s.users.FindSession(ctx, schema, tokenHash)
	if err != nil {
		return ErrSessionNotFound
	}

	data, _ := json.Marshal(payload)
	sc, _ := safeSchemaName(schema)
	_, err = s.db.Exec(ctx, fmt.Sprintf(
		`INSERT INTO %s.runtime_events (user_id, event_type, severity, payload, ip_address)
		 VALUES ($1, $2, 'warn', $3, $4)`, sc),
		sess.UserID, eventType, data, ip)
	return err
}

func (s *RuntimeService) Terminate(ctx context.Context, schema, sessionToken string) error {
	tokenHash := crypto.HashSHA256Hex([]byte(sessionToken))
	return s.users.RevokeSession(ctx, schema, tokenHash)
}

func safeSchemaName(schema string) (string, error) {
	return safeSchemaValidate(schema)
}
