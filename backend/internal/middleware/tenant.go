package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/ps/backend/internal/repo"
)

const ctxTenant = "tenant"
const ctxSchema = "schema"

func TenantResolver(tr *repo.TenantRepo) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tid := c.Get("X-Tenant-ID")
		if tid != "" {
			t, err := tr.FindByID(c.Context(), tid)
			if err != nil || t == nil {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unknown tenant"})
			}
			c.Locals(ctxTenant, t)
			c.Locals(ctxSchema, t.Slug)
			return c.Next()
		}

		host := c.Hostname()
		parts := strings.SplitN(host, ".", 2)

		if len(parts) == 2 {
			t, err := tr.FindBySlug(c.Context(), parts[0])
			if err == nil && t != nil {
				c.Locals(ctxTenant, t)
				c.Locals(ctxSchema, t.Slug)
				return c.Next()
			}
		}

		t, err := tr.FindByDomain(c.Context(), host)
		if err != nil || t == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unknown tenant"})
		}
		c.Locals(ctxTenant, t)
		c.Locals(ctxSchema, t.Slug)
		return c.Next()
	}
}
