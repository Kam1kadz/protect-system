package middleware

import (
	"github.com/gofiber/fiber/v2"
)

func TenantKey() string { return ctxTenant }
func SchemaKey() string { return ctxSchema }
func ClaimsKey() string { return ctxClaims }

func SuperAdminKey(secret string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		key := c.Get("X-Super-Admin-Key")
		if key == "" || key != secret {
			return c.Status(401).JSON(fiber.Map{"error": "unauthorized"})
		}
		return c.Next()
	}
}
