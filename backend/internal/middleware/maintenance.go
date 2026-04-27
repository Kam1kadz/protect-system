package middleware

import (
	"context"
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
)

func MaintenanceGuard(db *pgxpool.Pool) fiber.Handler {
	return func(c *fiber.Ctx) error {
		schema, ok := c.Locals(schemaKey).(string)
		if !ok || schema == "" {
			return c.Next()
		}

		var maintenance bool
		var msg *string
		q := fmt.Sprintf(
			`SELECT maintenance_mode, maintenance_message FROM %s.tenant_config LIMIT 1`,
			schema,
		)
		_ = db.QueryRow(context.Background(), q).Scan(&maintenance, &msg)

		if maintenance {
			message := "Service is under maintenance. Please try again later."
			if msg != nil && *msg != "" {
				message = *msg
			}
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"error":   "maintenance",
				"message": message,
			})
		}
		return c.Next()
	}
}