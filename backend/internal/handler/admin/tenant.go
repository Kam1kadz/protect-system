package admin

import (
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ps/backend/config"
	"github.com/ps/backend/internal/crypto"
	"github.com/ps/backend/internal/db"
	"github.com/ps/backend/internal/model"
	"github.com/ps/backend/internal/repo"
)

type TenantHandler struct {
	tenants *repo.TenantRepo
	pool    *pgxpool.Pool
	cfg     *config.Config
}

func NewTenantHandler(t *repo.TenantRepo, pool *pgxpool.Pool, cfg *config.Config) *TenantHandler {
	return &TenantHandler{tenants: t, pool: pool, cfg: cfg}
}

func (h *TenantHandler) Create(c *fiber.Ctx) error {
	var body struct {
		Slug        string `json:"slug"`
		DisplayName string `json:"display_name"`
		OwnerEmail  string `json:"owner_email"`
	}
	if err := c.BodyParser(&body); err != nil || body.Slug == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "bad request"})
	}

	rawKey, err := crypto.RandomHex(32)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal"})
	}
	masterDerived := crypto.DeriveKey(h.cfg.MasterKey, "tenant_signing:"+body.Slug)
	encKey, err := crypto.EncryptAESGCM(masterDerived, []byte(rawKey))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal"})
	}

	certPin, err := crypto.RandomHex(16)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal"})
	}

	encKeyHex := crypto.HashSHA256Hex(encKey)

	tenant, err := h.tenants.Create(c.Context(),
		body.Slug, body.DisplayName, body.OwnerEmail,
		encKeyHex, certPin,
	)
	if err != nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "slug taken or db error"})
	}

	if err := db.ProvisionTenant(c.Context(), h.pool, body.Slug); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "provision failed"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"tenant":      tenant,
		"signing_key": rawKey,
	})
}

func (h *TenantHandler) List(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "todo: paginated list"})
}

func (h *TenantHandler) SetStatus(c *fiber.Ctx) error {
	id := c.Params("id")
	var body struct {
		Status string `json:"status"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "bad request"})
	}

	status := model.TenantStatus(body.Status)
	if status != model.TenantActive && status != model.TenantSuspended {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid status"})
	}

	if err := h.tenants.SetStatus(c.Context(), id, status); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal"})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *TenantHandler) Delete(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.tenants.SetStatus(c.Context(), id, model.TenantDeleted); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal"})
	}
	return c.SendStatus(fiber.StatusNoContent)
}