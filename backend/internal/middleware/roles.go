package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/ps/backend/internal/token"
)

// RequireRoles allows access if the user has ANY of the given roles.
func RequireRoles(roles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		claims, ok := c.Locals(ctxClaims).(*token.Claims)
		if !ok {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden"})
		}
		for _, r := range roles {
			if claims.Role == r {
				return c.Next()
			}
		}
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden"})
	}
}
