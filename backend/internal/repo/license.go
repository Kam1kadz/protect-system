package repo

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ps/backend/internal/model"
)

type LicenseRepo struct {
	db *pgxpool.Pool
}

func NewLicenseRepo(db *pgxpool.Pool) *LicenseRepo {
	return &LicenseRepo{db: db}
}

type LicenseCreate struct {
	UserID     string
	PlanID     string
	TierID     *string
	LicenseKey string
	SecretKey  string
	ExpiresAt  time.Time
}

func (r *LicenseRepo) Create(ctx context.Context, schema string, lc *LicenseCreate) (*model.License, error) {
	s, err := safeSchema(schema)
	if err != nil {
		return nil, err
	}
	q := fmt.Sprintf(
		`INSERT INTO %s.licenses
		   (user_id, plan_id, tier_id, license_key, secret_key, expires_at)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, user_id, plan_id, tier_id, hwid_snapshot,
		           status, expires_at, paused_at, pause_reason,
		           ban_reason, license_key, secret_key, created_at`,
		s,
	)
	row := r.db.QueryRow(ctx, q,
		lc.UserID, lc.PlanID, lc.TierID, lc.LicenseKey, lc.SecretKey, lc.ExpiresAt,
	)
	return scanLicense(row)
}

func (r *LicenseRepo) FindByKey(ctx context.Context, schema, licenseKey string) (*model.License, error) {
	s, err := safeSchema(schema)
	if err != nil {
		return nil, err
	}
	q := fmt.Sprintf(
		`SELECT id, user_id, plan_id, tier_id, hwid_snapshot,
		        status, expires_at, paused_at, pause_reason,
		        ban_reason, license_key, secret_key, created_at
		 FROM %s.licenses WHERE license_key = $1`,
		s,
	)
	row := r.db.QueryRow(ctx, q, licenseKey)
	return scanLicense(row)
}

func (r *LicenseRepo) FindPlan(ctx context.Context, schema, planID string) (*model.SubscriptionPlan, error) {
	s, err := safeSchema(schema)
	if err != nil {
		return nil, err
	}
	q := fmt.Sprintf(
		`SELECT id, name, display_name, jar_storage_key,
		        is_active, sort_order, created_at, updated_at
		 FROM %s.subscription_plans WHERE id = $1`,
		s,
	)
	row := r.db.QueryRow(ctx, q, planID)
	return scanPlan(row)
}

func (r *LicenseRepo) SetHWID(ctx context.Context, schema, licenseID, hwid string) error {
	s, err := safeSchema(schema)
	if err != nil {
		return err
	}
	q := fmt.Sprintf(
		`UPDATE %s.licenses SET hwid_snapshot = $1 WHERE id = $2`,
		s,
	)
	_, err = r.db.Exec(ctx, q, hwid, licenseID)
	return err
}

func (r *LicenseRepo) SetStatus(ctx context.Context, schema, licenseID string, status model.LicenseStatus, reason *string) error {
	s, err := safeSchema(schema)
	if err != nil {
		return err
	}
	q := fmt.Sprintf(
		`UPDATE %s.licenses SET status = $1, ban_reason = $2 WHERE id = $3`,
		s,
	)
	_, err = r.db.Exec(ctx, q, status, reason, licenseID)
	return err
}

func scanLicense(row pgx.Row) (*model.License, error) {
	var l model.License
	err := row.Scan(
		&l.ID, &l.UserID, &l.PlanID, &l.TierID, &l.HWIDSnapshot,
		&l.Status, &l.ExpiresAt, &l.PausedAt, &l.PauseReason,
		&l.BanReason, &l.LicenseKey, &l.SecretKey, &l.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("scan license: %w", err)
	}
	return &l, nil
}

func scanPlan(row pgx.Row) (*model.SubscriptionPlan, error) {
	var p model.SubscriptionPlan
	err := row.Scan(
		&p.ID, &p.Name, &p.DisplayName, &p.JarStorageKey,
		&p.IsActive, &p.SortOrder, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("scan plan: %w", err)
	}
	return &p, nil
}