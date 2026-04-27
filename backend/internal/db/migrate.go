package db

import (
	"embed"
	"errors"
	"fmt"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	"github.com/golang-migrate/migrate/v4/source/iofs"
)

//go:embed migrations/public/*.sql
var publicFS embed.FS

func RunPublicMigrations(dsn string) error {
	src, err := iofs.New(publicFS, "migrations/public")
	if err != nil {
		return fmt.Errorf("migrations source: %w", err)
	}

	m, err := migrate.NewWithSourceInstance("iofs", src, "pgx5://"+dsn)
	if err != nil {
		return fmt.Errorf("migrate init: %w", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return fmt.Errorf("migrate up: %w", err)
	}

	return nil
}