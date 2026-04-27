package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/ps/backend/internal/token"
)

const ctxClaims = "claims"

func JWTAuth(secret []byte, requiredType string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		raw := ""
		auth := c.Get("Authorization")
		if strings.HasPrefix(auth, "Bearer ") {
			raw = strings.TrimPrefix(auth, "Bearer ")
		}
		if raw == "" {
			raw = c.Cookies("access_token")
		}
		if raw == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing token"})
		}

		claims, err := token.Verify(raw, secret)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
		}
		if requiredType != "" && claims.Type != requiredType {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "wrong token type"})
		}

		c.Locals(ctxClaims, claims)
		return c.Next()
	}
}

func RequireRole(role string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		claims, ok := c.Locals(ctxClaims).(*token.Claims)
		if !ok || claims.Role != role {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden"})
		}
		return c.Next()
	}
}