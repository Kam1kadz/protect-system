package admin

import (
	"bytes"
	"fmt"
	"io"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ps/backend/config"
	"github.com/ps/backend/internal/crypto"
	"github.com/ps/backend/internal/jarutil"
	"github.com/ps/backend/internal/repo"
	"github.com/ps/backend/internal/storage"
)

type PayloadHandler struct {
	tenants  *repo.TenantRepo
	licenses *repo.LicenseRepo
	store    *storage.MinioClient
	cfg      *config.Config
	db       *pgxpool.Pool
}

func NewPayloadHandler(
	tenants *repo.TenantRepo,
	licenses *repo.LicenseRepo,
	store *storage.MinioClient,
	db *pgxpool.Pool,
	cfg *config.Config,
) *PayloadHandler {
	return &PayloadHandler{
		tenants:  tenants,
		licenses: licenses,
		store:    store,
		cfg:      cfg,
		db:       db,
	}
}

func (h *PayloadHandler) Upload(c *fiber.Ctx) error {
	slug      := c.Params("slug")
	planID    := c.Params("plan_id")
	mcVersion := c.Query("mc_version")

	if mcVersion != "1.16.5" && mcVersion != "1.21.4" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid mc_version"})
	}

	tenant, err := h.tenants.FindBySlug(c.Context(), slug)
	if err != nil || tenant == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "tenant not found"})
	}

	file, err := c.FormFile("jar")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "missing jar file"})
	}

	const maxSize = 200 * 1024 * 1024
	if file.Size > maxSize {
		return c.Status(fiber.StatusRequestEntityTooLarge).JSON(fiber.Map{"error": "jar too large"})
	}

	f, err := file.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal"})
	}
	defer f.Close()

	jarData, err := io.ReadAll(f)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "read failed"})
	}

	manifest, err := jarutil.BuildManifest(jarData)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid jar: " + err.Error()})
	}

	manifestJSON, err := jarutil.MarshalManifest(manifest)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal"})
	}

	jarKey := crypto.DeriveKey(h.cfg.MasterKey, "jar:"+planID)

	var buf bytes.Buffer
	if err := storage.EncodeWithManifest(&buf, bytes.NewReader(jarData), jarKey, manifestJSON); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "encode failed"})
	}

	encoded := buf.Bytes()
	objKey  := storage.PayloadKey(slug, planID, mcVersion)

	if err := h.store.Put(c.Context(), objKey, bytes.NewReader(encoded), int64(len(encoded))); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "storage failed"})
	}

	if err := h.storeIntegrity(c, slug, planID, mcVersion, manifest.ManifestHash); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "integrity store failed"})
	}

	if err := h.updatePlanJarKey(c, slug, planID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "db update failed"})
	}

	return c.JSON(fiber.Map{
		"key":           objKey,
		"size_bytes":    len(encoded),
		"mc_version":    mcVersion,
		"manifest_hash": manifest.ManifestHash,
		"class_count":   len(manifest.Hashes),
	})
}

func (h *PayloadHandler) Check(c *fiber.Ctx) error {
	slug      := c.Params("slug")
	planID    := c.Params("plan_id")
	mcVersion := c.Query("mc_version")

	objKey := storage.PayloadKey(slug, planID, mcVersion)
	return c.JSON(fiber.Map{
		"exists": h.store.Exists(c.Context(), objKey),
		"key":    objKey,
	})
}

func (h *PayloadHandler) Delete(c *fiber.Ctx) error {
	slug      := c.Params("slug")
	planID    := c.Params("plan_id")
	mcVersion := c.Query("mc_version")

	objKey := storage.PayloadKey(slug, planID, mcVersion)
	if err := h.store.Delete(c.Context(), objKey); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "delete failed"})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *PayloadHandler) CreateLicense(c *fiber.Ctx) error {
	slug := c.Params("slug")
	var body struct {
		UserID    string `json:"user_id"`
		PlanID    string `json:"plan_id"`
		TierID    string `json:"tier_id"`
		ExpiresAt string `json:"expires_at"`
	}
	if err := c.BodyParser(&body); err != nil || body.UserID == "" || body.PlanID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "bad request"})
	}

	licKey, err := crypto.RandomHex(16)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal"})
	}
	secretKey, err := crypto.RandomHex(32)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal"})
	}

	expAt, err := time.Parse(time.RFC3339, body.ExpiresAt)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid expires_at"})
	}

	var tierID *string
	if body.TierID != "" {
		tierID = &body.TierID
	}

	lc := &repo.LicenseCreate{
		UserID:     body.UserID,
		PlanID:     body.PlanID,
		TierID:     tierID,
		LicenseKey: licKey,
		SecretKey:  secretKey,
		ExpiresAt:  expAt,
	}

	created, err := h.licenses.Create(c.Context(), slug, lc)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "db error"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"id":          created.ID,
		"license_key": licKey,
		"secret_key":  secretKey,
		"expires_at":  created.ExpiresAt,
	})
}

func (h *PayloadHandler) storeIntegrity(c *fiber.Ctx, slug, planID, mcVersion, manifestHash string) error {
	schema := fmt.Sprintf("tenant_%s", slug)
	q := fmt.Sprintf(
		`INSERT INTO %s.plan_integrity (plan_id, mc_version, manifest_hash)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (plan_id, mc_version) DO UPDATE SET manifest_hash = $3, created_at = NOW()`,
		schema,
	)
	_, err := h.db.Exec(c.Context(), q, planID, mcVersion, manifestHash)
	return err
}

func (h *PayloadHandler) updatePlanJarKey(c *fiber.Ctx, slug, planID string) error {
	schema := fmt.Sprintf("tenant_%s", slug)
	q := fmt.Sprintf(
		`UPDATE %s.subscription_plans SET jar_storage_key = $1, updated_at = NOW() WHERE id = $2`,
		schema,
	)
	_, err := h.db.Exec(c.Context(), q, planID, planID)
	return err
}