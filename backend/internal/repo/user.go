package repo

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ps/backend/internal/model"
)

type UserRepo struct {
	db *pgxpool.Pool
}

func NewUserRepo(db *pgxpool.Pool) *UserRepo {
	return &UserRepo{db: db}
}

func (r *UserRepo) Create(ctx context.Context, schema, username, email, passwordHash, ip string) (*model.User, error) {
	s, err := safeSchema(schema)
	if err != nil {
		return nil, err
	}
	q := fmt.Sprintf(
		`INSERT INTO %s.users (username, email, password_hash, ip_registered, ip_last)
		 VALUES ($1, $2, $3, $4, $4)
		 RETURNING id, username, email, password_hash, role,
		           hwid, hwid_locked_at, ip_registered, ip_last, last_seen_at, created_at`,
		s,
	)
	row := r.db.QueryRow(ctx, q, username, email, passwordHash, ip)
	return scanUser(row)
}

func (r *UserRepo) FindByEmail(ctx context.Context, schema, email string) (*model.User, error) {
	s, err := safeSchema(schema)
	if err != nil {
		return nil, err
	}
	q := fmt.Sprintf(
		`SELECT id, username, email, password_hash, role,
		        hwid, hwid_locked_at, ip_registered, ip_last, last_seen_at, created_at
		 FROM %s.users WHERE email = $1`,
		s,
	)
	row := r.db.QueryRow(ctx, q, email)
	return scanUser(row)
}

func (r *UserRepo) FindByID(ctx context.Context, schema, id string) (*model.User, error) {
	s, err := safeSchema(schema)
	if err != nil {
		return nil, err
	}
	q := fmt.Sprintf(
		`SELECT id, username, email, password_hash, role,
		        hwid, hwid_locked_at, ip_registered, ip_last, last_seen_at, created_at
		 FROM %s.users WHERE id = $1`,
		s,
	)
	row := r.db.QueryRow(ctx, q, id)
	return scanUser(row)
}

func (r *UserRepo) UpdateLastSeen(ctx context.Context, schema, id, ip string) error {
	s, err := safeSchema(schema)
	if err != nil {
		return err
	}
	q := fmt.Sprintf(
		`UPDATE %s.users SET last_seen_at = NOW(), ip_last = $1 WHERE id = $2`,
		s,
	)
	_, err = r.db.Exec(ctx, q, ip, id)
	return err
}

func (r *UserRepo) GetActiveLicense(ctx context.Context, schema, userID string) (*model.License, error) {
	s, err := safeSchema(schema)
	if err != nil {
		return nil, err
	}
	q := fmt.Sprintf(
		`SELECT id, user_id, plan_id, tier_id, hwid_snapshot,
		        status, expires_at, paused_at, pause_reason, ban_reason, created_at
		 FROM %s.licenses
		 WHERE user_id = $1 AND status = 'active' AND expires_at > NOW()
		 ORDER BY expires_at DESC LIMIT 1`,
		s,
	)
	row := r.db.QueryRow(ctx, q, userID)
	return scanLicense(row)
}

func (r *UserRepo) CreateSession(ctx context.Context, schema string, s *model.Session) error {
	sc, err := safeSchema(schema)
	if err != nil {
		return err
	}
	q := fmt.Sprintf(
		`INSERT INTO %s.sessions
		   (user_id, license_id, token_hash, hwid, ip_address,
		    loader_version, minecraft_version, expires_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		sc,
	)
	_, err = r.db.Exec(ctx, q,
		s.UserID, s.LicenseID, s.TokenHash, s.HWID, s.IPAddress,
		s.LoaderVersion, s.MinecraftVersion, s.ExpiresAt,
	)
	return err
}

func (r *UserRepo) FindSession(ctx context.Context, schema, tokenHash string) (*model.Session, error) {
	s, err := safeSchema(schema)
	if err != nil {
		return nil, err
	}
	q := fmt.Sprintf(
		`SELECT id, user_id, license_id, token_hash, hwid, ip_address,
		        loader_version, minecraft_version, last_heartbeat_at,
		        expires_at, is_revoked, created_at
		 FROM %s.sessions
		 WHERE token_hash = $1 AND is_revoked = false AND expires_at > NOW()`,
		s,
	)
	row := r.db.QueryRow(ctx, q, tokenHash)
	return scanSession(row)
}

func (r *UserRepo) RevokeAllSessions(ctx context.Context, schema, userID string) error {
	s, err := safeSchema(schema)
	if err != nil {
		return err
	}
	q := fmt.Sprintf(
		`UPDATE %s.sessions SET is_revoked = true WHERE user_id = $1`,
		s,
	)
	_, err = r.db.Exec(ctx, q, userID)
	return err
}

func (r *UserRepo) StoreRefreshToken(ctx context.Context, schema, userID, tokenHash string, exp time.Time) error {
	s, err := safeSchema(schema)
	if err != nil {
		return err
	}
	q := fmt.Sprintf(
		`INSERT INTO %s.sessions
		   (user_id, license_id, token_hash, hwid, ip_address, expires_at)
		 VALUES ($1, '00000000-0000-0000-0000-000000000000', $2, '', '', $3)
		 ON CONFLICT (token_hash) DO NOTHING`,
		s,
	)
	_, err = r.db.Exec(ctx, q, userID, tokenHash, exp)
	return err
}

func scanUser(row pgx.Row) (*model.User, error) {
	var u model.User
	err := row.Scan(
		&u.ID, &u.Username, &u.Email, &u.PasswordHash, &u.Role,
		&u.HWID, &u.HWIDLockedAt, &u.IPRegistered, &u.IPLast,
		&u.LastSeenAt, &u.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("scan user: %w", err)
	}
	return &u, nil
}

func scanSession(row pgx.Row) (*model.Session, error) {
	var s model.Session
	err := row.Scan(
		&s.ID, &s.UserID, &s.LicenseID, &s.TokenHash, &s.HWID,
		&s.IPAddress, &s.LoaderVersion, &s.MinecraftVersion,
		&s.LastHeartbeatAt, &s.ExpiresAt, &s.IsRevoked, &s.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("scan session: %w", err)
	}
	return &s, nil
}

func (r *UserRepo) HeartbeatSession(ctx context.Context, schema, sessionID string) error {
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

func (r *UserRepo) RevokeSession(ctx context.Context, schema, tokenHash string) error {
	s, err := safeSchema(schema)
	if err != nil {
		return err
	}
	q := fmt.Sprintf(
		`UPDATE %s.sessions SET is_revoked = true WHERE token_hash = $1`,
		s,
	)
	_, err = r.db.Exec(ctx, q, tokenHash)
	return err
}
