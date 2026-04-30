package repo

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type SessionFull struct {
	SessionID       string
	UserID          string
	LicenseID       string
	HWID            string
	IsRevoked       bool
	SessionExpiry   time.Time
	MCVersion       *string
	Username        string
	Role            string
	PlanID          string
	LicenseExpiry   time.Time
	LicenseStatus   string
	PlanName        string
	PlanDisplayName string
}

type RuntimeEventCreate struct {
	SessionID *string
	UserID    *string
	EventType string
	Severity  string
	Payload   map[string]any
	IPAddress *string
}

type RuntimeRepo struct {
	db *pgxpool.Pool
}

func NewRuntimeRepo(db *pgxpool.Pool) *RuntimeRepo {
	return &RuntimeRepo{db: db}
}

func (r *RuntimeRepo) GetSessionFull(ctx context.Context, schema, tokenHash string) (*SessionFull, error) {
	s, err := safeSchema(schema)
	if err != nil {
		return nil, err
	}
	q := fmt.Sprintf(
		`SELECT
		     se.id, se.user_id, se.license_id, se.hwid,
		     se.is_revoked, se.expires_at, se.minecraft_version,
		     u.username, u.role,
		     l.plan_id, l.expires_at AS license_expires_at, l.status AS license_status,
		     sp.name AS plan_name, sp.display_name AS plan_display_name
		 FROM %s.sessions se
		 JOIN %s.users u              ON u.id  = se.user_id
		 JOIN %s.licenses l           ON l.id  = se.license_id
		 JOIN %s.subscription_plans sp ON sp.id = l.plan_id
		 WHERE se.token_hash = $1
		   AND se.is_revoked = false
		   AND se.expires_at > NOW()`,
		s, s, s, s,
	)
	row := r.db.QueryRow(ctx, q, tokenHash)

	var sf SessionFull
	err = row.Scan(
		&sf.SessionID, &sf.UserID, &sf.LicenseID, &sf.HWID,
		&sf.IsRevoked, &sf.SessionExpiry, &sf.MCVersion,
		&sf.Username, &sf.Role,
		&sf.PlanID, &sf.LicenseExpiry, &sf.LicenseStatus,
		&sf.PlanName, &sf.PlanDisplayName,
	)
	if err != nil {
		return nil, fmt.Errorf("session full: %w", err)
	}
	return &sf, nil
}

func (r *RuntimeRepo) GetManifestHash(ctx context.Context, schema, planID, mcVersion string) (string, error) {
	s, err := safeSchema(schema)
	if err != nil {
		return "", err
	}
	q := fmt.Sprintf(
		`SELECT manifest_hash FROM %s.plan_integrity
		 WHERE plan_id = $1 AND mc_version = $2`,
		s,
	)
	var h string
	if err := r.db.QueryRow(ctx, q, planID, mcVersion).Scan(&h); err != nil {
		return "", fmt.Errorf("manifest hash: %w", err)
	}
	return h, nil
}

func (r *RuntimeRepo) StoreEvent(ctx context.Context, schema string, ev *RuntimeEventCreate) error {
	s, err := safeSchema(schema)
	if err != nil {
		return err
	}
	raw, err := json.Marshal(ev.Payload)
	if err != nil {
		return err
	}
	q := fmt.Sprintf(
		`INSERT INTO %s.runtime_events
		   (session_id, user_id, event_type, severity, payload, ip_address)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		s,
	)
	_, err = r.db.Exec(ctx, q,
		ev.SessionID, ev.UserID, ev.EventType,
		ev.Severity, raw, ev.IPAddress,
	)
	return err
}

func (r *RuntimeRepo) BanSession(ctx context.Context, schema, sessionID string) error {
	s, err := safeSchema(schema)
	if err != nil {
		return err
	}
	q := fmt.Sprintf(
		`UPDATE %s.sessions SET is_revoked = true WHERE id = $1`,
		s,
	)
	_, err = r.db.Exec(ctx, q, sessionID)
	return err
}

func (r *RuntimeRepo) TouchHeartbeat(ctx context.Context, schema, sessionID string) error {
	s, err := safeSchema(schema)
	if err != nil {
		return err
	}
	q := fmt.Sprintf(
		`UPDATE %s.sessions SET last_heartbeat_at = NOW() WHERE id = $1`,
		s,
	)
	_, err = r.db.Exec(ctx, q, sessionID)
	return err
}