package repo

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ps/backend/internal/model"
)

type TenantRepo struct {
	db *pgxpool.Pool
}

func NewTenantRepo(db *pgxpool.Pool) *TenantRepo {
	return &TenantRepo{db: db}
}

func (r *TenantRepo) ListAll(ctx context.Context) ([]*model.Tenant, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, slug, display_name, owner_email, signing_key_enc,
		        cert_pin, status, custom_domain, created_at, updated_at
		 FROM public.tenants ORDER BY created_at DESC`,
	)
	if err != nil {
		return nil, fmt.Errorf("list tenants: %w", err)
	}
	defer rows.Close()

	var tenants []*model.Tenant
	for rows.Next() {
		var t model.Tenant
		if err := rows.Scan(
			&t.ID, &t.Slug, &t.DisplayName, &t.OwnerEmail,
			&t.SigningKeyEnc, &t.CertPin, &t.Status,
			&t.CustomDomain, &t.CreatedAt, &t.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan tenant: %w", err)
		}
		tenants = append(tenants, &t)
	}
	return tenants, rows.Err()
}

func (r *TenantRepo) Delete(ctx context.Context, slug string) error {
	_, err := r.db.Exec(ctx,
		`DELETE FROM public.tenants WHERE slug = $1`, slug,
	)
	if err != nil {
		return fmt.Errorf("delete tenant: %w", err)
	}
	return nil
}

func (r *TenantRepo) FindBySlug(ctx context.Context, slug string) (*model.Tenant, error) {
	row := r.db.QueryRow(ctx,
		`SELECT id, slug, display_name, owner_email, signing_key_enc,
		        cert_pin, status, custom_domain, created_at, updated_at
		 FROM public.tenants WHERE slug = $1 AND status = 'active'`,
		slug,
	)
	t, err := scanTenant(row)
	if err != nil {
		return nil, fmt.Errorf("tenant by slug: %w", err)
	}
	return t, nil
}

func (r *TenantRepo) FindByDomain(ctx context.Context, domain string) (*model.Tenant, error) {
	row := r.db.QueryRow(ctx,
		`SELECT id, slug, display_name, owner_email, signing_key_enc,
		        cert_pin, status, custom_domain, created_at, updated_at
		 FROM public.tenants WHERE custom_domain = $1 AND status = 'active'`,
		domain,
	)
	t, err := scanTenant(row)
	if err != nil {
		return nil, fmt.Errorf("tenant by domain: %w", err)
	}
	return t, nil
}

func (r *TenantRepo) FindByID(ctx context.Context, id string) (*model.Tenant, error) {
	row := r.db.QueryRow(ctx,
		`SELECT id, slug, display_name, owner_email, signing_key_enc,
		        cert_pin, status, custom_domain, created_at, updated_at
		 FROM public.tenants WHERE id = $1`,
		id,
	)
	t, err := scanTenant(row)
	if err != nil {
		return nil, fmt.Errorf("tenant by id: %w", err)
	}
	return t, nil
}

func (r *TenantRepo) Create(ctx context.Context,
	slug, displayName, ownerEmail, signingKeyEnc, certPin string,
) (*model.Tenant, error) {
	row := r.db.QueryRow(ctx,
		`INSERT INTO public.tenants
		   (slug, display_name, owner_email, signing_key_enc, cert_pin)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, slug, display_name, owner_email, signing_key_enc,
		           cert_pin, status, custom_domain, created_at, updated_at`,
		slug, displayName, ownerEmail, signingKeyEnc, certPin,
	)
	t, err := scanTenant(row)
	if err != nil {
		return nil, fmt.Errorf("create tenant: %w", err)
	}
	return t, nil
}

func (r *TenantRepo) SetStatus(ctx context.Context, id string, status model.TenantStatus) error {
	_, err := r.db.Exec(ctx,
		`UPDATE public.tenants SET status = $1, updated_at = NOW() WHERE id = $2`,
		status, id,
	)
	return err
}

func scanTenant(row pgx.Row) (*model.Tenant, error) {
	var t model.Tenant
	err := row.Scan(
		&t.ID, &t.Slug, &t.DisplayName, &t.OwnerEmail,
		&t.SigningKeyEnc, &t.CertPin, &t.Status,
		&t.CustomDomain, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &t, nil
}
