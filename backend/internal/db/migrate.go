package db

import (
	"embed"
	"errors"
	"fmt"
	"strings"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	"github.com/golang-migrate/migrate/v4/source/iofs"
)

//go:embed migrations/public/*.sql
var publicFS embed.FS

// normDSN strips any existing scheme and prepends pgx5://
func normDSN(dsn string) string {
	for _, prefix := range []string{"postgres://", "postgresql://", "pgx://", "pgx5://"} {
		if strings.HasPrefix(dsn, prefix) {
			dsn = strings.TrimPrefix(dsn, prefix)
			break
		}
	}
	return "pgx5://" + dsn
}

func RunPublicMigrations(dsn string) error {
	src, err := iofs.New(publicFS, "migrations/public")
	if err != nil {
		return fmt.Errorf("migrations source: %w", err)
	}

	m, err := migrate.NewWithSourceInstance("iofs", src, normDSN(dsn))
	if err != nil {
		return fmt.Errorf("migrate init: %w", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return fmt.Errorf("migrate up: %w", err)
	}

	return nil
}

func RunTenantMigrations(dsn, slug string) error {
	// Validate slug to prevent SQL injection
	for _, c := range slug {
		if !((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '_') {
			return fmt.Errorf("invalid tenant slug: %s", slug)
		}
	}

	// Add search_path and options to DSN
	sep := "?"
	if strings.Contains(dsn, "?") {
		sep = "&"
	}
	// Use search_path param supported by pgx5 driver
	tenantDSN := dsn + sep + "search_path=" + slug + ",public&options=-c%20search_path%3D" + slug + "%2Cpublic"

	src, err := iofs.New(publicFS, "migrations/public")
	if err != nil {
		return fmt.Errorf("tenant migrations source: %w", err)
	}

	m, err := migrate.NewWithSourceInstance("iofs", src, normDSN(tenantDSN))
	if err != nil {
		return fmt.Errorf("tenant migrate init: %w", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return fmt.Errorf("tenant migrate up: %w", err)
	}

	return nil
}
