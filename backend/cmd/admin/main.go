package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/ps/backend/config"
	"github.com/ps/backend/internal/db"
	"github.com/ps/backend/internal/middleware"
	"github.com/ps/backend/internal/model"
	"github.com/ps/backend/internal/repo"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	pool, err := db.NewPool(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	defer pool.Close()

	tenantRepo := repo.NewTenantRepo(pool)

	app := fiber.New(fiber.Config{
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
	})

	app.Use(recover.New())
	app.Use(middleware.SuperAdminKey(cfg.SuperAdminKey))

	v1 := app.Group("/api/superadmin")

	v1.Get("/tenants", func(c *fiber.Ctx) error {
		tenants, err := tenantRepo.ListAll(c.Context())
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "db error"})
		}
		return c.JSON(fiber.Map{"tenants": tenants})
	})

	v1.Post("/tenants", func(c *fiber.Ctx) error {
		var body struct {
			Slug          string `json:"slug"`
			DisplayName   string `json:"display_name"`
			OwnerEmail    string `json:"owner_email"`
			SigningKeyEnc string `json:"signing_key_enc"`
			CertPin       string `json:"cert_pin"`
		}
		if err := c.BodyParser(&body); err != nil || body.Slug == "" {
			return c.Status(400).JSON(fiber.Map{"error": "bad request"})
		}

		if err := db.ProvisionTenant(c.Context(), pool, body.Slug); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "provision failed: " + err.Error()})
		}

		tenant, err := tenantRepo.Create(c.Context(), body.Slug, body.DisplayName, body.OwnerEmail, body.SigningKeyEnc, body.CertPin)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "create failed: " + err.Error()})
		}
		return c.Status(201).JSON(tenant)
	})

	v1.Delete("/tenants/:slug", func(c *fiber.Ctx) error {
		slug := c.Params("slug")
		if err := db.DeprovisionTenant(c.Context(), pool, slug); err != nil {
			log.Printf("deprovision warn: %v", err)
		}
		if err := tenantRepo.Delete(c.Context(), slug); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "delete failed"})
		}
		return c.SendStatus(204)
	})

	// POST /api/superadmin/tenants/:slug/plans
	v1.Post("/tenants/:slug/plans", func(c *fiber.Ctx) error {
		slug := c.Params("slug")
		schema := "tenant_" + slug

		var body struct {
			Name        string `json:"name"`
			DisplayName string `json:"display_name"`
			SortOrder   int    `json:"sort_order"`
			Tiers       []struct {
				DurationDays int     `json:"duration_days"`
				Price        float64 `json:"price"`
				Currency     string  `json:"currency"`
			} `json:"tiers"`
		}
		if err := c.BodyParser(&body); err != nil || body.Name == "" {
			return c.Status(400).JSON(fiber.Map{"error": "bad request"})
		}

		var planID string
		err := pool.QueryRow(c.Context(), fmt.Sprintf(
			`INSERT INTO %s.subscription_plans (id, name, display_name, sort_order, is_active)
			 VALUES (gen_random_uuid(), $1, $2, $3, true) RETURNING id`, schema),
			body.Name, body.DisplayName, body.SortOrder,
		).Scan(&planID)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "insert plan: " + err.Error()})
		}

		for _, t := range body.Tiers {
			_, err := pool.Exec(c.Context(), fmt.Sprintf(
				`INSERT INTO %s.plan_tiers (id, plan_id, duration_days, price, currency, is_active)
				 VALUES (gen_random_uuid(), $1, $2, $3, $4, true)`, schema),
				planID, t.DurationDays, t.Price, t.Currency,
			)
			if err != nil {
				return c.Status(500).JSON(fiber.Map{"error": "insert tier: " + err.Error()})
			}
		}

		return c.Status(201).JSON(fiber.Map{"plan_id": planID, "tiers": len(body.Tiers)})
	})

	// PATCH /api/superadmin/tenants/:slug/users/:username/role
	v1.Patch("/tenants/:slug/users/:username/role", func(c *fiber.Ctx) error {
		slug := c.Params("slug")
		username := c.Params("username")
		schema := "tenant_" + slug

		var body struct {
			Role string `json:"role"`
		}
		if err := c.BodyParser(&body); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "bad request"})
		}

		role := model.UserRole(body.Role)
		if role != model.RoleUser && role != model.RoleAdmin && role != model.RoleBanned {
			return c.Status(400).JSON(fiber.Map{"error": "invalid role, use: user | admin | banned"})
		}

		var updatedID string
		err := pool.QueryRow(c.Context(), fmt.Sprintf(
			`UPDATE %s.users SET role = $1 WHERE username = $2 RETURNING id`, schema),
			string(role), username,
		).Scan(&updatedID)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "user not found or db error: " + err.Error()})
		}

		return c.JSON(fiber.Map{"id": updatedID, "username": username, "role": role})
	})

	v1.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"ok": true})
	})

	log.Printf("superadmin server on %s", cfg.AdminAddr)
	if err := app.Listen(cfg.AdminAddr); err != nil {
		log.Fatalf("listen: %v", err)
	}
}
