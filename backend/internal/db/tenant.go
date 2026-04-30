package db

import (
	"context"
	_ "embed"
	"fmt"
	"regexp"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed migrations/tenant/template.up.sql
var tenantTemplateUp string

//go:embed migrations/tenant/template.down.sql
var tenantTemplateDown string

var slugPattern = regexp.MustCompile(`^[a-z0-9_]{1,32}$`)

func ProvisionTenant(ctx context.Context, pool *pgxpool.Pool, slug string) error {
	if !slugPattern.MatchString(slug) {
		return fmt.Errorf("invalid slug: %q", slug)
	}

	schema := schemaName(slug)
	sql := strings.ReplaceAll(tenantTemplateUp, "{{SCHEMA}}", schema)

	if _, err := pool.Exec(ctx, sql); err != nil {
		return fmt.Errorf("provision %s: %w", schema, err)
	}

	return nil
}

func DeprovisionTenant(ctx context.Context, pool *pgxpool.Pool, slug string) error {
	if !slugPattern.MatchString(slug) {
		return fmt.Errorf("invalid slug: %q", slug)
	}

	schema := schemaName(slug)
	sql := strings.ReplaceAll(tenantTemplateDown, "{{SCHEMA}}", schema)

	if _, err := pool.Exec(ctx, sql); err != nil {
		return fmt.Errorf("deprovision %s: %w", schema, err)
	}

	return nil
}

func schemaName(slug string) string {
	return "tenant_" + slug
}